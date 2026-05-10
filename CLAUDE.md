# Pill Pal — Project Context for Claude Code

## What we're building

Pill Pal is a responsive web app that helps elderly users manage their medications. The user scans a pill bottle, gets a clean "pill card" with plain-English information about the medication, sees if any of their meds conflict with each other, gets browser and email reminders to take their meds, and can share a family dashboard so loved ones can see if doses were taken or missed.

Pill Pal is being built for HackDavis 2026 under the **Health & Wellness** track.

**Core design principle:** Clean, minimal, blue and white. No clutter. Every screen has one primary action. Font sizes are large, buttons are big — this is built for elderly users. No personalized greeting on the home screen. No avatar. No voice.

**No decorative emojis in UI components.** Never use emoji icons (🍷🚬🥗💊⚠️🌅🌙 etc.) as UI elements — they render inconsistently across devices and break the clean clinical aesthetic. Use SVG icons matching the #0C447C / #378ADD palette instead. The only acceptable emoji use is inside user-generated text content (e.g. a user typing in a notes field).

## Branding

- **App name:** Pal
- **Logo:** Two-tone pill icon (top half #0C447C, bottom half #378ADD) + bold "Pal" text in #0C447C, 
  font Plus Jakarta Sans 700, letter-spacing -1.5px
- **Tagline:** "Your medication, simplified."
- Do not use "MediMe" or "PillPal" anywhere in the codebase

## Feature set (locked — build only these 5 features)

1. **Pill bottle scanner** — camera/file upload opens, user points at label, Claude Vision reads it
2. **Pill card** — displays common name (big), generic name (small), drug class, active ingredient, common side effects, and plain-English bottle instructions. No personalized section.
3. **Medication conflict checker** — when user has 2+ meds scanned, Claude checks for dangerous interactions and flags them clearly
4. **Family loop dashboard** — family members see real-time med log, get alerts if a dose is missed
5. **Reminders** — browser push notifications + email reminders scheduled per medication

Do not build:
- Avatar or voice features
- Pharmacy/refill integration
- Personalized AI tips (save for v2)
- Medication history log
- Any feature not in the list above

## Current phase: Backend integration

**Frontend UI is complete.** All pages (Home, PillCardPage, Medications, Family, Settings) are built with mock data. The backend team is now wiring up real API calls.

Do propose and help with:
- Replacing mock data with real Claude API responses in `claude.ts`
- Firestore schema design (only after seeing real Claude response shapes)
- Wiring `services/api.ts` → `localhost:8000/scan` → pill card display
- Browser Notification API permission flow
- Resend email integration in `reminders.ts`

Do not add:
- New UI pages or components not already in the file structure
- Any feature outside the locked feature set
- Deployment config (defer until demo is working locally)

## Tech stack (locked — do not suggest alternatives)

- **Framework:** React + Vite — responsive web app, not React Native
- **Language:** TypeScript throughout
- **Styling:** Tailwind CSS — blue and white design system
- **Camera:** Browser `getUserMedia` API or `<input type="file" accept="image/*" capture="environment">` for mobile
- **AI:** Claude API (`claude-sonnet-4-6`) — handles both OCR and explanation in one call
- **Database:** Firebase Firestore — real-time, free tier, zero setup
- **Auth:** Firebase Auth — simple email/password for user profiles
- **Reminders:** Browser Notification API (push) + Resend (email)
- **Family alerts:** Firebase Firestore `onSnapshot` for real-time dashboard updates
- **Runtime:** Vite dev server

## Design system (locked)

- **Colors:** Navy `#0C447C` headers/nav, `#185FA5` buttons, `#378ADD` accents, `#F5F8FF` page background, `#fff` cards
- **Font:** Plus Jakarta Sans (Google Fonts)
- **Cards:** white bg, `border-radius: 20px`, `border: 0.5px solid #D6E4F7`
- **Primary buttons:** min height 52px, `border-radius: 100px`
- **Font sizes:** min 16px body, 20px+ for names, 14px for labels — never go below 14px
- **No greeting on home screen** — Pill Pal logo centered at top, nothing else in the header
- **Bottom nav on mobile:** Home, Medications, Family, Settings icons with active pip indicator
- **Sidebar on desktop:** same four nav items in a left sidebar

## Pill card structure (exact order, do not change)

```
[ pill icon ]  COMMON NAME (big, bold, 20px+)
               Generic name · dosage · form (small, muted)

[ tags: Safe / conflict warning / frequency ]

--- About this medication ---
Drug class        | value
Active ingredient | value
Common effects    | value
Manufacturer      | value

--- How to take it ---
[ box ] Plain-English rewrite of the bottle instructions

[ Save card btn ]  [ Set reminder btn ]
```

No personalized section. No "based on your profile" copy. Base information only.

## Claude prompt (use exactly this structure)

```typescript
const prompt = `
You are a medication assistant for elderly users.
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
}
`;
```

