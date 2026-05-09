from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class ScanRequest(BaseModel):
    image_base64: str

@router.post("/scan")
async def scan_pill_bottle(body: ScanRequest):
    raise NotImplementedError
