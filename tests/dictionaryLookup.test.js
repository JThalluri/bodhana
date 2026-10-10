import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWiktionaryDefinition, extractDefinitionSnippet } from '../src/shared/dictionaryLookup.js';

// ── extractDefinitionSnippet unit tests ──────────────────────────────────────

describe('extractDefinitionSnippet', () => {
  it('extracts first definition from English section', () => {
    const wikitext = `
==English==
===Interjection===
# A [[greeting]] (salutation) said when meeting someone.
# {{label|en|informal}} Used when answering the telephone.
`;
    expect(extractDefinitionSnippet(wikitext)).toBe(
      'A greeting (salutation) said when meeting someone.'
    );
  });

  it('strips templates from definition lines', () => {
    const wikitext = `
==English==
===Adjective===
# {{lb|en|informal}} Having [[beauty]]; very [[attractive]].
`;
    const result = extractDefinitionSnippet(wikitext);
    expect(result).toBeTruthy();
    expect(result).not.toContain('{{');
    expect(result).not.toContain('}}');
  });

  it('strips [[link|display]] markup leaving display text', () => {
    const wikitext = `
==English==
===Noun===
# A [[domestic animal|pet]] kept in the [[home|house]].
`;
    const result = extractDefinitionSnippet(wikitext);
    expect(result).toContain('pet');
    expect(result).toContain('house');
    expect(result).not.toContain('[[');
  });

  it('strips [[bare link]] markup leaving link text', () => {
    const wikitext = `
==English==
===Noun===
# A [[greeting]] used informally.
`;
    const result = extractDefinitionSnippet(wikitext);
    expect(result).toContain('greeting');
    expect(result).not.toContain('[[');
  });

  it('stops at the next top-level section after English', () => {
    const wikitext = `
==English==
===Noun===
# An English definition.

==French==
===Noun===
# Une définition française.
`;
    expect(extractDefinitionSnippet(wikitext)).toBe('An English definition.');
  });

  it('falls back to entire text if no English section', () => {
    const wikitext = `
===Noun===
# A definition without language section.
`;
    expect(extractDefinitionSnippet(wikitext)).toBeTruthy();
  });

  it('returns null if no definition lines exist', () => {
    const wikitext = `
==English==
===Pronunciation===
* IPA: /hɛˈloʊ/
===References===
* Some reference
`;
    expect(extractDefinitionSnippet(wikitext)).toBeNull();
  });
});

// ── fetchWiktionaryDefinition unit tests ─────────────────────────────────────

describe('fetchWiktionaryDefinition', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // Clear the module-level cache between tests by re-importing would require
    // module isolation — instead we test different words per case
  });

  function mockFetch(pages) {
    fetch.mockResolvedValue({
      json: async () => ({
        batchcomplete: true,
        query: { pages },
      }),
    });
  }

  it('returns a result with snippet and sourceUrl for a found word', async () => {
    mockFetch([{
      pageid: 1,
      ns: 0,
      title: 'testword1',
      revisions: [{
        slots: {
          main: {
            content: `==English==\n===Noun===\n# A [[test]] [[word]].\n`,
          },
        },
      }],
    }]);

    const result = await fetchWiktionaryDefinition('testword1');
    expect(result).not.toBeNull();
    expect(result.word).toBe('testword1');
    expect(result.snippet).toBeTruthy();
    expect(result.sourceUrl).toContain('wiktionary.org');
    expect(result.sourceUrl).toContain('testword1');
  });

  it('returns null when page.missing is true (formatversion=2 array)', async () => {
    mockFetch([{
      ns: 0,
      title: 'testword2',
      missing: true,
    }]);

    const result = await fetchWiktionaryDefinition('testword2');
    expect(result).toBeNull();
  });

  it('returns null when pages array is empty', async () => {
    mockFetch([]);

    const result = await fetchWiktionaryDefinition('testword3');
    expect(result).toBeNull();
  });

  it('returns null when revisions is empty', async () => {
    mockFetch([{
      pageid: 2,
      ns: 0,
      title: 'testword4',
      revisions: [],
    }]);

    const result = await fetchWiktionaryDefinition('testword4');
    expect(result).toBeNull();
  });

  it('accesses pages as array (not object) — formatversion=2 behavior', async () => {
    // The old bug accessed pages.missing on the array itself.
    // This test ensures we use pages[0], not pages.missing.
    const pages = [{
      pageid: 3,
      ns: 0,
      title: 'testword5',
      revisions: [{
        slots: { main: { content: '==English==\n===Noun===\n# Something.\n' } },
      }],
    }];
    // Verify pages is an array (as formatversion=2 returns)
    expect(Array.isArray(pages)).toBe(true);
    // pages.missing would be undefined on the array — the bug would treat it as "not missing"
    // but then fail to find revisions on the array object
    mockFetch(pages);
    const result = await fetchWiktionaryDefinition('testword5');
    expect(result).not.toBeNull();
    expect(result.snippet).toBeTruthy();
  });

  it('propagates AbortError without caching', async () => {
    const controller = new AbortController();
    fetch.mockRejectedValue(Object.assign(new Error('The user aborted a request.'), { name: 'AbortError' }));
    await expect(fetchWiktionaryDefinition('testword6', { signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' });
  });
});
