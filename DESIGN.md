# DESIGN.md, Overpass

Single source of truth for every visual decision in Overpass. Written before the first screen, from the structure of a sober base of the awesome-design-md catalogue (the cal.com analysis), with content that belongs to Overpass only. The spec (docs/cahier-des-charges.md, sections 6 and 7) wins over this file, and this file wins over any skill default.

Status: direction "Grille" retained on 2026-10-12 by Jude Koffi among three prototypes (design-demos/direction-approved.md). Change tokens in this file first, never in a component.

## Overview

Overpass is the exchange for verified African integrations: a developer tool read by hurried developers, contributors, AI-assisted developers and a jury. The interface must feel calm, legible and professional in the first minute, on a 360 px phone over 3G as well as on a laptop.

The visual voice is a printed road atlas, not a dashboard: a neutral paper floor, near-black ink, 1 px rules that organise dense information into a visible grid, square corners everywhere, and one ink-blue accent reserved for the primary action and the links. Density is welcome when the rules carry it; decoration is not. Product vocabulary shapes the UI: an integration sheet is an itinerary, a known trap is a pothole, a recently verified sheet is a clear road, the simulator is the test track.

**Key characteristics**

- One accent colour, used for the primary action, links, the active tab and focus. Nothing else is coloured except the three status roles.
- Dark theme by default, light theme available, both AA on every text and control.
- Running text at 16 px minimum, line height 1.6, reading width of 72 characters on itineraries.
- Two typefaces under the SIL Open Font License, self-hosted: IBM Plex Sans for titles and text, IBM Plex Mono for code.
- Square corners on every element. The grid of rules is the identity; no radius softens it.
- A 4 px spacing scale, 96 px between home page sections.
- Rules and surface tints instead of shadows. No decorative gradient, no emoji as icon, no illustration of people.
- One action per screen. The primary button appears once per view.
- Motion between 150 and 250 ms, removed when the user prefers reduced motion.

## Colors

Every colour is declared once as a CSS custom property on `:root`, with the dark values under `[data-theme="dark"]`. The web shell sets `data-theme="dark"` itself, so dark is the default for everyone; the light theme is a choice made with the theme switch, never an automatic switch, so that a screen looks the same for the jury and the developer. Components reference roles, never hex values. Values are given in hex.

### Roles

| Role | Token | Light | Dark | Use |
| --- | --- | --- | --- | --- |
| Fond (page floor) | `--color-paper` | `#FBFBF9` | `#141416` | Page background |
| Surface | `--color-surface` | `#F3F3F0` | `#1E1E21` | Code blocks, table head, tabs rail, footer, skeletons |
| Surface raised | `--color-surface-raised` | `#FDFDFB` | `#27272B` | Dialogs, menus, notifications |
| Rule | `--color-rule` | `#D4D4D0` | `#38383D` | The grid: section rules, column rules, table rows, card borders |
| Control outline | `--color-rule-strong` | `#7A7A80` | `#8A8A90` | Input, select, checkbox, chip and secondary button borders |
| Texte | `--color-ink` | `#1A1A1C` | `#EDEDEA` | Headings, body |
| Texte secondaire | `--color-ink-2` | `#55555A` | `#ABABB0` | Captions, metadata, placeholders, table headers |
| Accent | `--color-accent` | `#213E9E` | `#9DB4FF` | Primary button, links, active tab underline, focus ring |
| Accent ink | `--color-accent-ink` | `#FBFBF9` | `#0E1A4A` | Text on the accent |
| Accent surface | `--color-accent-surface` | `#E6EBF9` | `#1C2A5C` | Selected row, active filter, ghost button hover |
| Succès | `--color-success` | `#1D6B3A` | `#7FD39A` | Clear road badge, success notice |
| Succès surface | `--color-success-surface` | `#E3F2E7` | `#163122` | Badge and notice background |
| Alerte | `--color-warning` | `#7D5200` | `#F0B860` | To verify badge, warning notice |
| Alerte surface | `--color-warning-surface` | `#FBEFD3` | `#3A2A0C` | Badge and notice background |
| Danger | `--color-danger` | `#B4261E` | `#F28B82` | Reported broken badge, errors, destructive confirmation |
| Danger surface | `--color-danger-surface` | `#FADFDC` | `#43201D` | Badge and notice background |
| Focus | `--color-focus` | `#213E9E` | `#9DB4FF` | 2 px ring, 2 px offset, on every focusable element |

