from flask import Blueprint, redirect, request


bp = Blueprint("forms", __name__)


@bp.post("/contact")
def contact_submit():
    name = request.form.get("name")
    email = request.form.get("email")
    phone = request.form.get("phone")
    message = request.form.get("message")
    print("CONTACT:", {"name": name, "email": email, "phone": phone, "message": message})
    return redirect("/contact")


@bp.post("/work")
def work_submit():
    full_name = request.form.get("fullName")
    email = request.form.get("email")
    phone = request.form.get("phone")
    resume = request.form.get("resume")
    skill = request.form.get("skill")
    print("WORK:", {"fullName": full_name, "email": email, "phone": phone, "resume": resume, "skill": skill})
    return redirect("/work")

