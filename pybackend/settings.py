import os


def env_bool(name: str, default: bool = False) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "on")


class Settings:
    def __init__(self) -> None:
        self.node_env = (os.getenv("NODE_ENV") or os.getenv("FLASK_ENV") or "development").strip()
        self.is_production = self.node_env == "production"

        # Render sets RENDER=1 in runtime.
        self.on_render = bool(os.getenv("RENDER"))

        self.secret_key = os.getenv("SESSION_SECRET") or os.getenv("SECRET_KEY") or "dev-secret-change-me"

        self.base_url = (os.getenv("BASE_URL") or "").strip() or None

        # PostgreSQL
        self.database_url = (os.getenv("DATABASE_URL") or "").strip() or None
        self.pgssl = env_bool("PGSSL", default=self.on_render)
        self.db_pool_limit = int(os.getenv("DB_POOL_LIMIT") or "10")

        # Admin
        self.admin_emails = (os.getenv("ADMIN_EMAILS") or "").strip()
        self.admin_bootstrap_secret = (os.getenv("ADMIN_BOOTSTRAP_SECRET") or "").strip() or None

        # reCAPTCHA
        self.recaptcha_site_key = (os.getenv("RECAPTCHA_SITE_KEY") or "").strip() or None
        self.recaptcha_secret_key = (os.getenv("RECAPTCHA_SECRET_KEY") or "").strip() or None

        # OAuth providers
        self.google_client_id = (os.getenv("GOOGLE_CLIENT_ID") or "").strip() or None
        self.google_client_secret = (os.getenv("GOOGLE_CLIENT_SECRET") or "").strip() or None
        self.google_redirect_uri = (os.getenv("GOOGLE_REDIRECT_URI") or "").strip() or None

        self.github_client_id = (os.getenv("GITHUB_CLIENT_ID") or "").strip() or None
        self.github_client_secret = (os.getenv("GITHUB_CLIENT_SECRET") or "").strip() or None
        self.github_redirect_uri = (os.getenv("GITHUB_REDIRECT_URI") or "").strip() or None

        self.microsoft_client_id = (os.getenv("MICROSOFT_CLIENT_ID") or "").strip() or None
        self.microsoft_client_secret = (os.getenv("MICROSOFT_CLIENT_SECRET") or "").strip() or None
        self.microsoft_redirect_uri = (os.getenv("MICROSOFT_REDIRECT_URI") or "").strip() or None

        # Payments
        self.razorpay_key_id = (os.getenv("RAZORPAY_KEY_ID") or "").strip() or None
        self.razorpay_key_secret = (os.getenv("RAZORPAY_KEY_SECRET") or "").strip() or None
        self.razorpay_webhook_secret = (os.getenv("RAZORPAY_WEBHOOK_SECRET") or "").strip() or None
        self.payment_advance_percent = int(os.getenv("PAYMENT_ADVANCE_PERCENT") or "50")

        # OpenAI (optional)
        self.openai_api_key = (os.getenv("OPENAI_API_KEY") or "").strip() or None
        self.openai_api_base = (os.getenv("OPENAI_API_BASE") or "https://api.openai.com/v1").strip()
        self.openai_model = (os.getenv("OPENAI_MODEL") or "gpt-4o-mini").strip()

