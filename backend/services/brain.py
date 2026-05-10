# This is the single function everything calls: respond(user_id, message)
# The terminal script calls it. The /chat endpoint calls it. Voice will call it.
# The signature never changes — only the inside grows as we add more features.
#
# What happens inside respond() on every call:
#   1. Load facts       → stable things we know about the user (name, family, etc.)
#   2. Load turns       → the recent conversation history
#   3. Build prompt     → combine personality + facts into the system prompt
#   4. Call Claude      → send the message + history + prompt, get a reply
#   5. Save turns       → store the updated conversation back to Firestore
#   6. Extract facts    → check if the user revealed anything new worth saving
#   7. Return reply     → just the text, the caller decides what to do with it

from dotenv import load_dotenv
from anthropic import Anthropic
from services.memory.working_repo import load_turns, save_turns
from services.memory.facts_repo import get_facts, extract_and_update_facts

load_dotenv()

_client = Anthropic()


def _build_system_prompt(facts: list[str]) -> str:
    base = (
        "You are a warm, patient AI friend. "
        "Speak casually and in simple, plain language. "
        "Never use markdown, bullet points, or headers — plain sentences only. "
        "Be genuinely interested in the person you're talking to."
    )

    if not facts:
        return base

    # If we have facts, append them so the AI knows who it's talking to.
    # "use naturally" means don't recite them like a list — just know them.
    facts_block = "\n".join(f"- {f}" for f in facts)
    return (
        f"{base}\n\n"
        f"Here is what you already know about this user — "
        f"use this naturally in conversation, don't recite it back robotically:\n"
        f"{facts_block}"
    )


def respond(user_id: str, message: str) -> str:
    """Process one message and return the AI's reply.

    This is the only function routes, voice, and scripts need to call.
    Everything else is an implementation detail inside here.
    """

    # Step 1 — load what we know about this user
    facts = get_facts(user_id)

    # Step 2 — load the recent conversation so Claude has context
    turns = load_turns(user_id)

    system_prompt = _build_system_prompt(facts)

    # Step 4 — add the new message and call Claude
    turns.append({"role": "user", "content": message})

    reply = _client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        system=system_prompt,
        messages=turns,
    )

    ai_text = reply.content[0].text

    #5 — save the updated conversation (both the user turn and AI reply)
    turns.append({"role": "assistant", "content": ai_text})
    save_turns(user_id, turns)

    #6 — check if the user revealed any new facts worth saving.
    # This makes a small extra Claude call. 
    extract_and_update_facts(user_id, message, ai_text)

    #return just the text
    return ai_text
