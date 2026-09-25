# Bodhana Prototype Guidelines

Use this guide when building worksheet prototypes outside the Bodhana repo. The goal is not to recreate the full portal, but to make prototypes and specs close enough that approved worksheet types can be integrated without redesigning layout, print behavior, or control structure.

## Product Shape

Bodhana is a worksheet-building portal for teachers and students. Prototype the actual usable worksheet generator, not a landing page or marketing page.

Primary target for this phase:

- Desktop viewport: 1920 x 1080.
- Paper: US Letter portrait, 8.5 in x 11 in.
- Workflow: apply settings, generate worksheet, inspect, print or export.
- Screen preview should match printed/exported output as closely as possible.

## Standard Tool Layout

Prototype worksheet modules with this mental model:

```text
sidebar | single module header
        | settings pane | worksheet preview pane | empty content pane
```

Keep these rules:

- Use only one visible module header row.
- Put worksheet type/category selection as the first section in the settings pane.
- Put worksheet settings below the type selector, grouped into short sections.
- Keep worksheet actions visually aligned to the worksheet preview pane, not the far right static pane.
- Keep the theme switch as the final header item, separated from worksheet actions.
- The right-side content pane is reserved for later static help content; leave it empty in prototypes unless explicitly requested.

Recommended header action layout:

```text
[Generate] [Print] [Export] | [Reset] |                         | [theme pill]
```

For real-time modules such as Seyes/French ruled writing worksheets, omit `Generate` and update the preview live.

## Settings Pane

Use a quiet, utilitarian settings panel. Avoid large cards, oversized headings, marketing copy, or decorative layouts.

Recommended section order:

1. Worksheet type/category.
2. Core generation settings.
3. Layout settings.
4. Appearance settings.
5. Answers/solution settings.
6. Reproducibility settings such as random seed.

Use familiar controls:

- Dropdowns for worksheet type, difficulty, preset, font size, count choices, and option sets.
- Numeric inputs for counts and ranges.
- Toggles or checkboxes for binary options.
- Buttons only for clear commands.

Prefer short labels that match teacher intent, such as `Questions per worksheet`, `Puzzles per page`, `Show solutions`, `Empty lines`, and `Random seed`.

## Page And Print Geometry

Every worksheet page should be designed as an exact US Letter page.

Use this model:

```css
@page {
  size: Letter;
  margin: 0;
}

.worksheet-page {
  width: 8.5in;
  height: 11in;
  box-sizing: border-box;
  background: white;
  color: black;
  overflow: hidden;
}
```

The browser page margin is zero. Internal worksheet margins belong inside the page element. For most worksheet types, keep internal margins at `0.4in` or less unless the design has a specific reason.

Important:

- Anchor worksheet content from the top-left inside the printable content area.
- Do not rely on browser default body margins.
- Do not use CSS transforms to size printable content.
- Do not hide overflow problems by clipping the page in the prototype.
- Do not rasterize text-heavy worksheets as images.
- Validate that the full right edge prints and exports without truncation.

## Visual Style

The portal shell is dark and restrained. The worksheet page itself remains white.

Use:

- Dark workspace background around the page.
- White US Letter page.
- Burnt orange for primary actions.
- Blue/neutral form controls.
- Compact, scannable settings sections.
- 8px or smaller card radius for repeated worksheet elements unless a module already has a stronger convention.

Avoid:

- Decorative gradients, blobs, bokeh, or overly branded backgrounds.
- Extra topbars or duplicate headers.
- Huge hero text or page sections.
- One-off color palettes.
- Prototype-only control locations that would not fit the shared shell.

## Typography

Use Bodhana-friendly fonts in prototypes:

- UI text: `Nunito`, system sans-serif fallback.
- Most student-facing worksheet text: `Andika` when readability matters.
- Sudoku: default to `Andika`; do not expose a font selector.
- Seyes/French ruled writing: treat font size, baseline, grid spacing, and margins as physical geometry, not decoration.

If you use custom fonts in a prototype, list them in the spec and explain why they are necessary.

## Branding

Printed and exported worksheet pages include a small `Bodhana` text watermark at the top-right corner. In prototypes, reserve space for it and avoid placing important worksheet content in the top-right corner.

Recommended behavior:

- Watermark appears on every worksheet page.
- It must not affect pagination or worksheet layout.
- It should be visually subtle.

## Print And Export Expectations

Bodhana has two output paths:

- `Print`: native browser print flow, the trusted quality path.
- `Export`: direct PDF download for supported generated worksheets.

Prototype specs should describe how the worksheet should appear on paper, not how to implement a custom PDF engine. Integration agents will use Bodhana's shared print/export utilities.

## Prototype Deliverables

When a prototype is ready for integration, provide:

- A runnable HTML prototype.
- A worksheet spec with all controls, defaults, ranges, and validation rules.
- Generated data model or state shape.
- Rendering rules for each worksheet type and solution mode.
- Pagination rules.
- Print/export expectations.
- Edge cases and limits.
- Screenshots at 1920 x 1080.
- Print preview screenshots for representative settings.

For worksheet families, include examples for small, medium, and dense content.

## Seyes/French Ruled Worksheet Caution

Seyes is a protected physical worksheet type. Its value depends on exact paper geometry:

- 8 mm cells.
- Line positions.
- Font calibration.
- Baseline offset.
- Left and top margins.
- Row gaps.
- Browser print settings.

Do not generalize Seyes print behavior from other modules. Treat any Seyes prototype as a separate physical validation task.

## Prototype Checklist

Before handing a prototype to Bodhana integration agents:

- The page is US Letter portrait.
- Only one module header row is visible.
- Worksheet type selection is in the settings pane.
- Header actions follow `Generate`, `Print`, `Export`, `Reset`, theme.
- One full page can be inspected at 1920 x 1080.
- Print preview has consistent margins and no right-edge truncation.
- Dense examples still fit or paginate intentionally.
- The top-right watermark area is reserved.
- The spec calls out any behavior that differs from the shared Bodhana shell.
