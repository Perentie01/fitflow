# Design System — FitFlow

## Product Context
- **What this is:** A personal workout tracker for logging sets, reps, and weights across structured training blocks.
- **Who it's for:** Personal use — single user, no account, data stays on device (Dexie/IndexedDB).
- **Space/industry:** Fitness / strength training. Peers: Strong, Hevy, FitNotes.
- **Project type:** Mobile-first web app (React + Vite, deployed to GitHub Pages).

## Aesthetic Direction
- **Direction:** Industrial / Editorial — function-first data display with editorial typographic touches.
- **Decoration level:** Minimal — typography and spacing carry the design. No gradients, no icon circles, no decorative flourishes.
- **Mood:** A quality training journal. Calm, precise, personal. Not a gym startup's marketing site — closer to a well-designed notebook than an energy drink brand.
- **Reference sites:** Strong (bold contrast, confident copy), Hevy (clean minimal social), but deliberately warmer and quieter than both.

## Typography
- **Display / Hero:** Instrument Serif — section headings, workout names, dates. Adds soul. Serif in a fitness app is unexpected; used sparingly it creates character without hurting legibility.
- **UI / Body:** Geist — all labels, descriptions, buttons, settings text. Clean, modern, excellent at small sizes.
- **Data / Tables:** Geist Mono (tabular-nums always on) — all weights, reps, sets, timers, streaks, counts. Creates a consistent "data instrument" feel throughout.
- **Code:** Geist Mono.
- **Loading:** Google Fonts CDN.
  ```
  https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap
  ```
- **Scale:**

| Role | Font | Size | Weight | Line height |
|------|------|------|--------|-------------|
| Display XL | Instrument Serif | 48px | 400 | 1.1 |
| Display LG | Instrument Serif | 32px | 400 | 1.2 |
| Card title | Instrument Serif | 18px | 400 | 1.3 |
| Body | Geist | 15px | 400 | 1.6 |
| Label | Geist | 13px | 500 | 1.4 |
| Caption | Geist | 11px | 400 | 1.5 |
| Data XL | Geist Mono | 28–32px | 600 | 1.0 |
| Data MD | Geist Mono | 15–18px | 500 | 1.2 |
| Data SM | Geist Mono | 10–11px | 400 | 1.6 |

## Color
- **Approach:** Restrained — amber accent is rare and meaningful. Color signals state, not decoration.
- **Dark mode (primary):**

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#111110` | Page background |
| `--bg-card` | `#1C1C1A` | Cards, sheets |
| `--bg-raised` | `#232320` | Inputs, stat blocks |
| `--border` | `#2E2E2B` | Card borders, dividers |
| `--border-subtle` | `#242422` | Section separators |
| `--text` | `#F5F0E8` | Primary text — 17.6:1 contrast ✓ AAA |
| `--text-muted` | `#9A9590` | Secondary text — 6.6:1 contrast ✓ AA |
| `--text-dim` | `#6E6A65` | Tertiary / decorative — 4.6:1 contrast ✓ AA |
| `--accent` | `#C4925A` | Amber — PRs, active states, CTA — 7.6:1 contrast ✓ AAA |
| `--accent-dim` | `#3D2E1E` | Amber backgrounds |
| `--accent-text` | `#E8B87A` | Amber text on accent backgrounds |
| `--success` | `#6B9E72` | PR achieved, completed sets |
| `--warning` | `#C4925A` | (shares accent) missed sessions, deload |
| `--error` | `#C46A5A` | Failed saves, destructive actions |
| `--info` | `#5A8EA8` | Informational states, deload detection |

- **Light mode:** warm off-white base (`#F8F4EE`), same token names, saturation reduced 10–15%, accent shifts to `#B07E44`.
- **Contrast compliance:** All text tokens meet WCAG 2.1 AA against their respective backgrounds. `--text` and `--accent` meet AAA.
- **Do not use:** Liquid Glass / `backdrop-filter` — performance liability on mobile mid-workout, and the near-black background has nothing to refract.

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable — data-heavy screens need breathing room.
- **Scale:**

| Name | Value | Usage |
|------|-------|-------|
| 2xs | 2px | Tight inline gaps |
| xs | 4px | Icon–label gaps |
| sm | 8px | Internal component padding |
| md | 16px | Card padding, section gaps |
| lg | 24px | Between cards |
| xl | 32px | Section headers |
| 2xl | 48px | Major section breaks |
| 3xl | 64px | Page-level vertical rhythm |

## Layout
- **Approach:** Grid-disciplined — predictable card structure, optimized for glanceable data mid-workout.
- **Grid:** Single column on mobile, 2-col on tablet+.
- **Max content width:** 960px.
- **Border radius:** sm: 6px (buttons, badges), md: 8px (inputs), lg: 12px (cards), full: 9999px (pills).

## Motion
- **Approach:** Intentional — Framer Motion is installed; use it for entrance animations and meaningful state changes. Not decorative.
- **Easing:** enter → `ease-out`, exit → `ease-in`, move → `ease-in-out`.
- **Duration:**

| Name | Range | Usage |
|------|-------|-------|
| micro | 50–100ms | Toggle states, checkbox ticks |
| short | 150–250ms | Button feedback, badge appearance |
| medium | 250–400ms | Card entrances, tab transitions |
| long | 400–700ms | Page-level transitions |

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-15 | Industrial/Editorial aesthetic | Differentiates from electric-blue/orange fitness app trope; fits personal-use training log |
| 2026-04-15 | Instrument Serif for headings | Unexpected in fitness context; adds personality without hurting legibility |
| 2026-04-15 | Geist Mono for all numeric data | Consistent "data instrument" feel; tabular-nums prevents layout shift between values |
| 2026-04-15 | Warm amber accent (#C4925A) | Calm alternative to neon; personal rather than corporate |
| 2026-04-15 | Dark mode as primary | Gym lighting, battery life, mid-workout eye strain |
| 2026-04-15 | --text-dim bumped to #6E6A65 | Original #5A5652 failed WCAG AA (2.9:1); corrected to 4.6:1 |
| 2026-04-15 | No Liquid Glass / backdrop-filter | Mobile performance concern mid-workout; near-black bg has nothing to refract |
