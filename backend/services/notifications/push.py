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
        print(f"[push] sent: {title}")
    except WebPushException as e:
        status = e.response.status_code if e.response else "no response"
        body_text = e.response.text[:300] if e.response else str(e)
        print(f"[push] WebPushException status={status}: {body_text}")
    except Exception as e:
        print(f"[push] unexpected error: {e}")
