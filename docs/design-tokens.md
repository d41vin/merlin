# Design Tokens and Theme Contract

## 1. Contract goals

This file defines the theme contract consumed by Merlin components. It separates raw palette values from semantic roles and component styling.

Components may consume semantic tokens only. They must not consume hue-named primitives.

## 2. Three layers

### Layer A: hue primitives

Raw colors live inside each theme manifest and generated theme stylesheet and are named by hue and scale. The manifest is the editable source of truth; committed CSS is generated from it.

Merlin Dark examples:
- `--primitive-grey-950`
- `--primitive-grey-900`
- `--primitive-grey-850`
- `--primitive-grey-800`
- `--primitive-grey-700`
- `--primitive-grey-600`
- `--primitive-grey-500`
- `--primitive-grey-400`
- `--primitive-grey-300`
- `--primitive-grey-200`
- `--primitive-grey-100`
- `--primitive-rust-500`
- `--primitive-rust-400`
- `--primitive-slate-500`
- `--primitive-green-500`
- `--primitive-amber-500`
- `--primitive-red-500`

A future Teenage Engineering-inspired theme may use `--primitive-cream-*`, `--primitive-black-*`, and `--primitive-orange-500`. Do not name any primitive `--primitive-accent`; accent is a semantic role, while primitives describe actual hues.

### Layer B: semantic tokens

Required semantic token inventory:

```css
/* Surfaces */
--bg-canvas;
--bg-surface-1;
--bg-surface-2;
--bg-surface-3;
--bg-hover;
--bg-selected;
--bg-active;

/* Borders and focus */
--border-hairline;
--border-strong;
--border-focus;
--border-width;

/* Text */
--text-primary;
--text-secondary;
--text-tertiary;
--text-disabled;
--text-link;
--text-inverse;

/* Accent and controls */
--accent;
--accent-hover;
--on-accent;

/* Status */
--success;
--warning;
--danger;
--on-danger;

/* Selection and overlays */
--selection-background;
--selection-foreground;
--overlay-backdrop;
--shadow-popover;

/* Shape and typography */
--radius-control;
--radius-panel;
--font-ui;
--font-mono;

/* Typography tracking: each theme defines each role */
--tracking-metadata;
--tracking-label;
--tracking-control;
--tracking-body;
--tracking-section;
--tracking-page-title;
```

If an additional semantic token is required by a component, add it to this contract and document its permitted use. Do not bypass the contract with a literal value.

Every semantic color in a manifest must directly reference a hue primitive, for example `--bg-canvas: var(--primitive-grey-950)`. The validator resolves these aliases for contrast calculations. Overlay colors and the single popover-shadow color also use hue primitives. Radii, border width, font families, and tracking remain theme-owned semantic values.

Density token names are also registered centrally, but density values are intentionally separate from themes. `src/styles/density.css` defines every token under both `:root[data-density="default"]` and `:root[data-density="compact"]`:
- `--row-height`: 32px default, 28px compact; this is the normal row/control role.
- `--control-height-small`: 28px in both densities.
- `--panel-padding`: 8px in both densities.
- `--section-padding`: 16px in both densities.
- `--table-header-height`: 28px in both densities.
- `--sidebar-item-height`: 28px in both densities; this token alone does not implement the later sidebar.
- `--active-indicator-width`: 2px in both densities.

Fixed typography sizes/line heights are centralized in `src/styles/typography.css`. Themes own font families and tracking but do not choose which roles are monospaced.

### Layer C: component styles

Component styles use semantic roles only.

Example:

```css
.merlin-button {
  color: var(--on-accent);
  background: var(--accent);
  border-radius: var(--radius-control);
  font-family: var(--font-ui);
  border: var(--border-width) solid var(--border-hairline);
}

.merlin-link {
  color: var(--text-link);
}
```

A component must not reference `--primitive-rust-500`, `#c4622d`, a literal font family, or a hardcoded radius.

## 3. Linear reference mapping: two-hop rule

Translate each retained Linear reference value through a hue-named primitive and then to a semantic role. The mapping is conceptual; do not preserve Linear names as Merlin tokens.

| Linear reference token/role | Merlin hue primitive | Merlin semantic role |
|---|---|---|
| `--color-void` | `--primitive-grey-950` | `--bg-canvas` |
| darkest panel surface | `--primitive-grey-900` | `--bg-surface-1` |
| secondary panel surface | `--primitive-grey-850` | `--bg-surface-2` |
| elevated panel surface | `--primitive-grey-800` | `--bg-surface-3` |
| `--color-bone` used as surface | appropriate `--primitive-grey-*` | relevant `--bg-surface-*` |
| `--color-bone` used as text | appropriate light `--primitive-grey-*` | relevant `--text-secondary` or other text role |
| `--color-paper` | appropriate light `--primitive-grey-*` | `--text-primary` |
| Linear acid-lime accent | `--primitive-rust-500` | `--accent` |
| Linear accent hover | `--primitive-rust-400` | `--accent-hover` |
| Linear muted tag color | `--primitive-slate-500` | semantic tag role if needed |
| Linear success color | `--primitive-green-500` | `--success` |
| Linear warning color | `--primitive-amber-500` | `--warning` |
| Linear danger color | `--primitive-red-500` | `--danger` |
| Linear font family | theme's UI primitive/font asset | `--font-ui` |
| Linear mono font | theme's mono primitive/font asset | `--font-mono` |
| Linear radius values | theme-defined shape values | `--radius-control`, `--radius-panel` |
| Linear tracking curve | theme-defined per-role values | `--tracking-*` |
| Linear subtle shadow/border | theme surface/border primitives | `--border-hairline`, `--border-width` |

