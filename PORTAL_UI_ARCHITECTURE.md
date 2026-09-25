# Portal UI Architecture

## Tool Shell

Included tool modules should follow this screen structure:

```text
sidebar | module header
        | settings pane | main work/preview pane | empty right pane
```

The module header is the only visible header row. It contains the module title/status on the left, actions on the right, and the theme toggle as the final item.

## Shared Layout Primitives

Use shared classes for the common layout:

- `.tool-shell`
- `.tool-header`
- `.tool-header-main`
- `.tool-header-title`
- `.tool-header-status`
- `.tool-header-actions`
- `.tool-body`
- `.tool-settings`
- `.tool-preview`
- `.tool-preview-scroll`
- `.tool-pages`
- `.tool-info-pane`
- `.tool-theme-slot`

Module-specific classes may remain for controls and worksheet rendering, but module containers should adopt these primitives so preview size, spacing, and sidebar collapse behavior stay consistent.

Dictionary Builder uses the same shell primitives, but its main pane contains extracted word results rather than Letter-sized worksheet pages. Its data extraction, filtering, deduping, and download behavior are outside the layout contract and should remain unchanged until the separate Dictionary Builder feature redesign.

## Page Preview Contract

- Printable pages remain actual Letter-sized DOM nodes for print.
- Screen preview scaling must not alter print geometry.
- Print media rules reset preview scaling and hide portal chrome.
- At 1920x1080, the middle pane should show one full page without relying on the right pane width.

## Seyes Contract

Seyes uses deterministic millimeter geometry. Its pagination, grid SVG, text placement, and print-window CSS are treated as protected architecture. Visual shell changes may move controls and resize the screen preview, but they must not change printed geometry.

## PDF Direction

Native `Print PDF` is the quality baseline. Direct `Export PDF` for generated non-Seyes worksheets uses a shared hidden print-layout frame, renders each Letter-sized page at high resolution, and embeds those page images into a PDF. This avoids screen-preview zoom drift while matching the validated print geometry.

The exporter must not rasterize the visible preview pane directly. It should render from the same print-layout contract used by `Print PDF`: Letter page, zero browser page margin, module print overrides, all rendered pages included, and portal chrome excluded.

Seyes remains outside direct Export PDF for now. Its trusted output path is still the dedicated print window because its 8mm grid and text placement require physical validation.

Printed and exported worksheet pages include a small top-right `Bodhana` watermark implemented as real page markup rather than a pseudo-element, so the same mark survives print windows and PDF serialization.
