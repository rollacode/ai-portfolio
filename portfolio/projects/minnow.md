# Minnow - Streaming Aggregator

**Period:** Dec 2019 – Feb 2020
**Role:** Lead iOS Developer + Backend

## Overview
Unified streaming aggregator combining libraries from Netflix, Disney+, Prime Video, and HBO into a single app. Alternative to Trakt.tv with discovery features across iOS and Apple TV.

## Platforms
- iPhone
- iPad
- Apple TV (tvOS)

## Stack
- **Mobile:** Swift, iOS, tvOS
- **Backend:** C# (ASP.NET)
- **Infrastructure:** Firebase, CocoaPods, REST APIs

## Key Achievements
- Code-sharing architecture between iOS and tvOS (divergent UI paradigms)
- Built unified interface for multi-service streaming discovery
- First major backend development experience (built MoviesDB-like database with Python dev)
- Cross-platform development for iPhone, iPad, and Apple TV

## Technical Challenge
**Problem:** iOS and Apple TV have completely different interaction paradigms (touch vs remote), but need to share business logic and data management code.

**Solution:** Architected shared Swift modules for networking, data models, and business logic, while maintaining platform-specific UI layers. Required careful abstraction design to avoid leaking platform-specific code into shared components.

## Domain Expertise
- Multi-platform iOS development
- tvOS (Apple TV) development
- Code sharing architecture
- Backend development (ASP.NET + Python)
- Media aggregation

## Links
- [minnowtv.com](https://minnowtv.com)
