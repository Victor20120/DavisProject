# Goal: Reminder scheduler — runs on a 1-minute tick.
# Queries Firestore for reminders whose next_due time has passed,
# triggers the initial nudge notification, and hands overdue ones to escalation.