Measured contrast, light theme: ink on paper 16.8:1, ink-2 on paper 7.2:1, accent on paper 9.0:1, accent ink on accent 9.0:1, success on paper 6.3:1, warning on paper 6.6:1, danger on paper 6.3:1, control outline on paper 4.1:1. Dark theme: ink on paper 15.7:1, accent on paper 9.1:1, accent ink on accent 8.2:1, control outline on paper 5.4:1. Every text pair stays above 4.5:1; every control outline stays above 3:1. The hairline rule is decorative (1.4:1) and never the only boundary of a control. Recheck these numbers whenever a value changes.

### Rules

- The accent is the only hue outside the three status roles. Never add a second accent, a pastel set or a brand gradient.
- Status colours mean one thing each: success is a clear road, warning is a sheet to verify, danger is a reported broken sheet or an error. Never use them decoratively.
- Text never sits on the raw accent except inside the primary button and the active tab.
- Pure black and pure white are not page colours. Paper and ink are tinted neutral grey.

## Typography

### Font Family

- **IBM Plex Sans** (SIL OFL 1.1), weights 400, 500, 600, 700, for titles, text, labels and buttons. Fallback stack: `"IBM Plex Sans", system-ui, "Segoe UI", Roboto, sans-serif`.
- **IBM Plex Mono** (SIL OFL 1.1), weights 400 and 500, for code, request and response bodies, identifiers, keys and webhook logs. Fallback stack: `"IBM Plex Mono", ui-monospace, "Cascadia Mono", Consolas, monospace`.
- Files live in `apps/web/public/fonts` with their OFL licence text, loaded with `@font-face` and `font-display: swap`. No font CDN. Latin subset only until a language needs more.

### Hierarchy

| Token | Size | Weight | Line height | Letter spacing | Use |
| --- | --- | --- | --- | --- | --- |
| `--text-display` | `clamp(44px, 7.5vw, 96px)`: 44 px at 360, 96 px from 1280 px | 600 | 1.02 | -0.025em | Home page promise, one per site, at most 13ch wide (approved 2026-10-16 with home proposal B) |
| `--text-h1` | 32 px | 600 | 1.2 | -0.01em | Page title, one per page |
| `--text-h2` | 24 px | 600 | 1.3 | 0 | Section title |
| `--text-h3` | 20 px | 600 | 1.4 | 0 | Card title, dialog title |
| `--text-body` | 16 px | 400 | 1.6 | 0 | Running text, inputs, buttons, table cells |
| `--text-body-strong` | 16 px | 600 | 1.6 | 0 | Labels, emphasis |
| `--text-caption` | 14 px | 500 | 1.5 | 0 | Metadata, badges, table headers, never running text |
| `--text-code` | 15 px | 400 | 1.6 | 0 | Code blocks, IBM Plex Mono |
| `--text-code-inline` | 0.9375em | 400 | inherit | 0 | Inline code inside text |

### Principles

- One family carries titles and text; weight and size make the hierarchy, not a second face.
- Weight 600 is the heaviest in headings. Weight 700 is reserved for the wordmark and numbers in the ranking.
- Running text never goes under 16 px. Captions at 14 px are limited to metadata of one line.
- Reading width: 72 characters (`max-width: 72ch`) on itineraries, articles and documentation.
- Numbers in tables and in the ranking use `font-variant-numeric: tabular-nums`.
- Sentence case everywhere. No uppercase labels, no tracking tricks.

## Layout

### Spacing System

