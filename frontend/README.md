# GramSeva — Frontend

GramSeva lets people describe their situation in their own language and helps
them discover government schemes that may be relevant, understand why they
appeared, and see what to verify and do next.

This is the **frontend** package. It is a mobile-first, multilingual
(English / हिन्दी / ಕನ್ನಡ) React application that consumes the deployed GramSeva
backend API. The AI is deliberately kept invisible — the user and their problem
are the protagonist.

## Stack

- React 18 + TypeScript (Vite)
- Plain CSS with a custom design-token system (no UI kit)
- `@phosphor-icons/react` for a single, consistent icon language
- `@fontsource-variable/anek-*` — the Anek variable superfamily for weight-matched
  Latin, Devanagari, and Kannada typography (self-hosted, no CDN)

## Design system

The visual identity is rooted in Indian **material culture, not the flag**:

- **Primary** — deep warm indigo (`#3a36a3`), the color of natural indigo dye.
- **Accent** — marigold (`#d99a1f`), used sparingly for the voice/listening
  moment and warm highlights.
- **Surfaces** — warm, slightly cool paper (`#f6f5f2`) to avoid the generic
  beige or government-blue look.
- **Semantic** — calm pine for matched, amber for "still verify", a soft,
  non-alarming rust for errors.

All tokens live in `src/styles/tokens.css`. The palette, spacing scale, radius
scale, shadows, and motion timings are defined once and consumed everywhere.

## Core user journey

1. Choose a language (affects the entire interface, not just labels).
2. Describe your situation by **speaking** or **typing**.
3. Review "Here is what I understood." — a calm receipt where every field can
   be corrected, and unknown values are shown gracefully.
4. See schemes that may be relevant.
5. Expand "Why am I seeing this?" for an honest match explanation.
6. Open a scheme for eligibility, documents, and the official source.
7. Optionally listen to a summary read aloud (English + Hindi voice output).

## Environment

Copy `.env.example` to `.env` and set the API base URL:

```
VITE_API_BASE_URL=https://0nfhw4y53g.execute-api.us-east-1.amazonaws.com/dev/
```

The frontend contains **no secrets**. It only talks to the public API.

## Commands

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck + production build
npm run preview  # preview the production build
```

## Structure

```
src/
  App.tsx              # app-level state machine (welcome → input → profile → results → detail)
  main.tsx             # entry point
  components/          # Button, Header, Sheet, VoiceRecorder, ProcessingInline, ...
  screens/             # Welcome, Input, Profile, Recommendations, SchemeDetail, Error
  lib/                 # api client, types, i18n, value localization
  styles/              # tokens.css, base.css, app.css
```

## Trust & safety

- The interface never claims eligibility; it says "may be relevant" and always
  points to the official source.
- Unknown / sensitive attributes are shown as "Not provided" and cannot be
  quietly assumed.
- No backend errors, stack traces, or infrastructure details leak into the UI;
  every error state is human and actionable.
