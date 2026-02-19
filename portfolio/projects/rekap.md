# REKAP - AI Chief of Staff

**Period:** Feb 2025 – Present
**Role:** Product Engineer (officially Senior Full-Stack Engineer, but startup reality = product + full-stack + design)

## Overview
REKAP is an AI-powered intelligence layer for organizations — it captures meetings, models relationships, builds institutional memory, and uses AI agents to move work forward. Think of it as an AI chief of staff that listens, remembers, and acts. The platform serves leadership, talent, revenue, and operations teams with automated workflows, voice agents, and a smart CRM (Rolodex).

## My Role
Startup reality: wore every hat. Part product manager defining what to build, part full-stack engineer building it, part designer iterating in Figma. Configured PostHog analytics to track user behavior and inform product decisions. Worked in a team of 4 engineers.

## Stack
- **Frontend:** React, TypeScript, WebSocket (real-time chat)
- **Backend:** Python, Django, DRF, Celery, Redis, PostgreSQL
- **AI/ML:** LangChain, LangGraph (agentic pipelines), LiteLLM (multi-model routing)
- **Voice:** LiveKit (real-time voice agents)
- **Analytics:** PostHog
- **Design:** Figma (product design iterations)

## Key Achievements
- Built a real-time chat system with WebSocket that orchestrates AI agent pipelines — user messages trigger LangGraph node chains that call tools, fetch context, and stream responses
- Designed and implemented agentic pipelines with LangChain/LangGraph — multi-step chains where each node performs a specific task (retrieval, summarization, action extraction, etc.)
- Developed LiveKit-powered voice agents that join meetings, transcribe in real-time, and generate structured summaries
- Built the meeting scribe system — automated meeting intelligence that captures action items, decisions, and follow-ups
- Created a SQL agent for natural language data queries — users ask questions in plain English, the agent generates and executes SQL
- Implemented the Rolodex (AI CRM) — relationship mapping that builds contact records from meeting interactions automatically
- Set up PostHog analytics pipeline to track engagement, feature adoption, and user flows
- Iterated on product design in Figma — translating rough concepts into polished UI that shipped

## Technical Deep Dive
**Challenge:** How do you build a chat interface where each user message can trigger a complex, multi-step AI pipeline — with different nodes doing retrieval, reasoning, and tool calls — while keeping the UX responsive and streaming?

**Solution:** Built a WebSocket-based chat layer on Django that routes incoming messages to LangGraph agentic chains. Each chain is a directed graph of nodes — one might fetch relevant meeting context via RAG, another runs the LLM with tool-calling enabled, another extracts action items. Results stream back to the client token-by-token via the WebSocket connection. Celery handles heavy async tasks (transcription, batch summarization) so the chat stays snappy.

## What This Shows
- Ability to operate across the full product lifecycle in a startup: ideation, design, implementation, analytics
- Deep experience with modern AI/LLM tooling (LangChain, LangGraph, LiteLLM, LiveKit)
- Real-time systems architecture (WebSocket, streaming, async task queues)
- Product thinking — not just building features, but measuring their impact with PostHog and iterating on design in Figma

## Links
- [rekap.com](https://www.rekap.com)
