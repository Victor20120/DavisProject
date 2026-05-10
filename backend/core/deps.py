# deps.py — reusable FastAPI dependencies
#
# A FastAPI "dependency" is a function you plug into a route with Depends().
# FastAPI calls it automatically before your route runs and injects the result.
#
# Example usage in a route:
#   @router.post("/chat")
#   async def chat(req: ChatRequest, user_id: str = Depends(get_current_user)):
#       reply = respond(user_id, req.message)  # user_id comes from Firebase token
#
# Right now there's one dependency: get_current_user.
# It reads the Authorization header, verifies the Firebase token, and returns the UID.
#
# NOTE: Routes don't use this yet — user_id is still hardcoded as "dev_user"
# until the frontend adds login. Wire this in during the auth step.

from fastapi import Depends
from core.auth import verify_token


def get_current_user(user_id: str = Depends(verify_token)) -> str:
    """Returns the Firebase UID of the authenticated user.

    Plug this into any route that needs to know who is making the request:
        user_id: str = Depends(get_current_user)

    Raises 401 automatically if the token is missing or invalid.
    """
    # verify_token already validated the token and extracted the UID.
    # This function is a thin wrapper — it exists so routes import from
    # core.deps (not core.auth) and we can add extra logic here later
    # (e.g. load user profile, check if account is active, etc.)
    return user_id
