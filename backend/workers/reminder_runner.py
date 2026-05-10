import threading, time, json
from datetime import datetime, timedelta
from services.firebase import db
from services.notifications.push import send_push

_fired: dict[str, float] = {}
_COOLDOWN = 90


def _already_fired(key: str) -> bool:
    last = _fired.get(key)
    return last is not None and (time.time() - last) < _COOLDOWN


def _mark_fired(key: str):
    _fired[key] = time.time()
    cutoff = time.time() - 120
    for k in [k for k, t in _fired.items() if t < cutoff]:
        del _fired[k]


def _tick():
    now       = datetime.now()
    hhmm      = now.strftime("%H:%M")
    prev_hhmm = (now - timedelta(minutes=1)).strftime("%H:%M")
    print(f"[runner] tick {hhmm} (also checking {prev_hhmm})")

    try:
        users = list(db.collection("users").stream())
        print(f"[runner] users in Firestore: {len(users)}")
        for user_doc in users:
            try:
                _check_user(user_doc.id, hhmm, prev_hhmm)
            except Exception as e:
                print(f"[runner] error for {user_doc.id}: {e}")
    except Exception as e:
        print(f"[runner] tick error: {e}")


def _check_user(uid: str, hhmm: str, prev_hhmm: str):
    rem_snap = (
        db.collection("users").document(uid)
          .collection("settings").document("reminders")
          .get()
    )
    if not rem_snap.exists:
        print(f"[runner] {uid[:8]}: no reminders saved yet")
        return

    try:
        reminders = json.loads(rem_snap.to_dict().get("data", "{}"))
    except Exception as e:
        print(f"[runner] {uid[:8]}: bad JSON — {e}")
        return

    print(f"[runner] {uid[:8]}: reminders = {list(reminders.keys())}")

    due = []
    for name, entry in reminders.items():
        enabled = entry.get("enabled")
        times   = entry.get("times", [])
        print(f"[runner]   {name}: enabled={enabled} times={times}")
        if not enabled:
            continue
        for t in times:
            key = f"{uid}__{name}__{t}"
            match = t in (hhmm, prev_hhmm)
            fired = _already_fired(key)
            print(f"[runner]     time={t} match={match} already_fired={fired}")
            if match and not fired:
                due.append((name, entry))
                _mark_fired(key)

    if not due:
        print(f"[runner] {uid[:8]}: nothing due")
        return

    subs = [
        s.to_dict()
        for s in db.collection("users").document(uid)
                   .collection("push_subscriptions").stream()
    ]
    print(f"[runner] {uid[:8]}: {len(due)} due, {len(subs)} subscriptions")

    if not subs:
        print(f"[runner] {uid[:8]}: NO push subscription — visit Settings")
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
    print("[runner] started — ticking every 30 s")
