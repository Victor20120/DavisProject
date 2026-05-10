import os
import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Literal
from services.firebase import db
from services.notifications.push import send_push

router = APIRouter()

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
DEV_EMAIL = os.getenv("DEV_EMAIL", "bayobands@gmail.com")


class FamilyNotifyRequest(BaseModel):
    inviter_uid: str
    med_name: str
    status: Literal["taken", "missed", "no_response"]
    display_name: str


class FamilyInviteRequest(BaseModel):
    to_email: str
    to_name: str
    relation: str
    inviter_name: str
    join_link: str


@router.post("/family/invite")
async def send_invite_email(req: FamilyInviteRequest):
    if not RESEND_API_KEY:
        return {"ok": False, "reason": "RESEND_API_KEY not set"}

    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#F5F8FF;border-radius:16px;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:28px;font-weight:700;color:#0C447C;letter-spacing:-1px;">Pal</span>
      </div>
      <div style="background:#fff;border-radius:16px;padding:28px;border:0.5px solid #D6E4F7;">
        <h2 style="color:#0C447C;font-size:20px;margin:0 0 8px;">You've been invited</h2>
        <p style="color:#378ADD;font-size:15px;margin:0 0 20px;">
          <strong>{req.inviter_name}</strong> added you as <strong>{req.relation}</strong> in their Family Loop on Pal.
        </p>
        <p style="color:#64748B;font-size:14px;margin:0 0 24px;">
          As a family member, you'll be able to see when {req.inviter_name} takes their medications and receive alerts if a dose is missed.
        </p>
        <a href="{req.join_link}"
           style="display:block;text-align:center;background:#185FA5;color:#fff;font-weight:700;font-size:16px;padding:14px 24px;border-radius:100px;text-decoration:none;">
          Join Family Loop
        </a>
        <p style="color:#94A3B8;font-size:12px;text-align:center;margin:16px 0 0;">
          Or copy this link: {req.join_link}
        </p>
      </div>
    </div>
    """

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json={
                    "from": "Pal <onboarding@resend.dev>",
                    "to": [DEV_EMAIL],  # resend.dev domain can only deliver to the account owner
                    "subject": f"{req.inviter_name} invited you to their Family Loop",
                    "html": html,
                },
                timeout=10,
            )
        resp.raise_for_status()
        return {"ok": True}
    except Exception as e:
        print(f"[family/invite] email failed: {e}")
        return {"ok": False, "reason": str(e)}


@router.post("/family/notify")
async def family_notify(req: FamilyNotifyRequest):
    if req.status == "taken":
        title = f"{req.display_name} is on track"
        body  = f"{req.display_name} took {req.med_name} on time."
    elif req.status == "missed":
        title = "Missed dose alert"
        body  = f"{req.display_name} did not take {req.med_name} today."
    else:  # no_response
        title = f"Check in on {req.display_name}"
        body  = f"{req.display_name} hasn't responded to their {req.med_name} reminder."

    subs = db.collection("users").document(req.inviter_uid) \
              .collection("familyPush").stream()

    sent = 0
    for doc in subs:
        sub_dict = doc.to_dict()
        try:
            send_push(sub_dict, title, body)
            sent += 1
        except Exception as e:
            print(f"[family/notify] push failed for doc {doc.id}: {e}")

    # Email notification to DEV_EMAIL so demo proves the flow works
    if RESEND_API_KEY:
        from datetime import datetime
        time_str = datetime.now().strftime("%-I:%M %p")
        status_color = {"taken": "#16A34A", "missed": "#DC2626", "no_response": "#D97706"}.get(req.status, "#185FA5")
        status_label = {"taken": "Dose taken", "missed": "Dose missed", "no_response": "No response"}.get(req.status, req.status)
        html = f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#F5F8FF;border-radius:16px;">
          <div style="text-align:center;margin-bottom:24px;">
            <span style="font-size:28px;font-weight:700;color:#0C447C;letter-spacing:-1px;">Pal</span>
          </div>
          <div style="background:#fff;border-radius:16px;padding:28px;border:0.5px solid #D6E4F7;">
            <span style="display:inline-block;background:{status_color}20;color:{status_color};font-size:13px;font-weight:700;padding:4px 12px;border-radius:100px;margin-bottom:12px;">{status_label}</span>
            <h2 style="color:#0C447C;font-size:20px;margin:0 0 8px;">{title}</h2>
            <p style="color:#64748B;font-size:15px;margin:0 0 4px;">{body}</p>
            <p style="color:#94A3B8;font-size:13px;margin:0;">Logged at {time_str}</p>
          </div>
        </div>
        """
        try:
            import httpx as _httpx
            async with _httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "from": "Pal <onboarding@resend.dev>",
                        "to": [DEV_EMAIL],
                        "subject": f"Pal — {title}",
                        "html": html,
                    },
                    timeout=10,
                )
            resp.raise_for_status()
            print(f"[family/notify] email sent to {DEV_EMAIL}")
        except Exception as e:
            print(f"[family/notify] email failed: {e}")

    return {"ok": True, "sent": sent}