- Base unit 4 px.
- Tokens: `--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-6` 24 · `--space-8` 32 · `--space-12` 48 · `--space-16` 64 · `--space-24` 96.
- Home page sections are separated by `--space-24` (96 px), 64 px under 768 px.
- Card padding `--space-6` (24 px), 16 px under 480 px. Dialog padding `--space-8`.
- Form rows separated by `--space-6`. Label to field `--space-2`. Field to help or error text `--space-2`.
- Page gutter 16 px at 360 px, 24 px from 768 px, 32 px from 1024 px.

### Grid & Container

- Content container 1200 px, centred, with a 1 px rule on both sides from 1024 px (the page reads as a column of the atlas). Reading container 72ch.
- Home page (approved by the user on 2026-10-24): the promise across the full container, a ruled row with a sentence that names what the product does and the primary action, then the live demo. Then "everything Overpass does", a tour of eight blocks (itineraries, test track, local relay, MCP server, discussions, blogs and newsletter, ranking, catalogue requests). Each block puts a numbered kicker, a title, two sentences and its links beside a small framed screen marked "example" that plays the feature at work, sides alternating from 1024 px, stacked text first below. The simulated operators with their unofficial mention close the tour. Then the latest published itineraries, recent discussions and articles beside the newsletter, and the countries, figures and sign-up.
- Catalogue: filters above the list under 1024 px, filters in a 280 px left column above.
- Test track: one column under 1024 px (form, then inspector, then webhook log); two columns above (form left, inspector and log right).
- Tables scroll horizontally inside their container under 768 px; they never break the page width.

### Whitespace Philosophy

Rules are the first tool, space the second, surfaces the third. Every section starts with a 1 px rule; columns are separated by vertical rules, not gaps. A screen shows one idea and one primary action. If a section needs a second primary action, it is two sections.

## Elevation & Depth

| Level | Treatment | Use |
| --- | --- | --- |
| Flat | No border, paper background | Page sections, header, footer |
| Rule | 1 px `--color-rule` | Sections, columns, cards, tables, code blocks, tabs rail |
| Surface | `--color-surface` background, optional hairline | Code blocks, table header, skeletons, secondary panels |
| Raised | `--color-surface-raised`, 1 px control outline, `0 8px 24px rgb(0 0 0 / 0.12)` | Dialogs, menus, notifications only |

No shadow below the raised level. No glassmorphism, no glow, no inner shadow.

## Shapes

Every corner is square: `--radius: 0` on buttons, inputs, cards, badges, chips, dialogs, notifications and code blocks. The only circles are avatars and radio buttons. An itinerary state is its words alone, semibold caption in its own colour, with no box, border, fill or dot (decided by the user on 2026-10-24).

## Iconography

One permissive set: Lucide (ISC), self-hosted as inline SVG components. Stroke 1.75, 20 px in text and buttons, 16 px in badges. Icons always sit next to a text label, except in icon-only buttons that carry an `aria-label`. Never an emoji as an icon. Never an icon above a heading as decoration.

## Motion

- Durations: `--duration-fast` 150 ms for colour and opacity, `--duration-base` 200 ms for position and dialogs, `--duration-slow` 250 ms for panels. Nothing longer, except on the home page, where the user allowed more on 2026-10-24. The figure counters run 400 ms once, and each tour screen plays its lines one per 900 ms while it is on screen, holds, then loops; bars grow in 700 ms. With reduced motion every screen shows its end state at once.
- Easing: `--ease-out: cubic-bezier(0.2, 0, 0, 1)` for entering, `--ease-in: cubic-bezier(0.4, 0, 1, 1)` for leaving.
- Only `transform` and `opacity` animate. Never layout properties.
- Under `prefers-reduced-motion: reduce`, every transition drops to 0 ms except a 100 ms opacity crossfade for dialogs and notifications.
- Skeletons pulse at 1.5 s, paused under reduced motion.
- Focus rings appear instantly, never animated.

## Components

Every component is keyboard operable, shows a visible focus ring (2 px accent, 2 px offset) and offers a 44 px touch target. Every string comes from the translation files. Every component receives the list of languages from the configuration and never assumes two languages.

