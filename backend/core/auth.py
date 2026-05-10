# Firebase ID token verification
#
# How Firebase Auth works in this project:
#   1. The frontend signs the user in via Firebase (Google, email, etc.)
#   2. Firebase gives the frontend a short-lived ID token (a JWT string)
#   3. The frontend sends that token in the Authorization header on every request
#   4. This file verifies that token using the Firebase Admin SDK
#   5. If valid, we extract the user's UID and pass it to the route handler
# never store passwords or create our own tokens — Firebase handles all of that.
# The UID we get back is the same user_id used throughout the app
from fastapi import HTTPException, Header
from firebase_admin import auth

def verify_token(authorization: str = Header(...)) -> str:
    """verifies the Firebase ID token and returns the user's UID.
    Usage in a route:
        @router.post("/chat")
        async def chat(req: ChatRequest, user_id: str = Depends(verify_token)):
            ...
    The frontend must send:
        Authorization: Bearer <firebase_id_token>
    """
    # The header should look like "Bearer <token>" — split off the token part
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header must start with 'Bearer'")

    token = authorization.removeprefix("Bearer ").strip()

    try:
        # Firebase Admin SDK verifies the token signature and expiry
        decoded = auth.verify_id_token(token)
        return decoded["uid"]  # this is the user_id used everywhere else
    except Exception:
        # Don't expose the internal error — just tell the client it's unauthorized
        raise HTTPException(status_code=401, detail="Invalid or expired token")
