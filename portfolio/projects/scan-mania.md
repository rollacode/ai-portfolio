# Scan Mania - AR Shopping Application

**Period:** Oct 2020 – Oct 2022
**Role:** AR Developer, Backend Architect

## Overview
Rewards app where users earn "kicks" by scanning barcodes on store shelves using Augmented Reality. Built from scratch with a team of 3 developers as an invite-only pilot integrated with Shopkick. Combined ARKit for spatial understanding, MLKit for barcode recognition, and Unity3D for 3D product visualizations — a genuinely fun shopping experience.

## Stack
- **Mobile:** Swift, SwiftUI, ARKit (augmented reality), MLKit (barcode recognition)
- **3D:** Unity3D (product visualizations, 3D overlays on shelves)
- **Backend:** FastAPI (Python), ASP.NET (C#)

## Key Achievements
- Built the entire AR experience from scratch — point your phone at a shelf and it recognizes products, highlights barcodes, and overlays 3D rewards
- Integrated ARKit for spatial tracking + MLKit for real-time barcode detection — two ML frameworks working together in the same camera pipeline
- Developed 3D product visualization overlays using Unity3D, leveraging prior game development experience (Cops Inc.)
- Architected a FastAPI backend to handle massive spatial data volumes from AR sessions — each scan generates thousands of 3D coordinate points
- Gamified the retail experience — scanning barcodes felt like collecting items in a game, driving high user engagement

## Technical Challenges
**Challenge:** Running ARKit (spatial tracking), MLKit (barcode detection), and Unity3D (3D rendering) simultaneously on a mobile device without frame drops.

**Solution:** Separated the workloads across processing tiers. ARKit runs on the main camera feed for spatial anchoring. MLKit barcode detection runs on a secondary video buffer at reduced resolution. Unity3D renders only when ARKit confirms a stable surface — no wasted GPU cycles on unstable tracking. The backend handles the heavy aggregation — individual scan sessions push raw spatial data to FastAPI, which processes and matches against the product database asynchronously.

## Links
- [App Store](https://apps.apple.com/il/app/scan-mania/id1540764114)
