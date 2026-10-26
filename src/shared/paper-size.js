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
  const orientation = page?.dataset.paperOrientation;
  return paperSize(page?.dataset.paperSize, orientation ? orientation === 'landscape' : page?.matches('.award-cert-page.is-landscape') || false);
}
/** One print job has one physical stock; reject accidental mixed-size output. */
export function paperForPages(pages) {
  const p=paperForPage(pages[0]);
  if(pages.some(el=>{const q=paperForPage(el);return q.widthIn!==p.widthIn || q.heightIn!==p.heightIn;})) throw new Error('Print or export one paper size at a time.');
  return p;
}
export const paperSizeOptions = () => Object.values(PAPER_SIZES).map(p=>[p.id,p.label]);

/** Shared native stock selector. Keep IDs stable for device preferences. */
export function paperSizeControl(id, note='') {
  return '<div class="paper-size-field"><label for="'+id+'">Paper size</label><select class="tb-select" data-paper-size-select id="'+id+'">'+paperSizeOptions().map(([v,label])=>'<option value="'+v+'">'+label+'</option>').join('')+'</select><p class="paper-size-note" role="status">'+note+'</p></div>';
}
export function applyPaperSize(page, id, landscape=false) {
  const p=paperSize(id,landscape);page.dataset.paperSize=p.id;
  page.dataset.paperOrientation=landscape?'landscape':'portrait';
  for(const key of ['width','minWidth'])page.style[key]=p.widthIn+'in';
  for(const key of ['height','minHeight'])page.style[key]=p.heightIn+'in';
  return page;
}
