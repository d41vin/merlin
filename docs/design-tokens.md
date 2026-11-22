# Design Tokens and Theme Contract

## 1. Contract goals

This file defines the theme contract consumed by Merlin components. It separates raw palette values from semantic roles and component styling.

Components may consume semantic tokens only. They must not consume hue-named primitives.

## 2. Three layers

### Layer A: hue primitives

Raw colors live inside each theme stylesheet and are named by hue and scale.

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
8. Themes declare permitted pairings explicitly. The validator checks all declared pairings; components must not use unlisted combinations.
9. Add unit tests for luminance and contrast calculations, including boundary cases.
10. CI must run this validator before a build is accepted.

The script may use a small dependency or a self-contained WCAG relative-luminance implementation. Prefer a deterministic implementation with tests over a browser screenshot heuristic.

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

- Every theme defines every required semantic token.
- No inheritance from another theme.
- No implicit fallback to Merlin Dark.
- Validate required tokens and contrast pairings before a theme can be applied.
- Unsupported `contractVersion` must be rejected with a clear diagnostic.
- V1 bundles Merlin Dark only.
- External theme installation is not implemented in v1, but the contract should not assume themes are permanently hardcoded into components.

## 9. Shape, elevation, and tracking

- `--radius-control` and `--radius-panel` are theme-controlled.
- `--border-width` parameterizes the inset-border elevation rule.
- Merlin Dark starts at 0.5px; a hard-rule theme may use 1px.
- `--tracking-metadata`, `--tracking-label`, `--tracking-control`, `--tracking-body`, `--tracking-section`, and `--tracking-page-title` are defined by every theme.
- Do not carry Inter's `-0.022em` tracking curve into a mono-forward theme by default.
- Fixed mono roles are defined by the design system; themes may change the mono font family but not which content roles are mono.

## 10. Runtime contract

- Apply theme via `data-theme` on the application root.
- Persist selected slug in SQLite settings.
- Validate theme availability and contract version before applying.
- Avoid a flash of an incorrect theme during startup.
- V1 has one bundled theme and no theme picker.