## Conflict checker prompt

```typescript
const conflictPrompt = `
You are a pharmacist checking for drug interactions.
The user is taking these medications: ${medList}.
Check for any dangerous interactions between them.

Respond ONLY in this JSON format, no extra text, no markdown backticks:
{
  "has_conflict": true,
  "conflicts": [
    {
      "drug_a": "string",
      "drug_b": "string",
      "severity": "mild | moderate | severe",
      "description": "plain English explanation, 1-2 sentences"
    }
  ]
}
`;
```

## Reminders implementation

- Use the browser `Notification` API for push reminders — request permission on first scan
- Schedule reminders using `setTimeout` or `setInterval` keyed to the user's chosen time
- Send a daily email via Resend API as a backup for when the browser is closed
- Reminder time is set by the user from the pill card screen after scanning
- Store reminder schedules in Firestore so they persist across sessions

## Success criteria for scan phase

1. Clicking scan opens camera or file picker
2. Capturing a pill bottle photo returns a Claude response within 5 seconds
3. Pill card renders correctly with all fields from the JSON contract
4. Graceful fallback message shown if Claude fails or label is unreadable
5. Raw Claude response logged to console on every call

## What to capture from the scan phase

Before moving to conflict checker or family dashboard, save sample Claude responses to `sample-responses.md` for:
- A common blood pressure med (e.g. Lisinopril)
- A common pain med (e.g. Ibuprofen)
- A hard-to-read label
- A bottle with multiple warnings

Real response shapes drive error handling design. Do not skip this step.

## Environment setup

Required `.env` inside `frontend/` (already in `.gitignore` — never commit):
```
VITE_ANTHROPIC_API_KEY=...     # from console.anthropic.com
VITE_FIREBASE_API_KEY=...      # from Firebase console
VITE_RESEND_API_KEY=...        # from resend.com for email reminders
```

To run the frontend:
```bash
cd frontend
npm install
npm run dev     # http://localhost:5173
npm run build   # type-check + production build
```

**Tailwind v4 — critical gotcha:** This project uses Tailwind CSS v4. Do NOT run `npx tailwindcss init -p` — it fails in v4 and is not needed. The setup is:
- Vite plugin: `@tailwindcss/vite` in `vite.config.ts`
- CSS entry: `@import "tailwindcss";` + `@theme { }` block in `index.css`
- No `tailwind.config.js` file exists or is needed

## File structure

