# Cops Inc. - GTA-Style Mobile Action Game

**Period:** Jun 2021 – Jun 2024
**Role:** Co-Founder & Developer

## Overview
Open-world mobile game where you play as a cop in a GTA-inspired city. Features a full traffic simulation system, drivable vehicles, mission-based gameplay, and pathfinding across a large open map. Built as a passion project with a friend — equal parts self-education and indie game ambition.

## Stack
- **Engine:** Unity3D, C#
- **Algorithms:** Dijkstra (pathfinding), Octree (spatial partitioning)
- **Design:** Collaborated with ex-Rovio (Angry Birds) designers

## Key Achievements
- Built a traffic simulation system with AI-driven vehicles following road networks
- Implemented Dijkstra-based pathfinding for mission routing across the open world
- Developed Octree spatial partitioning for optimized collision detection and entity queries
- Created a vehicle system with multiple drivable transport types
- Designed mission framework with dynamic objective routing

## Technical Deep Dive
**Challenge:** How do you route a player (or AI) to mission objectives across a large open-world map without killing performance on mobile?

**Solution:** Combined Dijkstra's algorithm for graph-based road network pathfinding with an Octree spatial structure for fast entity lookups and proximity queries. The Octree dramatically reduced the search space for collision detection and nearby-entity checks, while Dijkstra handled optimal route calculation through the city's road graph. This kept the game running smoothly even with dozens of traffic AI agents simultaneously navigating the map.

## What We Learned
This was a self-education project at its core. Diving into classical CS algorithms (Dijkstra, Octree) in a real-world game context was far more instructive than any textbook. We ran one paid traffic test through friends at Daki (a UA company) — the retention metrics weren't strong enough to justify scaling, and neither of us had the bandwidth to iterate further. The project stayed in the drawer, but the engineering experience stuck.

## Team
- **Andrey Kovalev** — development, game systems
- **Co-founder** — game design, level design
- **Ex-Rovio designers** — art direction, UI/UX consulting
