from CTFd.models import db

class OAuthClients(db.Model):
    __tablename__ = "oauth_clients"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text)
    client_id = db.Column(db.Text)
    client_secret = db.Column(db.Text)
    access_token_url = db.Column(db.Text)
    authorize_url = db.Column(db.Text)
    api_base_url = db.Column(db.Text)
    color = db.Column(db.Text)
    icon = db.Column(db.Text)
    # Entitlement claim value that grants CTFd admin role.
    # e.g. "com.tampadevs.admin" — leave blank to disable entitlement mapping.
    admin_entitlement = db.Column(db.Text)

    def register(self, oauth):
        oauth.register(
            name=self.id,
            client_id=self.client_id,
            client_secret=self.client_secret,
            access_token_url=self.access_token_url,
            authorize_url=self.authorize_url,
            api_base_url=self.api_base_url,
            # openid        — base OIDC
            # profile       — preferred_username, name, picture
            # email         — email, email_verified
            # read:user     — tampa.dev user profile
            # developer     — unlocks https://tampa.dev/entitlements claim
            client_kwargs={'scope': 'openid profile email read:user developer'}
        )

    def disconnect(self, oauth):
        oauth._registry[self.id] = None
        oauth._clients[self.id] = None
