import json
from services.firebase import db


def _get(uid: str, collection: str, document: str) -> dict:
    doc = db.collection("users").document(uid).collection(collection).document(document).get()
    return doc.to_dict() if doc.exists else {}


def get_full_profile(user_id: str) -> dict:
    """Merge onboarding profile (profile/data) + simple health settings (profile/health)."""
    full    = _get(user_id, "profile", "data")    # sex, age, weightLbs, conditions, allergies…
    simple  = _get(user_id, "profile", "health")  # gender, weight, weightUnit (Settings page)
    return {**full, **simple}                      # simple fields win on conflict


def get_meds(user_id: str) -> list[dict]:
    docs = db.collection("users").document(user_id).collection("meds").stream()
    return [d.to_dict() for d in docs]


def get_reminders(user_id: str) -> dict:
    doc = db.collection("users").document(user_id).collection("settings").document("reminders").get()
    if not doc.exists:
        return {}
    try:
        return json.loads(doc.to_dict().get("data", "{}"))
    except Exception:
        return {}


def build_user_context(user_id: str) -> str:
    profile   = get_full_profile(user_id)
    meds      = get_meds(user_id)
    reminders = get_reminders(user_id)

    lines: list[str] = []

    # ── Demographics ──────────────────────────────────────────────────────────
    parts = []
    age = profile.get("age")
    if age:
        parts.append(f"{age} years old")

    sex = profile.get("sex") or profile.get("gender")
    if sex:
        parts.append(sex.lower())

    weight    = profile.get("weight") or profile.get("weightLbs")
    weight_unit = profile.get("weightUnit", "lbs")
    if weight:
        parts.append(f"{weight} {weight_unit}")

    if parts:
        lines.append(f"User: {', '.join(parts)}.")

    # ── Conditions & allergies ────────────────────────────────────────────────
    conditions = profile.get("conditions", [])
    if conditions:
        lines.append(f"Medical conditions: {', '.join(conditions)}.")

    allergies = profile.get("allergies", [])
    other     = profile.get("otherAllergies", "")
    all_allergies = allergies + ([other] if other else [])
    if all_allergies:
        lines.append(f"Allergies: {', '.join(all_allergies)}.")

    # ── Current medications ───────────────────────────────────────────────────
    if meds:
        lines.append("Current medications:")
        for med in meds:
            name      = med.get("generic_name", "Unknown")
            dosage    = med.get("dosage", "")
            drug_class = med.get("drug_class", "")
            rem       = reminders.get(name, {})
            times     = rem.get("times", [])
            freq      = rem.get("frequency") or med.get("frequency", "")

            line = f"  - {name} {dosage}".strip()
            if drug_class:
                line += f" ({drug_class})"
            if freq:
                line += f" — {freq}"
            if times and rem.get("enabled"):
                line += f" at {', '.join(times)}"
            lines.append(line)

        conflicts = []
        for med in meds:
            for c in med.get("conflicts", []):
                if c and c not in conflicts:
                    conflicts.append(c)
        if conflicts:
            lines.append(f"Known drug interactions: {'; '.join(conflicts)}.")

    if not lines:
        return ""

    return "\n".join(lines)
