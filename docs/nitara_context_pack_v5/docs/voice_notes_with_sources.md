# Voice notes with sources (for implementers)

## Mem0 voice architecture
- Retrieve memories **before** the LLM call; store new memories **after** response asynchronously to avoid latency.  
  Source: https://mem0.ai/blog/ai-memory-for-voice-agents

- Use preloaded context + conditional semantic search (“hybrid”) to avoid per-turn retrieval cost.  
  Source: https://mem0.ai/blog/ai-memory-for-voice-agents

- Use expiration dates for session context and drafts to reduce memory pollution.  
  Sources:
  https://docs.mem0.ai/platform/features/expiration-date
  https://docs.mem0.ai/cookbooks/essentials/memory-expiration-short-and-long-term

## LiveKit transcriptions
- LiveKit Agents publishes transcriptions over the `lk.transcription` text stream topic (enabled by default in AgentSession).  
  Source: https://docs.livekit.io/agents/build/text/
