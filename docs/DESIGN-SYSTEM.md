# Merlin Design System

## 1. Purpose

The design system translates a restrained, dense developer-tool visual language into Merlin's own identity. The Refero Linear reference is inspiration for product surfaces and visual restraint, not a source of Linear branding or a requirement to clone its marketing layout.

Merlin's UI is an application, not a landing page. Do not carry over marketing hero sections, promotional card layouts, marketing navigation, or landing-page max-width rules.

## 2. Principles

- Border-first, surface-led hierarchy.
- Dense but readable.
- Minimal chromatic use.
- No gradients, ambient glows, or decorative shadow stacks.
- Semantic roles instead of component-specific hex values.
- Themes may change visual language without changing information architecture.
- Accessibility requirements are enforced, not treated as optional polish.

## 3. Merlin Dark identity

Default theme:
- Canvas: near-black graphite.
- Surface ladder: progressively lighter neutral surfaces.
- Text: neutral ink ramp.
- Accent: Rust.
- Supporting tags: muted slate.
- No Linear acid-lime, signal-teal, iris-violet, or lavender identity colors.

Initial Rust values:
- `--primitive-rust-500: #c4622d`
- Hover candidate: `#d97742`
- On-accent candidate: `#08090a`
- Supporting tag candidate: `#6b7f96`

These values are primitives, not component-facing variables. Semantic mappings belong in `design-tokens.md`.

Rust has approximately 3.75:1 contrast against `--surface-3` in the proposed palette. It must therefore not be used as text on that surface. In Merlin Dark, accent is a UI fill/indicator/border treatment, not a text/link color. Text links use a separately validated semantic text-link role.

## 4. Typography

- Inter is the initial UI font candidate.
- A mono font is reserved for fixed roles: code, identifiers, numeric values, resource balances, timestamps where useful, and technical metadata.
- Do not allow each theme to arbitrarily change which content is monospaced. Theme may supply the mono family, but mono usage roles remain fixed.
- Reading-heavy Markdown uses a more comfortable reading measure and typography than compact application chrome.
- Page title 20px; section title 15px; controls/body 13px; labels 12px; metadata 11px.
- Weight range is restrained; avoid bold-heavy hierarchy.
- Each theme defines tracking per typography size/role. Do not inherit Inter-specific letter-spacing into a mono-forward theme.

## 5. Density and layout

- Default row: 32px; compact row: 28px.
- Sidebar: 240px default, resizable within 200–320px.
- Sidebar items: 28px.
- Active sidebar indicator: 2px.
- Inner panel padding: 8px.
- Section padding: 16px.
- Sticky table header: 28px where appropriate.
- Keep density and layout preferences separate from theme selection.

## 6. Surfaces and elevation

Use a semantic surface ladder. Adjacent surfaces are distinguished through surface tokens and a theme-parameterized inset border.

Default rule:
- Apply an inset border using `--border-width` and `--border-hairline`.
- Merlin Dark sets `--border-width: 0.5px`.
- A future industrial theme may set `--border-width: 1px` for hard rules.
- The border is the default surface-definition mechanism.

Do not add decorative outer shadows, ambient glows, gradients, or stacked shadow effects to simulate elevation. A theme may define a restrained `--shadow-popover` for floating menus, popovers, and dialogs where separation is necessary. Such shadows are exceptional, not the normal elevation model.

Verify 0.5px rendering at Windows display scaling and device pixel ratios. If it becomes inconsistent, adjust the theme token or use a documented border exception; do not silently replace the system with arbitrary shadows.

## 7. Interaction states

The theme contract includes semantic roles for:
- Hover
- Selected
- Active/pressed
- Focus
- Disabled
- Text selection
- Overlay backdrop
- Success, warning, and danger
- Destructive foreground/background

Focus:
- 2px focus ring.
- 2px offset.
- Focus-visible only.
- Use `--border-focus` and ensure contrast against surrounding surfaces.
- Provide a fallback treatment if accent color cannot meet the UI contrast requirement.

## 8. Theme architecture

Three layers:
1. **Hue primitives:** raw palette values, e.g. `--primitive-grey-950`, `--primitive-rust-500`, `--primitive-orange-500`.
2. **Semantic tokens:** roles such as `--bg-canvas`, `--text-primary`, `--accent`, and `--border-hairline`.
3. **Component styles:** consume semantic tokens only.

Components must not reference hue primitives directly and must not hardcode theme-specific colors, radii, font families, shadows, or border widths.

Themes are self-contained. Every theme defines the complete semantic contract. No inheritance or implicit fallback from Merlin Dark.

## 9. Theme mode and runtime

Theme manifest fields:
- `slug`
- `displayName`
- `mode` (`light` or `dark`)
- `swatch`
- `contractVersion`

`mode` maps directly to CSS `color-scheme` on the theme root. This allows native scrollbars, form controls, and text selection behavior to follow the active theme.

Themes are applied through a root `data-theme` attribute. The selected theme slug is stored in Merlin settings. Validate that the theme exists and its contract version is supported before applying it.

V1 ships Merlin Dark only. Do not build a theme picker or external theme installer yet. The contract is shaped so future bundled themes can be added. External theme loading is not part of v1.

## 10. Contrast policy

- Normal text: minimum 4.5:1 against every permitted surface.
- UI components and meaningful graphical indicators: minimum 3:1 against adjacent surfaces.
- Text on filled controls: minimum 4.5:1 between foreground and fill.
- Do not use the Rust accent as text where it fails.
- Each theme declares permitted token pairings. The CI validator checks every declared pairing.
- Theme validation failure must fail the build.

See `design-tokens.md` for the token contract and validation requirements.

## 11. Component implementation

- Standard controls: shadcn/ui with Base UI.
- Complex interaction behavior: Vercel UI SDK.
- Simple elements: native HTML/CSS.
- No two libraries should own the same interaction primitive.
- Components use semantic tokens and component-level variants; avoid one-off styling.
