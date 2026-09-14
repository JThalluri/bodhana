/**
 * Seyès (French ruled) grid, drawn as vector geometry.
 *
 * Previously the grid was three CSS `repeating-linear-gradient` layers. That
 * looked right but intermittently dropped a minor rule: the browser rasterises
 * each gradient into a tile and then repeats the bitmap, and since the rules
 * sit at fractional device pixels (2mm = 7.559px at 96dpi, 8mm = 30.236px) the
 * per-tile rounding error accumulates until one rule lands on the same pixel
 * row as its neighbour and disappears. It showed up as a missing 2nd minor
 * line in the 3rd block, 1st in the 6th, 2nd in the 19th, and so on.
 *
 * Emitting one <line> per rule removes the repeat step entirely, so every rule
 * is positioned independently and none can be rounded away. It also prints as
 * true vector at the printer's native resolution instead of an upscaled tile.
 */

// US Letter in millimetres — matches the 8.5in x 11in page.
export const PAGE_W_MM = 215.9;
export const PAGE_H_MM = 279.4;

const BLOCK_MM = 8;   // Seyès major block height / vertical rule spacing
const MINOR_MM = 2;   // minor rule spacing within a block
const TOP_MM   = 8;   // first major rule sits one block down, as before

const COL_VERT  = '#5a8fbd';
const COL_MAJOR = '#2c5f94';
const COL_MINOR = '#6b9ec8';

/**
 * @returns {string} inline SVG markup filling its container.
 */
export function seyesGridSVG(w = PAGE_W_MM, h = PAGE_H_MM) {
  const parts = [];

  // Vertical rules
  for (let x = 0; x <= w + 0.001; x += BLOCK_MM) {
    parts.push(
      `<line x1="${+x.toFixed(3)}" y1="0" x2="${+x.toFixed(3)}" y2="${h}" stroke="${COL_VERT}" stroke-width="0.4"/>`);
  }

  // Horizontal rules: one major per block, with three minors inside it
  for (let y = TOP_MM; y <= h + 0.001; y += BLOCK_MM) {
    parts.push(
      `<line x1="0" y1="${+y.toFixed(3)}" x2="${w}" y2="${+y.toFixed(3)}" stroke="${COL_MAJOR}" stroke-width="0.6"/>`);

    for (let k = 1; k < BLOCK_MM / MINOR_MM; k++) {
      const my = y + k * MINOR_MM;
      if (my > h) break;
      parts.push(
        `<line x1="0" y1="${+my.toFixed(3)}" x2="${w}" y2="${+my.toFixed(3)}" stroke="${COL_MINOR}" stroke-width="0.3"/>`);
    }
  }

  return `<svg class="seyes-grid-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" `
       + `xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">`
       + parts.join('')
       + `</svg>`;
}
