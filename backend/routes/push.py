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