Important:
- `--color-bone` has two different semantic jobs in the reference. Split those jobs; do not map one primitive to both surface and text without explicit semantic intent.
- `--color-paper` maps to `--text-primary`; it is not discarded.
- Do not retain Linear brand colors as Merlin identity colors.
- Remove marketing layout values such as hero max-width, promotional section spacing, and marketing card padding. Use application layout rules from `UX-SPEC.md`.

## 4. Merlin Dark initial primitive candidates

The following are initial design inputs, not permission to hardcode values in components:

```css
--primitive-rust-500: #c4622d;
--primitive-rust-400: #d97742;
--primitive-slate-500: #6b7f96;
--primitive-ink-950: #08090a;
```

The grey/ink surface ramp and text ramp should be finalized in the theme stylesheet using the retained Refero values where appropriate. Keep raw values inside the theme file.

The on-accent candidate is `#08090a`. Validate it against the actual accent fill. Do not assume a contrast ratio without running the validator.

## 5. Accent usage rules

- Rust is the semantic UI accent in Merlin Dark.
- Rust is not a text/link color.
- Rust may be used for filled controls, selected indicators, borders, and other UI accents only when the relevant surface pairing meets 3:1.
- Foreground text on a Rust fill must meet 4.5:1. Use `--on-accent` only if it passes.
- Text links use `--text-link`, independently validated at 4.5:1 against every surface on which links may appear.
- Hover colors are validated independently.
- If a future theme uses a different hue (for example orange), map it to the same semantic `--accent` role.

## 6. Contrast validation

Add a deterministic contrast-validation script and run it in CI and local verification.

Requirements:
1. Load every bundled theme's semantic token values.
2. Validate every declared text/surface pairing at 4.5:1 minimum.
3. Validate every declared UI accent/adjacent-surface pairing at 3:1 minimum.
4. Validate foreground-on-filled-control pairs (including `--on-accent`/`--accent` and `--on-danger`/`--danger`) at 4.5:1 minimum when the fill carries text.
5. Validate focus indicators and selected/meaningful graphical indicators against adjacent surfaces at 3:1.
6. Fail with a non-zero exit code and a readable report naming theme, token pair, measured ratio, and required ratio.
7. Do not silently skip an invalid or missing required token.
8. The shared contract declares mandatory pairings for every common component state. Each theme must declare every mandatory pairing plus any additional permitted pairings; an empty pair/surfaces list, duplicate pair, unknown token, or omitted required pair fails validation.
9. Components must not use unlisted combinations. Required coverage includes actual hover, pressed, selected, disabled, status-text, meaningful-boundary, and focus-adjacency states, not a fixed pair count.
10. Status success/warning/danger tokens are independently validated at 4.5:1 for text usage and 3:1 for meaningful graphical usage.
11. Decorative surface hairlines are not silently treated as meaningful control boundaries. Controls and resize handles use validated strong indicators.
12. Ordinary pair calculations require opaque #RRGGBB colors after primitive-alias resolution. Alpha or composited pair colors must not be silently accepted as opaque.
13. Add unit tests for luminance and contrast calculations, including boundary cases.
14. CI and every local frontend build must run this validator before the build is accepted.

The implementation uses the self-contained WCAG relative-luminance implementation in `src/themes/contract.ts`, shared by runtime application, Vitest, Node validation, and CSS generation. `pnpm test:contrast` validates every discovered manifest, generated CSS, runtime registry agreement, density definitions, and static startup markers. `pnpm test:themes` additionally runs the scoped production token-usage audit. `pnpm generate:themes` explicitly regenerates committed CSS after manifest edits; ordinary validation is read-only.

Example report:

```text
FAIL Merlin Dark: --text-link on --bg-surface-3 = 4.12:1 (requires 4.5:1)
FAIL Merlin Dark: --accent on --bg-surface-3 = 2.81:1 (requires 3:1)
Theme contrast validation failed: 2 violations
```

## 7. Theme manifest

Each theme provides:
- `slug`: stable identifier
- `displayName`: user-facing name
- `mode`: exactly `light` or `dark`
- `swatch`: representative color
- `contractVersion`: supported theme contract version

