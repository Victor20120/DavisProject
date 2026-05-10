# Goal: Background memory-writing worker.
# Consumes a queue of completed conversation turns and runs the memory extractor
# asynchronously so it never blocks the voice response latency.
