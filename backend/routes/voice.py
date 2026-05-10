# Goal: Expose the listen→brain→speak endpoint.
# Receives audio from the client, runs STT to get text, passes it through
# the Gemini brain (with memory context), then returns synthesized speech via TTS.
