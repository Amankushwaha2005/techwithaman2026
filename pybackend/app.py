import os
from pathlib import Path

from authlib.integrations.flask_client import OAuth
from flask import Flask, jsonify, redirect

from pybackend.settings import Settings
from pybackend.db import close_pool
from pybackend.migrations import init_db
from pybackend.pages import pages_bp
from pybackend.auth import auth_bp
from pybackend.forms import forms_bp
from pybackend.payments import payments_bp
from pybackend.admin import admin_bp


def create_app() -> Flask:
    settings = Settings()

    # Local dev convenience: load .env if present.
    if not os.getenv("RENDER"):
        try:
            from dotenv import load_dotenv

            load_dotenv()
            settings = Settings()
        except Exception:
            pass

    project_root = Path(__file__).resolve().parents[1]
    templates_dir = project_root / "templates"

    app = Flask(
        __name__,
        template_folder=str(templates_dir),
        static_folder=str(project_root),
        static_url_path="",
    )

    app.config["SECRET_KEY"] = settings.secret_key
    app.config["PROJECT_ROOT"] = str(project_root)
    app.config["SETTINGS"] = settings

    # Ensure PostgreSQL schema exists on boot (same behavior as legacy Node backend).
    init_db()

    oauth = OAuth(app)
    app.extensions["oauth"] = oauth

    if settings.is_production:
        # Render/Proxy setups need this for correct scheme/host in redirects.
        app.config["PREFERRED_URL_SCHEME"] = "https"

    @app.get("/health")
    def health():
        return jsonify({"ok": True})

    app.register_blueprint(pages_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(forms_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(admin_bp)

    @app.teardown_appcontext
    def _teardown(_exc):
        # Keep connections healthy on reloads.
        if os.getenv("FLASK_DEBUG") == "1":
            close_pool()

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT") or "3000")
    app.run(host="0.0.0.0", port=port, debug=True)

