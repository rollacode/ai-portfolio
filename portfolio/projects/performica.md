# Performica - OrgGraph Network Analysis

**Period:** Sep 2023 – Jun 2025
**Role:** Product Engineer (officially Product Manager, but startup reality = product + engineering + design)

## Overview
People analytics and performance management platform — think Lattice, but with a focus on organizational network analysis. The core product, OrgGraph, visualized how people actually connect and collaborate across an organization — not just org charts, but real influence and communication patterns. The platform also included 360 review cycles, performance reviews, and team health reporting.

## My Role
Another startup, another "do everything" situation. Owned the product vision for OrgGraph — rewrote the entire user story flow from scratch, defined the concept, and designed the experience end-to-end. On the engineering side, worked across the full stack on Django backend. Closely collaborated with my wife Anya on product design — we worked as a tight two-person unit, iterating fast on both the main platform and marketing website redesigns. Also participated in strategic product meetings, ran grooming sessions, and handled project management.

## Stack
- **Backend:** Django (Python), DRF
- **Frontend:** Vue.js
- **OrgGraph Engine:** Scala, WebSocket, optimized graph rendering library (high-performance visualization for large node counts)
- **Design:** Figma (product + marketing redesigns)

## Key Achievements
- Designed and built OrgGraph — an interactive network visualization mapping real relationships and influence patterns across organizations, handling hundreds to thousands of nodes
- Rewrote the entire product vision and user story flow for OrgGraph from the ground up
- Built 360 review cycle workflows — multi-step feedback collection, calibration, and reporting (similar to Lattice's review process)
- Redesigned both the main product UI and the marketing website
- Began integrating LLM capabilities into the platform for automated insights — this AI direction caught REKAP's attention
- Managed product strategy alongside engineering — strategic meetings, grooming sessions, roadmap planning

## Technical Deep Dive
**Challenge:** How do you render an interactive graph of hundreds (sometimes thousands) of organizational nodes with real-time relationship data without the browser choking?

**Solution:** The OrgGraph engine ran on Scala with WebSocket connections pushing live data to the frontend. The visualization layer used a highly optimized graph rendering library built for large datasets — far beyond what D3.js can handle at scale. Nodes represented people, edges represented communication and collaboration patterns, and the system supported zooming, filtering, and clustering in real-time.

## What Led to the Acquisition
Performica started integrating LLMs to generate automated insights from organizational data — performance summaries, relationship analysis, team health reports. REKAP saw the potential in how Performica collected, connected, and analyzed people data, and acquired the technology and team. Out of 7 engineers, only 2 (including me) were selected to transition to REKAP — bringing the domain knowledge and technical foundation that became part of REKAP's AI intelligence layer.

## Design Partnership
Worked side by side with Anya (my wife) on product design throughout the entire project. This turned out to be one of the most efficient design partnerships I've had — rapid iteration cycles, shared context, and zero communication overhead. Together we redesigned the product experience and the marketing website from the ground up.

## Links
- [performica.com](https://www.performica.com) (archived)
- Similar product: [lattice.com](https://lattice.com)
