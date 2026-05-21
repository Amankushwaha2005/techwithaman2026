from pathlib import Path

from flask import Blueprint, abort, current_app, send_file

from backend.config import BRAND, NAV_ITEMS


bp = Blueprint("pages", __name__)


def _send_static_html(project_root: Path, filename: str):
    file_path = (project_root / filename).resolve()
    if not file_path.is_file():
        abort(404)
    return send_file(str(file_path))


@bp.route("/", methods=["GET"])
def home():
    return _send_static_html(current_app.config["PROJECT_ROOT"], "index.html")


@bp.route("/pricing", methods=["GET"])
def pricing():
    return _send_static_html(current_app.config["PROJECT_ROOT"], "pricing.html")


@bp.route("/services", methods=["GET"])
def services():
    return _send_static_html(current_app.config["PROJECT_ROOT"], "services.html")


@bp.route("/portfolio", methods=["GET"])
def portfolio():
    return _send_static_html(current_app.config["PROJECT_ROOT"], "portfolio.html")


@bp.route("/about", methods=["GET"])
def about():
    return _send_static_html(current_app.config["PROJECT_ROOT"], "about.html")


@bp.route("/contact", methods=["GET"])
def contact():
    return _send_static_html(current_app.config["PROJECT_ROOT"], "contact.html")


@bp.route("/login", methods=["GET"])
def login():
    return _send_static_html(current_app.config["PROJECT_ROOT"], "login.html")


@bp.route("/signup", methods=["GET"])
def signup():
    return _send_static_html(current_app.config["PROJECT_ROOT"], "signup.html")


@bp.route("/work", methods=["GET"])
def work():
    return _send_static_html(current_app.config["PROJECT_ROOT"], "work.html")


@bp.route("/<path:filename>", methods=["GET"])
def files_proxy(filename: str):
    # Serve any root file (style.css, main.js, .html pages, etc.)
    project_root: Path = current_app.config["PROJECT_ROOT"]
    file_path = (project_root / filename).resolve()

    # Security: prevent path traversal.
    if project_root not in file_path.parents and file_path != project_root:
        abort(404)

    if file_path.is_file():
        return send_file(str(file_path))

    abort(404)

