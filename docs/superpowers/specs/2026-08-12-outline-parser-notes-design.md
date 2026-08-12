# Outline Data Parser and Notes Page Design Spec

## Overview
Create an npm script (`npm run pd`) to parse the outline file `data/dijon.outline.dpod.txt` into `data-parsed/dijon.json`, and display the data on a responsive frontend `/notes` page in Nuxt with inline Markdown and WhatsApp-style emoticons (`:thinking:` -> 🤔).

## Proposed Changes

### CLI & Script
- **Update `cli/commands/cmd-parse-data.ts`**:
  - Implement parsing logic via an exported `execute` function / `OutlineParser` class.
  - Read `data/dijon.outline.dpod.txt`.
  - Calculate `indent` (count of leading `\t` characters).
  - Strip `- ` prefix for `body`.
  - Generate 6-digit `id` (suuid) via `qstr.generateSuuid()`.
  - Ensure output directory `data-parsed/` exists and save `data-parsed/dijon.json`.
- **Update `package.json`**:
  - Update `"pd"` script to `"tsx cli/commands/cmd-parse-data.ts"` in compliance with `AGENTS.md`.

### Frontend
- **New Page `app/pages/notes.vue`**:
  - Import `data-parsed/dijon.json` directly.
  - Display list with responsive padding based on `indent`.
  - Parse markdown (bold `**`, italic `*`, links `[text](url)`).
  - Render `:thinking:` emoticon with WhatsApp emoji presentation.

## Verification Plan
1. Run `npm run pd` and verify `data-parsed/dijon.json` is created with valid `id`, `body`, `indent`.
2. Inspect frontend page `/notes` to verify outline layout, mobile responsiveness, markdown rendering, and `:thinking:` emoticon replacement.
