# Goal: Reminder runner background worker.
# Ticks every minute: invokes the scheduler to fire due reminders and
# the escalation engine to advance overdue ones through the alert chain.
