import threading, time, json
from datetime import datetime, timedelta
from services.firebase import db
from services.notifications.push import send_push

# Tracks when each (uid, med, time) last fired — keyed to a timestamp.
# Prevents double-firing across minute boundaries.
_fired: dict[str, float] = {}
_COOLDOWN = 90  # seconds — won't re-fire the same reminder within 90 s


def _already_fired(key: str) -> bool:
    last = _fired.get(key)
    return last is not None and (time.time() - last) < _COOLDOWN


def _mark_fired(key: str):
    _fired[key] = time.time()
    # Clean up entries older than 2 minutes so the dict doesn't grow forever
    cutoff = time.time() - 120
    stale = [k for k, t in _fired.items() if t < cutoff]
    for k in stale:
        del _fired[k]


def _tick():
    now       = datetime.now()
    hhmm      = now.strftime("%H:%M")
    prev_hhmm = (now - timedelta(minutes=1)).strftime("%H:%M")
    print(f"[reminder_runner] tick {hhmm}")

    try:
        users = list(db.collection("users").stream())
        if not users:
            print("[reminder_runner] no users in Firestore yet")
            return
        for user_doc in users:
            try:
                _check_user(user_doc.id, hhmm, prev_hhmm)
            except Exception as e:
                print(f"[reminder_runner] error for {user_doc.id}: {e}")
    except Exception as e:
        print(f"[reminder_runner] tick error: {e}")


def _check_user(uid: str, hhmm: str, prev_hhmm: str):
    rem_snap = (
        db.collection("users").document(uid)
          .collection("settings").document("reminders")
          .get()
    )
    if not rem_snap.exists:
        return

    try:
        reminders = json.loads(rem_snap.to_dict().get("data", "{}"))
    except Exception as e:
        print(f"[reminder_runner] {uid}: bad reminders JSON — {e}")
        return

    due = []
    for name, entry in reminders.items():
        if not entry.get("enabled"):
            continue
        for t in entry.get("times", []):
            if t not in (hhmm, prev_hhmm):
                continue
            key = f"{uid}__{name}__{t}"
            if _already_fired(key):
                continue
            due.append((name, entry))
            _mark_fired(key)

    if not due:
        return

    subs = [
        s.to_dict()
        for s in db.collection("users").document(uid)
                   .collection("push_subscriptions").stream()
    ]
    if not subs:
        print(f"[reminder_runner] {uid}: reminder due but no push subscription — visit Settings")
        return

    for name, entry in due:
        title = f"Time to take your {entry.get('commonName', name)}"
        body  = f"{name} · {entry.get('frequency', '')}".strip(" ·")
        for sub in subs:
            send_push(sub, title, body)


def _run():
    while True:
        _tick()
        time.sleep(30)


def start():
    threading.Thread(target=_run, daemon=True).start()
    print("[reminder_runner] started — ticking every 30 s")
