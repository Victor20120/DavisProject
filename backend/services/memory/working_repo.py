# Working memory = the conversation history for one user.
#
# Stored in Firestore at:
#   users/{user_id}/working_memory/conversation
#       → { "turns": [ {role, content}, {role, content}, ... ] }
#
# One document per user. The "turns" array holds the full back-and-forth
# in the format Claude expects: {"role": "user"|"assistant", "content": "..."}
#
# We cap at MAX_TURNS so the document never grows unbounded and the context
# window fed to Claude stays fast and cheap.

from services.firebase import db

# Keep the last 20 turns (= 10 exchanges). Older turns fall off automatically.
MAX_TURNS = 20

# Firestore path helpers — defined once so a rename only changes one line
def _doc_ref(user_id: str):
    return (
        db.collection("users")
        .document(user_id)
        .collection("working_memory")
        .document("conversation")
    )


def load_turns(user_id: str) -> list:
    """Return the saved conversation turns for this user.

    Returns an empty list if the user has no history yet — this is the normal
    case for a brand new user, not an error.
    """
    doc = _doc_ref(user_id).get()
    if doc.exists:
        return doc.to_dict().get("turns", [])
    return []  # first time this user has chatted


def save_turns(user_id: str, turns: list) -> None:
    """Persist the current conversation turns back to Firestore.

    Trims to MAX_TURNS before saving so the oldest exchanges fall off.
    Call this after every AI reply so nothing is lost on crash or restart.
    """
    # Slice from the end — keeps the most recent turns, drops the oldest
    trimmed = turns[-MAX_TURNS:]
    _doc_ref(user_id).set({"turns": trimmed})


def clear_turns(user_id: str) -> None:
    """Wipe the conversation history for this user.

    Useful for testing, or later when the user says "start fresh".
    """
    _doc_ref(user_id).set({"turns": []})
