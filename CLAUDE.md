# MediMe — Project Context for Claude Code

## What we're building

MediMe is a medication management app for elderly users. The user opens the app, takes a photo of their pill bottle, and gets a plain-English explanation of what the medication does, potential conflicts with other meds, and refill reminders — all delivered through a personalized cartoon avatar that looks like them and speaks in their cloned voice. A family dashboard lets loved ones see the med log and receive alerts.

MediMe is being built for HackDavis 2026 under the **Health & Wellness** track. A secondary target is the **Google Gemini prize track** (AI-powered app that makes people say WHOA).

**Core design principle:** The avatar is a friendly interface layer, not a companion. It makes the app less intimidating for elderly users — think mascot, not chatbot friend. Every feature should reduce confusion, not add it.

## Current phase: Core scan loop (do not skip ahead)

We are proving the core flow first: camera opens → user takes photo of pill bottle → OCR reads the label → AI returns plain-English explanation → avatar speaks it back. Until this works end-to-end, nothing else matters.

Do not propose or build:
- Voice cloning (comes after core loop works)
- Avatar 3D model generation (comes after core loop works)
- Family dashboard (comes after core loop works)
- Refill/pharmacy integration
- FDA drug conflict checker
- Deployment or hosting beyond local dev

Do propose and help with:
- Camera → OCR pipeline
- AI explanation call (Gemini or Claude API)
- Basic text-to-speech playback (even just device TTS at first)
- Displaying the returned explanation on screen
- Logging real OCR output so we know what shapes we're working with

## Tech stack (locked — do not suggest alternatives)

- **Frontend:** React + TypeScript (Vite) — web app, runs in browser
- **Backend:** Python + FastAPI — REST API, runs on `localhost:8000`
- **Language:** TypeScript (frontend), Python (backend)
- **OCR:** Gemini Vision handles OCR — send image as base64, no separate OCR service needed
- **AI:** Google Gemini API (`gemini-2.0-flash`) — primary choice for HackDavis Gemini prize track
- **Text-to-speech (phase 1):** Browser Web Speech API (`window.speechSynthesis`) — no API key needed, works immediately
- **Voice cloning (phase 2, not yet):** ElevenLabs API
- **Avatar (phase 2, not yet):** Ready Player Me API — photo → 3D avatar
- **Database:** Firebase Firestore — zero setup, real-time, free tier
- **Notifications:** Firebase Cloud Messaging (FCM) for push alerts to family
- **Dev servers:** Vite on `localhost:5173`, Uvicorn on `localhost:8000`

## Important API facts (verified)

- Gemini API endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- Gemini expects a `contents` array with `parts` containing text or inline image data (base64)
- For pill bottle OCR via Gemini: send the image directly as base64 — Gemini Vision can read text off images, which may let us skip a separate OCR service entirely in the prototype
- Firebase `onSnapshot` for real-time family dashboard updates
- ElevenLabs voice clone requires a minimum audio sample — do not attempt during core loop phase
- Ready Player Me selfie-to-avatar: POST to `https://api.readyplayer.me/v2/avatars` with image — requires partner account

## Core scan loop implementation

### Flow

```
User clicks "Scan"
→ browser file input / webcam capture
→ image converted to base64 in frontend
→ POST /scan to FastAPI backend
→ backend calls Gemini Vision with prompt
→ Gemini returns plain-English explanation JSON
→ frontend displays MedCard + Web Speech API reads it aloud
```

### Gemini prompt (use exactly this structure)

```typescript
const prompt = `
You are a medication assistant for elderly users.
The user has photographed their pill bottle label.
Extract the medication name, dosage, and instructions.
Then rewrite the instructions in plain English a non-medical person can understand.
Also flag any common drug interactions if you recognize the medication.

Respond ONLY in this JSON format, no extra text:
{
  "med_name": "string",
  "dosage": "string",
  "plain_english": "string (2-3 sentences max, simple words only)",
  "conflicts": ["string array, empty if none known"],
  "take_with_food": true | false
}
`;
```

### Success criteria for this phase

1. Tapping scan opens the camera
2. Taking a photo of ANY pill bottle returns a Gemini response within 5 seconds
3. The plain-English explanation displays on screen correctly parsed from JSON
4. `expo-speech` reads the explanation aloud
5. Console logs show the raw Gemini response shape for future reference
6. No crashes on bad OCR (graceful fallback message)

## What to capture from the scan phase

Before moving to avatar/voice phase, save sample Gemini responses for at least:
- A common blood pressure med (e.g. Lisinopril)
- A common pain med (e.g. Ibuprofen)
- A hard-to-read label (blurry or small text)
- A bottle with multiple warnings

