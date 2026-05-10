import os, json
from pywebpush import webpush, WebPushException

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_EMAIL       = os.getenv("VAPID_EMAIL", "mailto:admin@pillpal.app")


def send_push(subscription: dict, title: str, body: str) -> None:
    if not VAPID_PRIVATE_KEY:
        print("[push] VAPID_PRIVATE_KEY not set — skipping")
        return
    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps({"title": title, "body": body}),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_EMAIL},
        )
    except WebPushException as e:
        print(f"[push] failed: {e}")