`mode` must set `color-scheme` on the theme root:

```css
[data-theme="merlin-dark"] {
  color-scheme: dark;
}
```

A future light theme:

```css
[data-theme="example-light"] {
  color-scheme: light;
}
```

This controls native form controls, scrollbars, and selection defaults. Explicit selection tokens may further customize text selection.

## 8. Theme completeness and versioning

- Every theme defines every required semantic token and no undeclared semantic token.
- Manifest top-level fields, primitive names/values, direct aliases, value categories, pair shapes, and pair coverage are strict and fail closed with readable diagnostics. Font stacks support conservative quoted/unquoted family lists and reject malformed quoting, controls, unquoted CSS-wide/`default` keywords, and CSS declaration/rule delimiters. Runtime errors use stable diagnostics without reflecting arbitrary manifest values.
- No inheritance from another theme.
- No implicit fallback to Merlin Dark.
- Validate required tokens and contrast pairings before a theme can be applied; invalid or unavailable themes cannot mutate the root.
- Unsupported `contractVersion` must be rejected with a clear diagnostic.
- Node tooling discovers every `src/themes/*.tokens.json`; runtime uses a static bundled-only registry. Tests require the two slug sets to match and reject duplicates.
- Generated CSS must match `scripts/theme-css.mjs` output byte-for-byte, including `[data-theme="<slug>"]` and `color-scheme` equal to the manifest mode. `.gitattributes` forces LF checkout for generated theme CSS and `density.css`; CRLF working copies receive an explicit line-ending drift diagnostic rather than weakening byte-exact comparison.
- Default and compact density objects independently require exactly the same seven tokens with valid lengths. Generation rejects missing, extra, or malformed values; tests also pin every approved value in both modes.
- V1 bundles Merlin Dark only.
- External theme installation is not implemented in v1, but the contract should not assume themes are permanently hardcoded into components.

## 9. Shape, elevation, and tracking

- `--radius-control` and `--radius-panel` are theme-controlled.
- `--border-width` parameterizes the inset-border elevation rule.
- Merlin Dark starts at 0.5px; a hard-rule theme may use 1px.
- `--tracking-metadata`, `--tracking-label`, `--tracking-control`, `--tracking-body`, `--tracking-section`, and `--tracking-page-title` are defined by every theme.
- Do not carry Inter's `-0.022em` tracking curve into a mono-forward theme by default.
- Fixed mono roles are defined by the design system; themes may change the mono font family but not which content roles are mono.

## 10. Scoped production token audit

`scripts/validate-token-usage.mjs` scans production CSS, TS, and TSX under `src/`, excluding `src/themes/`, tests/specifications, `src/test/`, fixture directories, and `src/markdown/fixtures.ts`. Generated theme CSS is covered by the separate generated-output contract, and build artifacts/docs/Markdown/native code are outside its scope.

The scanner:
- Builds its semantic and density allowlist from `src/themes/contract.ts`.
- Rejects primitive references outside the theme layer and undeclared component-level variables.
- Rejects unregistered `var(--token)` consumers.
- Rejects raw hex, functional, and standard named colors in covered source; variant-prefixed and arbitrary/named Tailwind palette colors; named colors in common CSS color shorthands, direct quoted JSX style values, and covered SVG presentation attributes; and literal `font-family`/JSX `fontFamily` values.
- Reports the offending capture's one-based `file:line:column`, with LF and CRLF fixtures covering equivalent locations.
- Has no general suppression mechanism; new legitimate tokens must be added to the documented contract.
- Uses in-memory positive and negative tests plus a real production-source integration scan.

This is deliberately a lightweight lexical guardrail. Direct quoted JSX styles are limited to the inventoried properties; computed values, template literals, style spreads, dynamic class/color construction, arbitrary runtime DOM mutation, and third-party injected style require review and browser tests. CSS `font` shorthand and color-bearing syntax outside the inventoried declarations/attributes are not exhaustively audited. Cascade/inheritance, opacity/compositing, novel syntax, and unusual strings/comments can also evade detection or produce false positives. The scanner does not claim to catch all dynamic or runtime styling and does not replace contrast calculations, computed-browser tests, accessibility tests, or code review.

## 11. Runtime contract

- Apply theme via `data-theme` on the application root.
- Persist selected slug in SQLite settings.
- Validate theme availability and contract version before applying.
- Static HTML supplies `data-theme="merlin-dark"`, `data-density="default"`, and dark color-scheme metadata before rendering. Defaults are applied synchronously before the first React render.
- Persisted compact density may be applied after native settings load; this asynchronous density transition is accepted for Milestone 3. It does not authorize browser persistence, blocking startup IPC, new commands, migrations, or keys.
- V1 has one bundled theme and no theme picker, so valid persisted settings cannot switch the initial theme to another slug.
- Future multiple-theme pre-paint restoration would require a separate approved native/bootstrap decision; localStorage is not a solution.