### Buttons

- **button-primary**: accent background, accent ink text, 600 weight, 44 px tall, padding 0 20 px, square corners. Active state darkens the accent by 8 percent. Disabled state: surface background, ink-2 text. One per view.
- **button-secondary**: paper background, 1 px control outline, ink text. Same geometry.
- **button-ghost**: no border, ink text, accent surface on hover and focus. For table row actions and dialog cancel.
- **button-danger**: danger background, white text. Only inside a confirmation dialog.
- **button-icon**: 44 px square, ghost style, `aria-label` mandatory.
- Loading state keeps the width, replaces the label with a 16 px spinner and announces the same label in `aria-live`.

### Fields

- **field**: label above (600, 16 px), input 44 px tall, paper background, 1 px control outline, square corners, padding 0 12 px. Focus: 2 px accent ring. Help text below in ink-2. Error: danger border, error message below in danger, linked with `aria-describedby`. Validation runs on blur, then on each keystroke once the field has been in error.
- **select**, **textarea** (min 4 rows), **checkbox** and **radio** (20 px box, 44 px row) share the same tokens.
- Required fields are the default; optional ones say so in the label.
- **form-alert**: the error of a whole form, for what belongs to no single field (wrong credentials, too many attempts, unreachable service). Placed first in the form, above the fields, full width. Flat level (no shadow): danger surface background, 1 px danger border with a 4 px left edge, square corners, 16 px padding, a 20 px danger icon then one sentence in ink. `role="alert"`, so it is announced as soon as it appears; it stays until the next submission and has no close button. A problem that concerns one field always goes under that field instead, never in the alert.

### Cards

- **card**: surface-raised or paper background, hairline border, square corners, padding 24 px. Title in h3, metadata in caption, at most one action.
- **itinerary-card** (catalogue): status badge first, title, service and country line, last verification date, stack chips. The whole card is one link; the badge is not interactive.

### Status badges

- **badge**: rectangle with a 1 px border in its own colour, caption size, 500 weight, 28 px tall, padding 0 8 px, 6 px square dot before the label. Three variants mapped to the sheet state: clear road (success on success surface), to verify (warning on warning surface), reported broken (danger on danger surface). The text carries the meaning; the colour is never the only cue.
- **chip**: rectangle, 1 px control outline, ink-2 text, 28 px tall, for stacks, countries, filters and the "non officiel" mention. Selected chip uses the accent surface and an accent border.

### Tables

- **table**: full width, caption size header in ink-2 on surface, 48 px rows, hairline row dividers, no vertical borders, no zebra. Numbers right-aligned and tabular. Row actions as ghost buttons at the end. Under 768 px the table scrolls inside a container with a visible hairline edge; an optional `stacked` variant renders each row as a card.

### Tabs

- **tabs**: a rail with a hairline bottom border; each tab is a 44 px button, ink-2 text, active tab in ink with a 2 px accent underline. Arrow keys move between tabs, `role="tablist"`, panels labelled by their tab. Tab labels never wrap; when they do not fit, the rail scrolls inside itself, never the page. Used in the test track inspector (request, response, headers) and in settings.

### Confirmation dialog

- **dialog**: raised level, square corners, 32 px padding, max-width 480 px, centred, backdrop `rgb(0 0 0 / 0.4)`. Title in h3, one sentence of consequence, cancel ghost button on the left, confirming button on the right (danger variant for destructive actions). Focus moves to the dialog, is trapped, and returns to the trigger. Escape closes. Used before every destructive action.

### Notifications

- **notification**: raised level, square corners, 16 px padding, four variants (neutral, success, warning, danger) with a 20 px icon and a text. Stacked bottom centre on phones, bottom right from 768 px. Dismissed by a button or after 6 s for successes; errors stay until dismissed. `role="status"` for success, `role="alert"` for errors.

### Code block

- **code-block**: surface background, hairline border, square corners, 16 px padding, JetBrains Mono 15 px, horizontal scroll, a language caption in the top left and a copy button (icon button, 44 px) in the top right. After copying, the button label becomes "copied" for 2 s and announces it in `aria-live`. Inline code uses surface background and 2 px padding.

