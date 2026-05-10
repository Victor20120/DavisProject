import os
import httpx

DEEPGRAM_KEY = os.getenv("DEEPGRAM", "")
STT_URL      = "https://api.deepgram.com/v1/listen"


async def transcribe(audio_bytes: bytes, mime_type: str = "audio/webm") -> str:
    if not DEEPGRAM_KEY:
        raise RuntimeError("DEEPGRAM key not set in .env")

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            STT_URL,
            params={"model": "nova-2", "smart_format": "true", "language": "en"},
            headers={
                "Authorization": f"Token {DEEPGRAM_KEY}",
                "Content-Type":  mime_type,
            },
            content=audio_bytes,
        )
    resp.raise_for_status()

    transcript = resp.json()["results"]["channels"][0]["alternatives"][0]["transcript"]
    print(f"[stt] transcript: {transcript!r}")
    return transcript
