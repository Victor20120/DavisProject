# The AI friend brain — Step 4: Facts (durable memory)
#
# What changed from Step 3:
#   - We now load "facts" from Firestore at the start of every chat.
#     Facts are stable things the AI should always know: your name, family,
#     preferences, etc. They survive even if the conversation history is cleared.
#   - After every AI reply, we run a quick extraction call to check if the
#     user just shared something new worth remembering. If yes, it gets saved.
#   - The system prompt is now built dynamically — it includes the facts list
#     so the AI always has context about who it's talking to.
#
# Run from the backend/ directory:
#   cd backend
#   python aichat/chat.py

import os
import sys

# Make the services/ package importable from anywhere
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
from anthropic import Anthropic
from services.memory.working_repo import load_turns, save_turns
from services.memory.facts_repo import get_facts, extract_and_update_facts

load_dotenv()

API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not API_KEY:
    raise RuntimeError("ANTHROPIC_API_KEY not found in .env")

client = Anthropic(api_key=API_KEY)

# Hardcoded for now — will come from Firebase Auth in a later step
USER_ID = "dev_user"


def build_system_prompt(facts: list[str]) -> str:
    """Build the system prompt, injecting any known facts about the user.

    The base personality is always there. If we have facts, we append them
    so the AI greets the user by name and references their history naturally.
    """
    base = (
        "You are a warm, patient AI friend. "
        "Speak casually and in simple, plain language. "
        "Never use markdown, bullet points, or headers — plain sentences only. "
        "Be genuinely interested in the person you're talking to."
    )

    if not facts:
        return base

    # Format the facts as a readable list and attach them to the prompt
    facts_block = "\n".join(f"- {f}" for f in facts)
    return (
        f"{base}\n\n"
        f"Here is what you already know about this user — "
        f"use this naturally in conversation, don't recite it back robotically:\n"
        f"{facts_block}"
    )


# ── Startup ────────────────────────────────────────────────────────────────────

# Load conversation history (working memory from Step 3)
conversation = load_turns(USER_ID)

# Load durable facts — these persist even if conversation history is cleared
facts = get_facts(USER_ID)

if conversation:
    print(f"(Resuming — {len(conversation)} turns in memory)\n")
if facts:
    print(f"(Facts loaded: {len(facts)} things I know about you)\n")

print("AI friend is ready. Type 'quit' to exit.\n")

# ── Chat loop ──────────────────────────────────────────────────────────────────

while True:
    you = input("You: ")
    if you.lower() == "quit":
        break

    conversation.append({"role": "user", "content": you})

    # Rebuild the system prompt each turn so newly saved facts are included
    # (Facts change rarely, but this keeps things consistent without extra logic)
    system_prompt = build_system_prompt(facts)

    reply = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        system=system_prompt,
        messages=conversation,
    )

    ai_text = reply.content[0].text
    conversation.append({"role": "assistant", "content": ai_text})

    # Save conversation turns so history survives restarts (Step 3)
    save_turns(USER_ID, conversation)

    # Check if the user revealed any new facts worth saving.
    # This is a small extra Claude call — it prints "[memory] saved X fact(s)"
    # so you can see it working. Remove the print later once it's solid.
    extract_and_update_facts(USER_ID, you, ai_text)

    # Reload facts so the next turn's system prompt reflects anything just saved
    facts = get_facts(USER_ID)

    print(f"AI:  {ai_text}\n")
