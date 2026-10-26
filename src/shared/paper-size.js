/** Physical paper sizes shared by worksheet generators and output adapters. */
export const PAPER_SIZES = Object.freeze({
  letter: Object.freeze({id:'letter', label:'US Letter (8.5 x 11 in)', widthIn:8.5, heightIn:11}),
  statement: Object.freeze({id:'statement', label:'Statement (5.5 x 8.5 in)', widthIn:5.5, heightIn:8.5}),
});
export function paperSize(id='letter', landscape=false) {
  const p=PAPER_SIZES[id] || PAPER_SIZES.letter;
  const widthIn=landscape?p.heightIn:p.widthIn, heightIn=landscape?p.widthIn:p.heightIn;
  return {...p,widthIn,heightIn,widthPx:widthIn*96,heightPx:heightIn*96,widthPt:widthIn*72,heightPt:heightIn*72,cssSize:`${widthIn}in ${heightIn}in`};
}
export function paperForPage(page) {
  return paperSize(page?.dataset.paperSize, page?.matches('.award-cert-page.is-landscape') || false);
}
/** One print job has one physical stock; reject accidental mixed-size output. */
export function paperForPages(pages) {
  const p=paperForPage(pages[0]);
  if(pages.some(el=>{const q=paperForPage(el);return q.widthIn!==p.widthIn || q.heightIn!==p.heightIn;})) throw new Error('Print or export one paper size at a time.');
  return p;
}
export const paperSizeOptions = () => Object.values(PAPER_SIZES).map(p=>[p.id,p.label]);
