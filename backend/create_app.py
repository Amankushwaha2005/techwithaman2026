import os
import secrets

from authlib.integrations.flask_client import OAuth
from flask import Flask, redirect, session, url_for

from backend.config import BRAND, NAV_ITEMS, PROJECT_ROOT
from backend.routes.pages import bp as pages_bp
from backend.routes.auth import bp as auth_bp
from backend.routes.forms import bp as forms_bp

def create_app():
    app = Flask(__name__)
    # Keep sessions working even when SECRET_KEY is missing in local env.
    app.secret_key = os.getenv("SECRET_KEY") or secrets.token_hex(32)
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    oauth = OAuth(app)
    # Share paths/config with blueprints.
    app.config["PROJECT_ROOT"] = PROJECT_ROOT
    app.config["BRAND"] = BRAND
    app.config["NAV_ITEMS"] = NAV_ITEMS

    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    google = None
    if google_client_id and google_client_secret:
        google = oauth.register(
            name="google",
            client_id=google_client_id,
            client_secret=google_client_secret,
            server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
            client_kwargs={"scope": "openid email profile"},
        )

    # Page GET routes + static proxy from root files.
    app.register_blueprint(pages_bp)

    # POST routes (login/signup/contact/work).
    app.register_blueprint(auth_bp)
    app.register_blueprint(forms_bp)

    @app.get("/health")
    def health():
        return {"ok": True}

    @app.route("/auth/google")
    def login_google():
      if google is None:
          # OAuth is not configured; keep app stable and send user back.
          return redirect("/login")
      redirect_uri = url_for("google_callback", _external=True)
      return google.authorize_redirect(redirect_uri)

    @app.route("/auth/google/callback")
    def google_callback():
      if google is None:
          return redirect("/login")
      token = google.authorize_access_token()
      user = token.get("userinfo")
      session["user"] = user
      print("Google User:", user)
      return redirect("/")


    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000, debug=True)

