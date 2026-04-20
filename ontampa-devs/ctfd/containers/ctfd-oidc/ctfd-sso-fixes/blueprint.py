import os
from flask import Blueprint, current_app, redirect, render_template, request, url_for
from wtforms import StringField
from wtforms.validators import InputRequired

from CTFd.cache import clear_user_session
from CTFd.forms import BaseForm
from CTFd.forms.fields import SubmitField
from CTFd.models import Users, db
from CTFd.utils import get_app_config
from CTFd.utils.config.visibility import registration_visible
from CTFd.utils.decorators import admins_only
from CTFd.utils.helpers import error_for
from CTFd.utils.logging import log
from CTFd.utils.security.auth import login_user

from .models import OAuthClients

plugin_bp = Blueprint('sso', __name__, template_folder='templates', static_folder='static', static_url_path='/static/sso')


class OAuthForm(BaseForm):
    name = StringField("Client name", validators=[InputRequired()])
    client_id = StringField("OAuth client id", validators=[InputRequired()])
    client_secret = StringField("OAuth client secret", validators=[InputRequired()])
    access_token_url = StringField("Access token url", validators=[InputRequired()])
    authorize_url = StringField("Authorization url", validators=[InputRequired()])
    api_base_url = StringField("User info url", validators=[InputRequired()])
    icon = StringField("Login button image URL")
    admin_entitlement = StringField("Admin entitlement claim")
    submit = SubmitField("Save")


def get_oauth():
    """Retrieve the OAuth instance stored on the app at load() time."""
    return current_app.extensions['ctfd-sso-oauth']


def get_or_register_client(db_client):
    """
    Return an authlib client for db_client.

    gunicorn pre-forks workers — each has its own memory space and its own
    copy of the OAuth registry. Rather than fighting per-worker state, we
    create a fresh per-request OAuth instance bound to the current app.
    This is cheap (no network calls) and completely reliable.
    """
    from authlib.integrations.flask_client import OAuth as _OAuth
    oauth = _OAuth(current_app._get_current_object())
    db_client.register(oauth)
    return oauth.create_client(db_client.id)


def load_bp(oauth):
    # Store oauth on the app so requests can always reach the current instance
    # regardless of when clients were added (fixes NoneType on create_client).
    # We defer the actual attach to when the app context is available.
    oauth._app = oauth.app  # keep reference; attached in __init__.load()

    @plugin_bp.route('/admin/sso')
    @admins_only
    def sso_list():
        return render_template('list.html')

    @plugin_bp.route('/admin/sso/client/<int:client_id>', methods=['GET', 'DELETE'])
    @admins_only
    def sso_details(client_id):
        if request.method == 'DELETE':
            client = OAuthClients.query.filter_by(id=client_id).first()
            if client:
                client.disconnect(get_oauth())
                db.session.delete(client)
                db.session.commit()
                db.session.flush()
        return redirect(url_for('sso.sso_list'))

    @plugin_bp.route('/admin/sso/create', methods=['GET', 'POST'])
    @admins_only
    def sso_create():
        if request.method == "POST":
            name = request.form["name"]
            client_id = request.form["client_id"]
            client_secret = request.form["client_secret"]
            access_token_url = request.form["access_token_url"]
            authorize_url = request.form["authorize_url"]
            api_base_url = request.form["api_base_url"]

            icon = request.form.get("icon", "")
            admin_entitlement = request.form.get("admin_entitlement", "")
            client = OAuthClients(
                name=name,
                client_id=client_id,
                client_secret=client_secret,
                access_token_url=access_token_url,
                authorize_url=authorize_url,
                api_base_url=api_base_url,
                icon=icon or None,
                admin_entitlement=admin_entitlement or None,
            )
            db.session.add(client)
            db.session.commit()
            db.session.flush()

            # Register against the live oauth instance on the app
            client.register(get_oauth())

            return redirect(url_for('sso.sso_list'))

        form = OAuthForm()
        return render_template('create.html', form=form)


    @plugin_bp.route('/admin/sso/client/<int:client_id>/edit', methods=['GET', 'POST'])
    @admins_only
    def sso_edit(client_id):
        client = OAuthClients.query.filter_by(id=client_id).first_or_404()
        if request.method == "POST":
            client.name = request.form["name"]
            client.client_id = request.form["client_id"]
            client.client_secret = request.form["client_secret"]
            client.access_token_url = request.form["access_token_url"]
            client.authorize_url = request.form["authorize_url"]
            client.api_base_url = request.form["api_base_url"]
            client.icon = request.form.get("icon") or None
            client.admin_entitlement = request.form.get("admin_entitlement") or None
            db.session.commit()
            # Re-register with updated credentials
            client.disconnect(get_oauth())
            client.register(get_oauth())
            return redirect(url_for('sso.sso_list'))
        form = OAuthForm(obj=client)
        return render_template('edit.html', form=form, client=client)

    @plugin_bp.route("/sso/login/<string:client_name>", methods=['GET'])
    def sso_oauth(client_name):
        db_client = OAuthClients.query.filter_by(name=client_name).first_or_404()
        client = get_or_register_client(db_client)
        redirect_uri = url_for('sso.sso_redirect', client_name=client_name, _external=True, _scheme='https')
        return client.authorize_redirect(redirect_uri)

    @plugin_bp.route("/sso/redirect/<string:client_name>", methods=['GET'])
    def sso_redirect(client_name):
        db_client = OAuthClients.query.filter_by(name=client_name).first_or_404()
        client = get_or_register_client(db_client)
        client.authorize_access_token()
        api_data = client.get('').json()

        user_name = api_data["preferred_username"]
        user_email = api_data["email"]

        # ── Entitlement-based role mapping ────────────────────────────────────
        # Entitlements can appear under multiple claim keys depending on the IdP.
        # We check both the namespaced tampa.dev key and a generic "entitlements"
        # key so this works with any OIDC provider.
        raw_entitlements = (
            api_data.get("https://tampa.dev/entitlements")
            or api_data.get("entitlements")
            or []
        )
        if isinstance(raw_entitlements, str):
            raw_entitlements = [raw_entitlements]

        desired_role = "user"
        if db_client.admin_entitlement and db_client.admin_entitlement in raw_entitlements:
            desired_role = "admin"

        user = Users.query.filter_by(email=user_email).first()
        if user is None:
            # get_app_config reads the DB, not env vars — use os.environ directly
            always_possible = os.environ.get("OAUTH_ALWAYS_POSSIBLE", "")
            allow = always_possible in ("true", "True", "1") or registration_visible()
            if allow:
                user = Users(
                    name=user_name,
                    email=user_email,
                    verified=True,
                    type=desired_role,
                )
                db.session.add(user)
                db.session.commit()
            else:
                log("logins", "[{date}] {ip} - Public registration via SSO blocked")
                error_for(
                    endpoint="auth.login",
                    message="Public registration is disabled. Please try again later.",
                )
                return redirect(url_for("auth.login"))

        user.verified = True

        # Update role on every login so entitlement changes take effect
        # immediately without manual intervention in the CTFd admin panel.
        if user.type != desired_role:
            user.type = desired_role
            db.session.commit()
            clear_user_session(user_id=user.id)
            # Reload user after session clear
            user = Users.query.filter_by(email=user_email).first()

        db.session.commit()
        login_user(user)
        return redirect(url_for("challenges.listing"))

    return plugin_bp
