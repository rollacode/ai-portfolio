# Bugsee - Developer Insights SDK

**Period:** Jan 2016 – Jan 2020
**Role:** Lead iOS Developer

## Overview
Bug reporting SDK that captures video, network logs, and console output for mobile app debugging. Required deep iOS internals knowledge. Single line of init code unlocks full functionality.

## Stack
- **Core:** C, C++, Objective-C, JavaScript
- **Distribution:** CocoaPods, SwiftPackages, Carthage
- **Platforms:** iOS

## Key Achievements
- Created custom memory zone to stay invisible in crash reports (advanced iOS internals)
- Built automatic video capture pipeline (last minute of screen recording)
- Developed network traffic interceptor (captures all HTTP/HTTPS requests)
- Implemented web view request logging
- Added password field masking for security
- Designed single-line integration API for developers

## Technical Deep Dive
**Challenge:** How do you capture everything happening in an app without interfering with crash reports or app behavior?

**Solution:** Built a custom memory allocation zone that operates outside the standard iOS memory management, making Bugsee invisible to crash report systems while still capturing video, network traffic, and logs.

## Team
Worked with:
- **Dmitry Fink** (now at Meta)
- **Alex Fishman**

## Domain Expertise
- iOS internals (memory management, runtime)
- Video capture and processing
- Network traffic interception
- SDK architecture and API design

## Links
- [bugsee.com](https://www.bugsee.com)
