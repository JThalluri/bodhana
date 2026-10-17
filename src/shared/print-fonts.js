// Return only font-face rules, keeping Seyes' dedicated geometry stylesheet isolated.
export function printFontFaces(family) {
  const faces=[];
  for(const sheet of document.styleSheets) {
    try {
      for(const rule of sheet.cssRules) {
        if(rule.type===CSSRule.FONT_FACE_RULE && rule.style.fontFamily.replaceAll(/['"]/g,'')===family) faces.push(rule.cssText);
      }
    } catch { /* Cross-origin styles are not part of the offline font contract. */ }
  }
  return `<style>${faces.join('\n')}</style>`;
}