Save these to `sample-responses.md`. Real responses — not hypothetical ones — will drive the UI copy and error handling design.

## Environment setup

Required `.env` (add to `.gitignore` immediately):
```
GEMINI_API_KEY=...           # from Google AI Studio
FIREBASE_API_KEY=...         # from Firebase console
ELEVENLABS_API_KEY=...       # phase 2 only, leave blank for now
RPM_API_KEY=...              # Ready Player Me, phase 2 only
```

Required installs:
```bash
npx create-expo-app medime --template blank-typescript
cd medime
npx expo install expo-camera expo-image-picker expo-speech
npm install firebase
npm install axios
```

## File structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Home.tsx           # scan button + image upload
│   │   ├── Result.tsx         # explanation display + TTS
│   │   └── Family.tsx         # family dashboard (phase 2)
│   ├── components/
│   │   ├── AvatarView.tsx     # avatar placeholder (phase 2)
│   │   └── MedCard.tsx        # medication explanation card
│   ├── services/
│   │   └── api.ts             # fetch calls to FastAPI backend
│   └── App.tsx
backend/
├── main.py                    # FastAPI app + CORS
├── routes/
│   └── scan.py                # POST /scan endpoint
├── services/
│   ├── gemini.py              # Gemini API call + prompt
│   └── firebase.py            # Firestore helpers
├── requirements.txt
└── .env.example
sample-responses.md            # real Gemini outputs logged here
CLAUDE.md
```

## Team split (2 people)

**Person A — Frontend**
- React pages: Home (scan/upload), Result (display card + TTS)
- `MedCard` component — displays med name, plain English, conflicts
- Web Speech API for TTS (`window.speechSynthesis`)
- `api.ts` — fetch wrapper for `POST /scan`
- Family dashboard UI (phase 2)

**Person B — Backend/APIs**
- `routes/scan.py` — POST /scan endpoint, request/response models
- `services/gemini.py` — Gemini API call, prompt, JSON parsing
- `services/firebase.py` — Firestore schema and helpers
- Error handling for bad OCR or malformed Gemini responses
- ElevenLabs + Ready Player Me stubs (phase 2)

**Shared before splitting:**
Agree on the response JSON shape from Gemini (see prompt above) — Person B produces it, Person A displays it. Do not start building until both people have seen and agreed to this contract.

## Behavior rules for Claude Code in this repo

- **Do not invent Gemini or Firebase API methods.** If a method signature is unclear, check the official docs or installed package types before guessing. Hallucinated API calls are the highest-risk failure mode in a hackathon.
- **Do not add dependencies without asking.** Every new package is setup friction at 3am.
- **Prefer clarity over cleverness.** A 10-line function a tired teammate can debug beats a 3-line pipeline that hides what's happening.
- **When asked for a feature, first say whether it belongs in the current phase.** If it's avatar, voice cloning, family dashboard, or pharmacy integration — say so and push back rather than building it.
- **Guard every Gemini call with a try/catch.** The app must never hard-crash on a bad API response. Always show a friendly fallback to the user.
- **Log everything during the scan phase.** Raw Gemini responses, raw image sizes, parse errors — log it all. We need to understand the shapes before we design around them.
- **Keep the elderly user in mind for every UI decision.** Font size minimum 18px. Buttons minimum 60px tall. No tiny tap targets. Plain words only — never show raw API errors to the user.

## Anti-patterns (do not do these)

- Don't integrate ElevenLabs or Ready Player Me during the core scan phase — those come after the loop is solid
- Don't build the family dashboard before the scan flow is working
- Don't design a database schema before you've seen real Gemini response shapes
- Don't add animations, transitions, or polish before core functionality works
- Don't use markdown or special formatting in text that will be read aloud by expo-speech — it reads asterisks and pound signs literally
- Don't store API keys in source code — always use `.env` and check `.gitignore` before first commit
- Don't switch to a different framework — React + Vite (frontend) and FastAPI (backend) are locked

## Demo script (north star — every feature serves this)

The 2-minute demo at judging will show an elderly user (played by a teammate) opening MediMe, taking a photo of a pill bottle, and hearing the explanation read back in a friendly voice through their personalized avatar. A second screen shows a family member receiving a real-time alert that the medication was logged. A third beat shows the conflict checker flagging a dangerous combination.

Every feature we build should serve a specific beat in that demo. Features that don't appear in the demo get cut, even if they're cool.

## When asking questions

If there's ambiguity in a request, ask one clarifying question rather than building three variants. Hackathon time is finite.