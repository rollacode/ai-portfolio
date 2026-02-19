# Trax Retail - Shelf Recognition App

**Period:** Jul 2022 – Aug 2023
**Role:** Senior iOS Developer, SDK Architect

## Overview
Trax is a leading computer vision company for the retail industry. Their platform helps consumer goods manufacturers and retailers analyze shelf conditions in real-time — what's on the shelf, what's missing, what's misplaced. I joined the core mobile team to work on the flagship iOS app and build internal SDK infrastructure.

## Stack
- **Mobile:** Swift, Objective-C, C++
- **CV/ML:** OpenCV (shelf image analysis), Pinecone (vector embeddings for product matching)
- **Backend:** Python, Django
- **Big Data:** Apache Spark
- **Infrastructure:** Firebase, Git, Jira

## Key Achievements
- Engineered advanced computer vision integration via OpenCV for real-time shelf recognition — the app captures shelf images, processes them on-device, and sends structured data to the backend
- Designed and built an internal SDK architecture for shelf recognition, packaging the CV pipeline as a reusable module for other Trax teams and products
- Worked with Pinecone vector database for product matching — shelf images are embedded into vectors and matched against a product catalog for identification
- Built real-time mobile reporting — field reps see shelf analysis results instantly on their devices
- Collaborated closely with the CV/ML team to bridge the gap between research models and production mobile code

## Technical Deep Dive
**Challenge:** How do you run heavy computer vision (OpenCV) on a mobile device without killing performance, while keeping the SDK modular enough for other teams to integrate?

**Solution:** Built a layered SDK architecture where the CV pipeline runs in a background processing queue. The SDK exposes a clean Swift API while the heavy lifting happens in C++/OpenCV under the hood. Image capture, preprocessing, and feature extraction are pipelined — while one frame is being analyzed, the next is already being captured. The Pinecone integration handles the matching step server-side, comparing extracted feature vectors against the product catalog at scale via Apache Spark batch processing.

## Team & Culture
Worked alongside talented engineers and managers (Daniel Stolero, Dolev Pomeranz, Alex Fishman, Youval Bronicki — all left LinkedIn recommendations). The team culture was collaborative and technically ambitious — pushing mobile CV capabilities forward together.

## Links
- [App Store](https://apps.apple.com/ru/app/trax-retail/id1092946346)
