const _cache = new Map();

export async function fetchWiktionaryDefinition(word, { signal } = {}) {
  if (_cache.has(word)) return _cache.get(word);

  const url =
    `https://en.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(word)}` +
    `&prop=revisions&rvprop=content&rvslots=main&formatversion=2&format=json&origin=*`;

  const res = await fetch(url, { signal });
  const data = await res.json();

  const page = data?.query?.pages?.[0];
  if (!page || page.missing || !page.revisions?.length) {
    _cache.set(word, null);
    return null;
  }

  const rawText = page.revisions[0]?.slots?.main?.content;
  if (!rawText) {
    _cache.set(word, null);
    return null;
  }

  const snippet = extractDefinitionSnippet(rawText);
  const result = snippet
    ? { word, snippet, sourceUrl: `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}` }
    : null;

  _cache.set(word, result);
  return result;
}

export function extractDefinitionSnippet(rawText) {
  const enIdx = rawText.search(/==\s*English\s*==/i);
  const text = enIdx >= 0 ? rawText.slice(enIdx) : rawText;

  // Limit scope to just the English section (stop at next top-level ==Foo==)
  const afterHeader = text.slice(text.indexOf('\n') + 1);
  const nextTopIdx = afterHeader.search(/\n==[^=]/);
  const section = nextTopIdx >= 0 ? afterHeader.slice(0, nextTopIdx) : afterHeader;

  const defLines = section
    .split('\n')
    .filter(l => /^#[^#:*]/.test(l))
    .map(l => l.replace(/^#+\s*/, ''))
    .map(stripWikiMarkup)
    .filter(l => l.length > 0);

  return defLines[0] ?? null;
}

function stripWikiMarkup(text) {
  let t = text;
  let prev;
  // Remove templates iteratively to handle nesting
  do { prev = t; t = t.replace(/\{\{[^{}]*\}\}/g, ''); } while (t !== prev);
  // [[link|display]] → display, [[link]] → link
  t = t.replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1');
  // Strip bold/italic markers
  t = t.replace(/'{2,}/g, '');
  return t.replace(/\s+/g, ' ').trim();
}
