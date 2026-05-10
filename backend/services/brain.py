import asyncio
from anthropic import AsyncAnthropic
from services.memory.working_repo import load_turns, save_turns
from services.memory.facts_repo import get_facts, extract_and_update_facts
from services.memory.profile_repo import build_user_context

_client = AsyncAnthropic()

_BASE_PROMPT = (
    "You are a warm, knowledgeable nurse companion inside the Pal app — like a trusted friend who happens to know a lot about medications. "
    "You have access to the user's scanned pill card data and health profile. Use both freely to help them. "

    "Tone: Warm, casual, and direct — like a nurse who genuinely cares. "
    "Say things like 'Yeah, your liver disease is the big one here' not 'Based on your profile, your liver disease is the biggest concern because...' "
    "No stiff phrasing. No corporate language. Short, natural sentences. "

    "Length: 2-3 sentences max. Enough to actually answer the question, no more. "
    "Stay laser-focused on exactly what was asked. "
    "Do not volunteer information about other medications or conditions unless the user specifically asked about them. "
    "Trust the user to ask follow-up questions if they want more. "

    "You CAN and SHOULD: "
    "Compare medications, rank risks, explain side effects, flag dangerous combos — all using their pill card data and your medical knowledge. "
    "Answer first, mention a doctor only if it's genuinely urgent. "

    "Never invent pill card data. If a med isn't in their cards, say so briefly and move on. "
    "No markdown, no bullet points, no headers. Plain spoken words only. "
)


def _build_system_prompt(facts: list[str], user_context: str) -> str:
    prompt = _BASE_PROMPT

    if user_context:
        prompt += f"\n\nHere is what you know about this user's health:\n{user_context}"

    if facts:
        facts_block = "\n".join(f"- {f}" for f in facts)
        prompt += (
            f"\n\nAdditional things you know about this user — "
            f"use naturally, don't recite back:\n{facts_block}"
        )

    return prompt


async def respond(user_id: str, message: str) -> str:
    # Fetch everything in parallel
    facts, turns, user_context = await asyncio.gather(
        asyncio.to_thread(get_facts,           user_id),
        asyncio.to_thread(load_turns,          user_id),
        asyncio.to_thread(build_user_context,  user_id),
    )

    turns.append({"role": "user", "content": message})

    reply = await _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=256,
        system=_build_system_prompt(facts, user_context),
        messages=turns,
    )
    ai_text = reply.content[0].text

    turns.append({"role": "assistant", "content": ai_text})

    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, save_turns, user_id, turns)
    loop.run_in_executor(None, extract_and_update_facts, user_id, message, ai_text)

    return ai_text
