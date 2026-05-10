# Facts = stable things the AI should always remember about a user.
# Examples: "User's name is Victor", "User has a sister named Maria", "User likes coffee"
#
# These are stored as a plain list of sentences in Firestore:
#   users/{user_id}/facts/profile → { "facts": ["...", "...", ...] }
#
# TWO things happen with facts:
#   1. READ at the start of every chat → injected into the system prompt so
#      the AI always knows the basics, even after a restart.
#   2. WRITE after each AI reply → we ask Claude to check if the user just
#      revealed a new fact worth saving. If yes, we add it to the list.

import os
from anthropic import Anthropic
from services.firebase import db

# We use the same Claude client the main chat uses, reads ANTHROPIC key.
_client = Anthropic()

# Max facts to store — keeps the list focused and the prompt short.
# If we hit the limit, oldest facts get dropped to make room.
MAX_FACTS = 30

def _doc_ref(user_id: str):
    # All facts for a user live in one document
    return (
        db.collection("users")
        .document(user_id)
        .collection("facts")
        .document("profile")
    )


def get_facts(user_id: str) -> list[str]:
    """Load all saved facts for this user.

    Returns an empty list for new users — not an error.
    """
    doc = _doc_ref(user_id).get()
    if doc.exists:
        return doc.to_dict().get("facts", [])
    return []


def save_facts(user_id: str, facts: list[str]) -> None:
    """Persist the facts list to Firestore.

    Trims to MAX_FACTS by dropping the oldest entries first.
    """
    trimmed = facts[-MAX_FACTS:]
    _doc_ref(user_id).set({"facts": trimmed})


def extract_and_update_facts(user_id: str, user_message: str, ai_reply: str) -> None:
    """Check the latest exchange for new facts worth saving.

    Sends the last user message + AI reply to Claude with a short prompt.
    Claude returns ONLY new facts it found, or the word NONE.
    We then add any new facts to the stored list.

    This is called after every AI reply. It costs a small number of tokens
    (typically under 100) because the prompt is tiny and max_tokens is small.
    """
    existing = get_facts(user_id)

    # Tell Claude exactly what we want — a tight, cheap extraction call.
    # We pass the existing facts so it doesn't repeat things we already know.
    extraction_prompt = f"""You are a fact extractor. Read this conversation exchange and find any NEW personal facts the user revealed about themselves.

Existing facts already saved (do not repeat these):
{chr(10).join(f'- {f}' for f in existing) if existing else '(none yet)'}

Latest exchange:
User: {user_message}
AI: {ai_reply}

Rules:
- Only extract facts about the USER (not the AI).
- Only include things worth remembering long-term: name, family, preferences, hobbies, job, health, important life details.
- Do NOT include things said in passing or things that might change day to day.
- Write each fact as a plain sentence starting with "User".
- If there are no new facts, reply with exactly: NONE

Reply with one fact per line, nothing else."""

    response = _client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=200,  # facts are short — we don't need many tokens here
        messages=[{"role": "user", "content": extraction_prompt}],
    )

    result = response.content[0].text.strip()

    # If Claude found nothing new, we're done
    if result == "NONE" or not result:
        return

    # Parse the new facts (one per line) and add them to the existing list
    new_facts = [line.strip() for line in result.splitlines() if line.strip()]
    updated = existing + new_facts

    save_facts(user_id, updated)
    print(f"[memory] saved {len(new_facts)} new fact(s): {new_facts}")