The Vite project root is `frontend/` — all npm commands must be run from there.

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Home.tsx            # logo + scan button + recent meds grid
│   │   ├── PillCardPage.tsx    # full pill card — tappable 3D flip to show personal info
│   │   ├── Medications.tsx     # Apple Wallet card stack + conflict alert
│   │   ├── Family.tsx          # family loop dashboard
│   │   └── Settings.tsx        # reminders + notifications + family loop
│   ├── components/
│   │   ├── PillCard.tsx        # pill card UI (front face)
│   │   ├── ConflictAlert.tsx   # severity-banded conflict warning
│   │   ├── BottomNav.tsx       # mobile bottom nav (lg:hidden)
│   │   ├── Sidebar.tsx         # desktop sidebar (hidden lg:flex, 240px)
│   │   └── ScanButton.tsx      # camera/file trigger with base64 conversion
│   ├── services/
│   │   ├── api.ts              # REST client → POST localhost:8000/scan (backend owns)
│   │   ├── claude.ts           # Claude API stub (backend fills in)
│   │   ├── firebase.ts         # Firestore + Auth stub (backend fills in)
│   │   └── reminders.ts        # notifications + Resend stub (backend fills in)
│   ├── types.ts                # MedData, ConflictResult, ScannedMed, FamilyMember
│   ├── App.tsx                 # BrowserRouter + Sidebar + BottomNav + Routes
│   └── main.tsx
├── sample-responses.md         # real Claude outputs logged here
├── .env                        # VITE_ prefixed keys — never commit
├── .gitignore
└── CLAUDE.md
```

## Medications page — interaction model

The stack uses an Apple Wallet layout. Do not change this without designer sign-off.

**Collapsed state:**
- Back cards sit at the **top** of the stack (small y, low z-index), showing only their colored header strip (medication name visible)
- Front card sits at the **bottom** (large y, high z-index), fully visible
- z-index formula: `n - index` where index 0 = front card

**Selected state (card tapped):**
- Tapped card animates to `y=0`, expands to `EXPANDED_H` (360px)
- Other cards queue below in the same Apple Wallet style
- Tapping the expanded card flips it (3D `rotateY`) to show the personal info back face
- Tapping again flips back; ✕ button collapses

**PillCardPage flip:**
- Uses a `scaleX` squish-swap approach (not `rotateY`) because the card height is variable
- Tap card → squishes to `scaleX(0)` → content swaps → expands back
- Back face shows: My Schedule, Tailored Advice (placeholder), Personal Notes

## Backend integration contract

The frontend calls `POST localhost:8000/scan` via `services/api.ts`. The backend must return **exactly** the `MedData` shape from `src/types.ts`:

```typescript
interface MedData {
  common_name: string;       // "Blood Pressure Pill"
  generic_name: string;      // "Lisinopril"
  dosage: string;            // "10mg"
  form: string;              // "Oral tablet"
  drug_class: string;        // "ACE Inhibitor"
  active_ingredient: string; // "Lisinopril 10mg"
  common_effects: string;    // "Dizziness, dry cough"
  manufacturer: string;      // "Lupin Pharma"
  how_to_take: string;       // plain-English, 2-3 sentences
  frequency: string;         // "Once daily"
  take_with_food: boolean;
  conflicts: string[];       // [] if none
}
```

Field name mismatches will silently blank out the pill card — verify with a real Claude response before merging. Log every raw Claude response to the console during development.

## Team split (2 people)

**Person A — Frontend**
- All page layouts and components in React + Tailwind
- PillCard UI (exact structure above, no personalized section)
- BottomNav + Sidebar components
- Family dashboard UI
- Responsive layout — mobile single column, tablet 2-col grid, desktop 3-col with sidebar

**Person B — Backend/APIs**
- `claude.ts` — scan prompt, conflict prompt, JSON parsing, error handling
- `firebase.ts` — Firestore schema + helpers, Auth setup
- `reminders.ts` — browser Notification API + Resend email scheduling
- Firestore real-time listeners for family dashboard

**Shared before splitting:**
Both agree on the Claude JSON response shape before writing any code. Person B produces it, Person A consumes it. This contract is the only dependency between the two sides.

## Behavior rules for Claude Code in this repo

- **Do not invent Claude or Firebase API methods.** If a method signature is unclear, check the installed package types or official docs. Hallucinated APIs are the highest-risk failure mode.
- **Do not add dependencies without asking.** Every new package is setup friction at 3am.
- **Prefer clarity over cleverness.** A 10-line function a tired teammate can debug beats a 3-line pipeline that hides what's happening.
- **When asked for a feature, first say whether it belongs in the current phase.** Push back on out-of-phase requests rather than building them.
- **Guard every Claude API call with a try/catch.** Never hard-crash. Always show a friendly fallback message.
- **Log raw Claude responses to console during development.**
- **Enforce the design system.** Never use colors outside the locked palette. Never go below 14px font size. Never add a greeting to the home screen.

## Anti-patterns (do not do these)

- Don't add avatar, voice, or TTS — fully cut for this hackathon
- Don't add a personalized section to the pill card
- Don't add a "Good morning, [name]" greeting on the home screen
- Don't build family dashboard or conflict checker before scan loop works
- Don't design a Firestore schema before seeing real Claude response shapes
- Don't store API keys in source — always `.env` with `VITE_` prefix
- Don't use React Native — this is a Vite web app

## Demo script (north star — every feature serves this)

The 2-minute demo: elderly user opens Pill Pal → scans a pill bottle → pill card appears with clear info → scans a second pill → conflict checker flags a dangerous interaction → family member on another screen sees the med log update live → reminder notification fires on schedule.

Every feature built should appear in this demo. Features that don't appear get cut.

## When asking questions

If there's ambiguity in a request, ask one clarifying question rather than building three variants. Hackathon time is finite.