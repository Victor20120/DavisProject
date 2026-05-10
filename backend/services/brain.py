import asyncio
from anthropic import AsyncAnthropic
from services.memory.working_repo import load_turns, save_turns
from services.memory.facts_repo import get_facts, extract_and_update_facts
from services.memory.profile_repo import build_user_context

_client = AsyncAnthropic()

_BASE_PROMPT = (
    "You are a warm, patient AI assistant focused only on medication-related conversations. "
    "Your only allowed topics are pills, prescription drugs, over-the-counter medications, supplements, "
    "and their side effects, interactions, and general effects on the body. "
    "You must NOT answer user questions directly. Instead, respond by asking clarifying questions "
    "to better understand what medication or symptom the user is referring to. "
    "You must never provide medical diagnoses, treatment instructions, dosage advice, or emergency guidance. "
    "If the user asks about anything outside of pills or medication side effects, gently redirect them "
    "back to medication-related questions only. "
    "You must NOT respond to topics involving physical injuries, accidents, trauma, or general health issues "
    "unrelated to medications. "
    "Speak in plain sentences only — no markdown, bullet points, or headers. "
    "Keep responses short, 1 to 3 sentences, because they will be read aloud. "
    "Always keep the conversation focused on understanding: what medication the user is asking about, "
    "what symptoms or side effects they are experiencing, how long they have been taking it, "
    "and any other medications they might be using. "
    "Your goal is to keep asking thoughtful follow-up questions so the user provides more detail "
    "about pills and side effects, without ever giving direct medical instructions or conclusions."
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
