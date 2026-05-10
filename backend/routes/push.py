from fastapi import APIRouter
from pydantic import BaseModel
from services.firebase import db

router = APIRouter()


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscription(BaseModel):
    endpoint: str
    expirationTime: float | None = None
    keys: PushKeys


class SubscribeRequest(BaseModel):
    user_id: str
    subscription: PushSubscription


@router.post("/push/subscribe")
async def subscribe(req: SubscribeRequest):
    db.collection("users").document(req.user_id) \
      .collection("push_subscriptions").document("main") \
      .set(req.subscription.model_dump())
    return {"ok": True}


@router.get("/push/test/{user_id}")
async def test_push(user_id: str):
    from services.notifications.push import send_push
    subs = [
        s.to_dict()
        for s in db.collection("users").document(user_id)
                   .collection("push_subscriptions").stream()
    ]
    if not subs:
        return {"ok": False, "reason": "no subscription found — visit Settings page first"}
    for sub in subs:
        send_push(sub, "Test from Pal 💊", "Notifications are working!")
    return {"ok": True, "sent_to": len(subs)}
