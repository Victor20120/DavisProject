import io
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.tts import speak
from services.stt import transcribe
from services.brain import respond

router = APIRouter(prefix="/voice")


class SpeakRequest(BaseModel):
    text: str


# ── TTS: text → mp3 ───────────────────────────────────────────────────────────

@router.post("/speak")
async def voice_speak(req: SpeakRequest):
    try:
        audio = await speak(req.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return StreamingResponse(
        io.BytesIO(audio),
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=speech.mp3"},
    )


# ── STT + Claude: audio → {transcript, reply} ────────────────────────────────

@router.post("/listen")
async def voice_listen(
    audio:   UploadFile = File(...),
    user_id: str        = Form(...),
):
    try:
        raw        = await audio.read()
        mime       = audio.content_type or "audio/webm"
        transcript = await transcribe(raw, mime)

        if not transcript.strip():
            return {"transcript": "", "reply": "I didn't catch that — could you try again?"}

        reply = await respond(user_id, transcript)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"transcript": transcript, "reply": reply}
