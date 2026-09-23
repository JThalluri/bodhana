# Portal Visual Uplift Plan

## Summary

Redesign the printable worksheet modules around one consistent shell: sidebar, one module header, fixed settings pane, fixed rendered-page preview pane, and an empty right-side pane that absorbs extra width. Dictionary Builder is excluded from this phase. Seyes is protected because its physical print geometry is part of the product behavior.

Implementation is split into subphases. After each subphase: build, visually test affected modules at 1920x1080 where possible, fix issues, and commit before moving on.

## Phase Order

1. Planning documents
2. Shared shell foundation
3. Non-Seyes printable modules
4. Seyes module
5. High-quality Export PDF

## Decisions

- Worksheet type selectors live as the first section of the settings pane.
- Generated modules use header actions in this order: Generate, Print PDF, later Export PDF, secondary actions, theme toggle last.
- Seyes is real-time and has no Generate button.
- Print PDF uses the browser native print path for best quality.
- Export PDF is a later vector-PDF subphase, not a raster DOM screenshot.
- Export PDF downloads all rendered pages when implemented.
- The right-side pane stays empty until content/instructions are designed.
- Dictionary Builder is excluded.

## Validation Checklist

- One visible header row per included module.
- Theme toggle is the last header item.
- Brand banner appears in the sidebar and hides on collapse.
- Settings pane and rendered page pane stay fixed when sidebar collapses.
- Empty right pane absorbs extra width.
- One full Letter page is visible in the middle pane at 1920x1080.
- Print output hides portal chrome and preserves page size.
- Build passes after every phase.

## Seyes Validation

- Do not change 8mm cell geometry, grid line positions, font calibration, baseline offset, top padding, left padding, row gap, print window CSS, or pagination math unless the change is explicitly for Seyes correctness.
- Confirm font size, baseline, top margin, left margin, and blank row controls still update live.
- Confirm print guidance remains available.
- Compare before/after preview and print behavior before committing Seyes changes.
