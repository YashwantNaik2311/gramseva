# GramSeva (ग्रामसेवा)

> Multilingual, voice-enabled discovery of Indian government welfare schemes powered by AWS Serverless and Generative AI. Built for the **WeMakeDevs + AWS First Commit** Hackathon.

---

## Overview

GramSeva bridges the gap between rural citizens and public welfare programs. Instead of navigating complex government portals with convoluted bureaucratic terminology, citizens can simply **speak or type their situation in their native language** (English, हिन्दी, ಕನ್ನಡ). 

GramSeva extracts their profile attributes, transparently matches relevant welfare schemes with explainable criteria, lists official verification steps & required documents, and can read back the details aloud.

### Key Pillars
- **Voice-first & Multilingual:** Native speech-to-text and text-to-speech supporting Hindi, Kannada, and English.
- **Explainable Matching:** Never just says "eligible" — explains *why* a scheme appeared and what remains to be verified.
- **Zero Hallucination Scheme Data:** Grounded in a curated database of verified central and state schemes with direct links to official government portals.
- **Privacy & Security by Design:** No user profile data is permanently stored; zero credentials or secrets exposed to clients.

---

## Architecture & AWS Services

GramSeva is built on a serverless, event-driven AWS architecture:

`
                  ┌──────────────────────┐
                  │    React Frontend    │ (Mobile-first, Multilingual)
                  └──────────┬───────────┘
                             │ HTTPS
                             ▼
                  ┌──────────────────────┐
                  │  Amazon API Gateway  │ (HTTP API)
                  └──────────┬───────────┘
                             │
     ┌───────────────────────┼───────────────────────┐
     ▼                       ▼                       ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Voice Lambda │      │Profile Lambda│      │Recommend /   │
│              │      │              │      │Scheme Lambda │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │                     │                     │
 ┌─────┴─────┐        ┌──────┴──────┐       ┌──────┴──────┐
 │Amazon S3  │        │AWS Bedrock  │       │Amazon       │
 │Amazon     │        │Mantle       │       │DynamoDB     │
 │Transcribe │        │(DeepSeek    │       │(Curated     │
 │& Polly    │        │ v3.2)       │       │ Schemes)    │
 └───────────┘        └─────────────┘       └─────────────┘
`

- **Amazon API Gateway (HTTP API):** Low-latency, secure routing for voice, profile extraction, and recommendation endpoints.
- **AWS Lambda (Node.js 22 + TypeScript):** Serverless handlers for speech processing, LLM orchestration, and deterministic rule matching.
- **Amazon DynamoDB:** Single-digit millisecond retrieval for curated government scheme data and eligibility rules.
- **Amazon S3:** Ephemeral, secure storage for voice audio snippets and synthesized speech.
- **Amazon Transcribe & Amazon Polly:** Multilingual speech-to-text transcription and natural voice synthesis.
- **AWS Bedrock Mantle (DeepSeek v3.2):** Structured profile extraction from free-form citizen voice/text descriptions.

---

## Repository Structure

`
.
├── assets/                  # Logos and UI background artwork
├── backend/                 # AWS Serverless SAM application
│   ├── src/                 # Lambda handlers, domain models, services
│   ├── scripts/             # Seed scripts, smoke tests, build tools
│   ├── tests/               # Vitest unit & integration test suites
│   ├── template.yaml        # AWS SAM CloudFormation infrastructure template
│   └── samconfig.toml       # SAM deployment parameters
├── dataset/                 # Curated, verified Indian government schemes (JSON)
├── frontend/                # React 18 + Vite + TypeScript mobile web app
│   ├── src/                 # Screens, components, i18n, design tokens
│   └── public/              # Static assets & font references
└── first-commit-gramseva.md # Hackathon project design & guidelines
`

---

## Getting Started

### Prerequisites
- Node.js 20+ and npm
- AWS CLI & AWS SAM CLI (for backend deployment)

### 1. Frontend Setup

`ash
cd frontend
npm install
cp .env.example .env
npm run dev
`

Visit http://localhost:5173 to explore the UI.

### 2. Backend Setup & Tests

`ash
cd backend
npm install
npm test
`

To seed scheme data to DynamoDB or deploy via SAM:
`ash
# Build Lambda packages
npm run build:lambdas

# Deploy with SAM
sam build
sam deploy --guided
`

---

## License

This project was created for the WeMakeDevs + AWS First Commit Hackathon.
