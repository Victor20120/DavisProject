import threading, time, json
from datetime import datetime
from services.firebase import db
from services.notifications.push import send_push


def _tick():
    hhmm = datetime.now().strftime("%H:%M")
    try:
        for user_doc in db.collection("users").stream():
            _check_user(user_doc.id, hhmm)
    except Exception as e:
        print(f"[reminder_runner] tick error: {e}")


def _check_user(uid: str, hhmm: str):
    rem_snap = (
        db.collection("users").document(uid)
          .collection("settings").document("reminders")
          .get()
    )
    if not rem_snap.exists:
        return

    try:
        reminders = json.loads(rem_snap.to_dict().get("data", "{}"))
    except Exception:
        return

    due = [
        (name, entry)
        for name, entry in reminders.items()
        if entry.get("enabled") and hhmm in entry.get("times", [])
    ]
    if not due:
        return

    subs = [
        s.to_dict()
        for s in db.collection("users").document(uid)
                   .collection("push_subscriptions").stream()
    ]
    if not subs:
        return

    for name, entry in due:
        title = f"Time to take your {entry.get('commonName', name)}"
        body  = f"{name} · {entry.get('frequency', '')}".strip(" ·")
        for sub in subs:
            send_push(sub, title, body)
        print(f"[reminder_runner] pushed '{title}' to {uid}")


def _run():
    while True:
        _tick()
        time.sleep(60)


def start():
    threading.Thread(target=_run, daemon=True).start()
    print("[reminder_runner] started — ticking every 60 s")
