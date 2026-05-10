import os
import httpx

DEEPGRAM_KEY = os.getenv("DEEPGRAM", "")
TTS_URL      = "https://api.deepgram.com/v1/speak"
TTS_MODEL    = "aura-asteria-en"


async def speak(text: str) -> bytes:
    if not DEEPGRAM_KEY:
        raise RuntimeError("DEEPGRAM key not set in .env")

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            TTS_URL,
            params={"model": TTS_MODEL},
            headers={
                "Authorization": f"Token {DEEPGRAM_KEY}",
                "Content-Type":  "application/json",
            },
            json={"text": text},
        )
    resp.raise_for_status()
    return resp.content
