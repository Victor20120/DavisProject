# Goal: Escalation state machine for missed reminders.
# Moves a reminder through states: nudge → re-nudge → caregiver SMS → caregiver voice call.
# Each transition is time-gated and logged so the caregiver sees the full history.
