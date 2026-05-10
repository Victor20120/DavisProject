from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.claude import scan_pill_bottle

router = APIRouter()


class ScanRequest(BaseModel):
    image_base64: str
    media_type: str = "image/jpeg"


@router.post("/scan")
async def scan_pill_bottle_route(body: ScanRequest):
    try:
        result = scan_pill_bottle(body.image_base64, body.media_type)
        return result
    except Exception as e:
        import traceback
        print(f"[Pill Pal] Scan failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail="Could not read the label. Please try again in better lighting.",
        )