### Skeleton

- **skeleton**: surface-coloured bars with square corners, matching the final layout of the content (title bar, three text bars, a card frame). Container carries `aria-busy="true"`. Shown whenever data loads; never a blank screen.

### Empty state

- **empty-state**: centred text block, h3 title, one sentence of explanation, one primary or secondary action. A 48 px line icon from the set, never an illustration of people, never an emoji.

### Header

- **header** (masthead): a 64 px wordmark row (IBM Plex Sans 700, 22 px) with the language selector and account actions at the right, then the primary navigation (itineraries, test track, discussions, blog, docs) on its own ruled row, each item separated by a vertical rule, the current page marked with `aria-current` and a 2 px accent underline. Under 1024 px the navigation row collapses behind a 44 px "Menu" button and opens as a ruled list under the wordmark row. The language selector is a labelled `select` listing every supported language by its own name, never a two-state toggle.

### Footer

- **footer**: surface background, 1 px top rule, 64 px vertical padding. Two zones: the newsletter form first (label, e-mail field, language select, secondary button, inactive until the newsletter module ships), then three ruled link columns (product, community, legal) that stack with rules between them at 360 px. Footer text at 16 px, legal line at 14 px.

### Error pages

- **error-page**: h1, one sentence, primary button back to the home page, secondary link to the catalogue. The 404 and the server error share the layout and differ only in text.

## Do's and Don'ts

### Do

- Reserve the accent for the primary action, the links, the active tab and the focus ring.
- Give every screen one primary action and build the rest with secondary and ghost buttons.
- Use the status badges only for the state of an itinerary, with text that carries the meaning.
- Keep running text at 16 px and 1.6 line height, 72 characters wide on long reads.
- Load fonts from the application's own origin, with `font-display: swap`.
- Show a skeleton while loading, an empty state when there is nothing, a written error when something fails, a confirmation before anything destructive.
- Test every screen at 360 px wide and with the keyboard only before merging.
- Put every visible string in the translation files, and let components receive the list of languages from the configuration.

### Don't

- No second accent, no pastel badge set, no gradient, no glow, no glassmorphism.
- No emoji as icon, no icon above a heading as decoration, no illustrated people.
- No pure black or pure white page surface.
- No uppercase labels, no letter-spaced kickers, no numbered section eyebrows.
- No text under 14 px, no running text under 16 px.
- No shadow outside dialogs, menus and notifications.
- No motion longer than 250 ms (home page counters and tour screens excepted, see Motion), no bounce, no animated focus ring.
- No text baked into an image.
- No remote asset: no font CDN, no icon CDN, no hotlinked image.
- No em dash, anywhere, in any language.

## Responsive Behavior

| Name | Width | Key changes |
| --- | --- | --- |
| Phone | 360 to 767 px | One column, 16 px gutter, navigation behind a menu button, tables scroll, dialogs full width minus 16 px |
| Tablet | 768 to 1023 px | 24 px gutter, two-column grids for cards, inspector under the form |
| Desktop | 1024 px and up | 32 px gutter, 1120 px container, full navigation, two-column test track and catalogue |

Touch targets are 44 px minimum at every width, including table row actions and tab buttons. Hover never carries information; every hover state has a focus equivalent.

## Iteration Guide

1. Change a token here, then in the web app token stylesheet, never in a component.
2. Add a component to the Components section before building it in `apps/web/components/ui`.
3. A new colour role needs a light value, a dark value and a contrast check in this file.
4. A new page is audited with `hallmark audit` against this file before merge.
5. Skills do not append to this file. Exports or theme sections proposed by a skill are ignored.

## Known Gaps

- The country map on the home page is not specified yet; it must be an SVG with text labels rendered by the application, never an image with baked text.
- Charts in the ranking are not specified; a chart is a table first.
- Right-to-left languages are not handled; adding one requires a logical-properties pass on spacing.
