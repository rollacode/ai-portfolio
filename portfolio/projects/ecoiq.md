# EcoIQ - ESG Supply Chain Platform

**Period:** 2025 – Present
**Role:** Architecture Consultant & LLM Expert

## Overview
ESG reporting and supply chain risk management platform based in Amsterdam. EcoIQ helps companies create transparency across their supplier ecosystems — identifying ESG risks (human rights violations, environmental hazards, energy risks) and ensuring regulatory compliance (CSRD, ESRS, ISSB). Think of it as automated supply chain due diligence powered by AI.

## My Role
Part-time consulting engagement alongside REKAP (which remains the primary role). Brought in as an architecture expert to fix foundational technical issues left by previous developers and integrate LLM capabilities.

## Stack
- **Current:** Next.js (monolithic — frontend + backend combined)
- **Migrating to:** FastAPI (Python) backend + Next.js frontend (proper separation)
- **AI:** LLM integration for automated ESG analysis and insights

## Key Achievements
- Designed the migration architecture: splitting monolithic Next.js into a proper FastAPI backend + Next.js frontend
- Integrating LLM capabilities for automated ESG data analysis and report generation
- Mentoring the engineering team on backend architecture, API design, and best practices
- Helping the team understand and implement proper separation of concerns

## Technical Challenge
**Problem:** The previous developers built everything inside Next.js — API routes handling heavy business logic, no proper backend service layer, unoptimized data flows. This doesn't scale for an ESG platform that needs to process supplier data, run compliance checks, and generate reports.

**Solution:** Architecting a clean FastAPI backend with proper service/repository layers, async task processing, and LLM integration points. The Next.js frontend becomes a thin client consuming a well-defined API. This unlocks the ability to add LLM-powered features (automated ESG scoring, natural language report generation) without fighting the framework.

## Links
- [eco-iq.com](https://eco-iq.com)
