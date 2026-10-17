const fragments = import.meta.glob('../content/tool-info/*/content.html', { eager: true, query: '?tool-info', import: 'default' });
import.meta.glob('../content/tool-info/*/styles.css', { eager: true });
export function renderToolInfo(target, key) {
  const html = fragments[`../content/tool-info/${key}/content.html`];
  if (!html) throw new Error(`Missing guidance: ${key}`);
  const wrapper = document.createElement('div');
  wrapper.className = 'tool-info-content'; wrapper.dataset.toolInfo = key; wrapper.innerHTML = html;
  target.replaceChildren(wrapper);
  wrapper.querySelectorAll('table').forEach(table => { const scroll=document.createElement('div'); scroll.className='tool-info-table'; table.before(scroll); scroll.append(table); });
  const dialogs=[];
  wrapper.querySelectorAll('img').forEach(img => {
    const button=document.createElement('button'); button.className='tool-info-enlarge'; button.setAttribute('aria-label',`Enlarge image: ${img.alt || 'illustration'}`);
    img.before(button); button.append(img);
    button.addEventListener('click',()=>{
      const dialog=document.createElement('dialog'); dialog.className='tool-info-image-view';
      const close=document.createElement('button'); close.textContent='Close image'; close.className='btn';
      dialog.append(close,img.cloneNode()); document.body.append(dialog); dialogs.push(dialog);
      close.onclick=()=>dialog.close(); dialog.addEventListener('close',()=>dialog.remove()); dialog.showModal();
    });
  });
  return () => { dialogs.forEach(d=>d.remove()); wrapper.remove(); };
}
