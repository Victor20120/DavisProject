# Goal: Memory orchestrator — runs before each LLM call.
# Pulls relevant facts, recent episodes, and similar memory chunks,
# then assembles them into a context block injected into the Gemini prompt.
