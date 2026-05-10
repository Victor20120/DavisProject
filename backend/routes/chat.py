# chat.py — POST /chat endpoint
#
# Receives a message from the client, passes it to the brain, returns the reply.
# This is the only file that knows about HTTP — the brain knows nothing about it.

from fastapi import APIRouter
from pydantic import BaseModel
from services.brain import respond

router = APIRouter()

# What the client sends
class ChatRequest(BaseModel):
    user_id: str
    message: str

# What we send back
class ChatResponse(BaseModel):
    reply: str

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    # call the brain, get text back
    reply = respond(req.user_id, req.message)
    return ChatResponse(reply=reply)
