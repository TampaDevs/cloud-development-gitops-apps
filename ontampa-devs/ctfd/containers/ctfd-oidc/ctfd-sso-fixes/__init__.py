import json
import os
import re
from authlib.integrations.flask_client import OAuth
from CTFd.plugins import override_template
from CTFd.utils import get_app_config
from .blueprint import load_bp
from .models import OAuthClients

PLUGIN_PATH = os.path.dirname(__file__)
CONFIG = json.load(open("{}/config.json".format(PLUGIN_PATH)))

def oauth_clients():
    return OAuthClients.query.all()


def update_login_template(app):
    """
    Gets the actual login template and injects
    the SSO buttons before the Forms.auth.LoginForm block.
    """
    environment = app.jinja_environment
    original = app.jinja_loader.get_source(environment, 'login.html')[0]
    match = re.search(".*Forms\.auth\.LoginForm.*\n", original)
    if match:
        pos = match.start()
        injecting_file_path = os.path.join(PLUGIN_PATH, 'templates/login_oauth.html')
        with open(injecting_file_path, 'r') as f:
            injecting = f.read()
        new_template = original[:pos] + injecting + original[pos:]
        override_template('login.html', new_template)


def load(app):
    app.db.create_all()
    oauth = OAuth(app)
    app.extensions['ctfd-sso-oauth'] = oauth

    clients = oauth_clients()
    for client in clients:
        client.register(oauth)

    app.jinja_env.globals.update(oauth_clients=oauth_clients)

    # get_app_config reads CTFd's DB config table, not env vars.
    # OAUTH_* keys only exist as env vars so read them with os.environ directly.
    create_buttons = os.environ.get("OAUTH_CREATE_BUTTONS", "")
    if create_buttons in ("true", "True", "1"):
        update_login_template(app)

    bp = load_bp(oauth)
    app.register_blueprint(bp)
