# Oira — Design System

Theme derived from the **oira.doctor** website (`assets/css/style.css`, saved copy on the
developer machine). It is an editorial, warm-neutral system: cream paper backgrounds,
near-black warm ink, a single terracotta accent, serif display headings and monospace
micro-labels. This file is the source of truth for desktop UI styling; the code lives in
`packages/ui/src/styles.css` (tokens + primitives) and
`apps/desktop/src/renderer/styles/index.css` (layout + screens).

Status: visual language only. It adds no product, compliance, or performance claims.

## Principles

- Calm, paper-like clinical surface. Nothing screams except "recording".
- The physician's eye is drawn to exactly one primary action per screen (dark ink button).
- AI output always reads as a draft: amber/warn framing until explicitly accepted.
- Spanish clinical copy rules from the README apply unchanged ("No consta",
  "Sin determinar", `DESCONOCIDO` until the backend confirms a fact).

## Color palette

| Token | Value | Usage |
| --- | --- | --- |
| `--nl-surface` | `#fbf9f6` | App background (oira `--bg-primary`) |
| `--nl-surface-raised` | `#fffdf9` | Cards, inputs, dialogs |
| `--nl-surface-sunken` | `#f3efe6` | Secondary panels, footer bands (oira `--bg-secondary`; tertiary is `#ede8de`) |
| `--nl-border` | `#e5ded2` | Hairline borders |
| `--nl-text` | `#120c08` | Primary ink (oira `--text-primary`) |
| `--nl-text-muted` | `#605852` | Secondary text |
| `--nl-text-faint` | `#9c948c` | Timestamps, hints |
| `--nl-accent` | `#c96f2e` | Terracotta: links, focus rings, active states, markers (oira `--accent-orange`) |
| `--nl-accent-hover` | `#a8561e` | Accent hover/pressed |
| `--nl-ok` | `#4a7257` | Success / accepted note |
| `--nl-info` | `#6b625a` | Neutral informational badges |
| `--nl-warn` | `#8a5f16` | Draft-requires-review framing |
| `--nl-danger` | `#a63d2a` | Destructive actions |
| `--nl-recording` | `#b3402e` | Live recording indicator (only pulsing element) |

Button hover ink: `#2b2520` (oira `--button-hover-bg`). Tints are the accent/state colors at
8–14% alpha over the surface — never solid fills except the recording badge and dark buttons.

## Typography

Fonts (Google Fonts import with local fallbacks; bundle the files before any production build):

| Role | Family | Fallbacks |
| --- | --- | --- |
| Display / card titles / big timer | Playfair Display 400–500, italics allowed for brand | Georgia, serif |
| Body / controls | Inter 400–600 | DM Sans, system-ui |
| Micro-labels, badges, stepper | DM Mono 400–500, uppercase, `letter-spacing 0.08–0.1em` | ui-monospace, Consolas |

Scale: page title 1.75rem serif · card title 1.3rem serif · body 1rem/1.6 · muted 0.95rem ·
mono labels 0.72rem · timer 2.75rem serif tabular.

## Shape, elevation, motion

- Radius: inputs/buttons 14px · sections 16px · cards/dialogs 22–24px · pills/badges 999px.
- Shadows are warm-black at very low alpha:
  - soft: `0 10px 30px rgb(18 12 8 / 0.05), 0 2px 8px rgb(18 12 8 / 0.03)`
  - lift (hover): `0 18px 44px rgb(18 12 8 / 0.09)`
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (oira `--transition-smooth`), 160ms micro,
  300ms standard. All motion is disabled under `prefers-reduced-motion`.
- Signature glass treatment (topbar, sticky dock): translucent warm panel
  (`rgb(237 232 222 / 0.55)`), white hairline border, `backdrop-filter: blur(16px)`,
  soft shadow.

## Component patterns

- **Primary button** = near-black ink fill, cream text (oira CTA style); hover `#2b2520`
  with 1px lift. Never use the accent orange as a button fill.
- **Badges** = mono uppercase pills on tinted backgrounds; `recording` is the sole solid
  red pill and its dot pulses.
- **Topbar** = floating glass pill, brand set in italic serif, centered flow stepper with
  numbered circles (todo: outline · current: ink fill · done: ok tint).
- **Cards** = raised paper panels, generous padding, serif titles.
- **Links/evidence** = terracotta underlined text buttons; transcript highlight =
  accent tint wash, animated in.
- **Draft preview** = white "paper sheet" block with soft shadow (Export screen).

## Accessibility & constraints

- Focus: `outline: 3px` accent ring with 2px offset on every interactive element.
- Text contrast pairs used: `#120c08`/`#fbf9f6`, `#605852`/`#fffdf9` (≥ AA for body sizes);
  never place `#9c948c` text below 0.95rem or on tinted fills.
- `accent-color` tints native checkboxes terracotta; no custom checkbox widgets.
- The theme changes appearance only. It must not alter clinical copy, review gates, or the
  mock/real bridge behavior described in the README.
