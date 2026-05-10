import json
from anthropic import Anthropic

# Reads ANTHROPIC_API_KEY from environment automatically
_client = Anthropic()

SCAN_PROMPT = """You are a medication assistant for elderly users.
The user has photographed their pill bottle label.
Extract all visible text and identify the medication.

Respond ONLY in this JSON format, no extra text, no markdown backticks:
{
  "common_name": "casual name most people know e.g. Blood Pressure Pill",
  "generic_name": "medical name e.g. Lisinopril",
  "dosage": "e.g. 10mg",
  "form": "e.g. Oral tablet",
  "drug_class": "e.g. ACE Inhibitor",
  "active_ingredient": "e.g. Lisinopril 10mg",
  "common_effects": "e.g. Dizziness, dry cough",
  "manufacturer": "e.g. Lupin Pharma",
  "how_to_take": "plain English rewrite of bottle instructions, 2-3 sentences max, simple words only",
  "frequency": "e.g. Once daily",
  "take_with_food": true,
  "conflicts": ["known interaction warnings as strings, empty array if none"]
}"""


def scan_pill_bottle(base64_image: str, media_type: str = "image/jpeg") -> dict:
    """Send a pill bottle image to Claude Vision and return structured MedData."""
    # Claude only accepts these four types — normalize anything else to jpeg
    valid_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if media_type not in valid_types:
        media_type = "image/jpeg"

    print(f"[Pill Pal] Sending to Claude — media_type={media_type}, base64 length={len(base64_image)}")

    message = _client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": base64_image,
                    },
                },
                {
                    "type": "text",
                    "text": SCAN_PROMPT,
                },
            ],
        }],
    )

    raw = message.content[0].text
    print(f"[Pill Pal] Raw Claude response:\n{raw}")

    # Claude sometimes wraps the JSON in markdown code fences (```json ... ```)
    # even when told not to. Strip them so json.loads() doesn't crash.
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        # Remove the opening fence (```json or just ```) and the closing ```
        cleaned = cleaned.split("\n", 1)[-1]  # drop first line
        cleaned = cleaned.rsplit("```", 1)[0]  # drop closing fence

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        print(f"[Pill Pal] JSON parse failed: {e}\nCleaned text was:\n{cleaned}")
        raise
