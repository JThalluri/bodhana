# Bodhana

Browser-based learning tools with portable HTML and an installable hosted PWA. No backend or accounts are required.

## Develop and verify

```powershell
npm ci
npm run dev
npm test
npm run build
npm run build:hosted
npm run audit:build
npm run test:portal
npm run package:pages
```

The portal tests use both the actual portable file and the hosted production build at the configured subpath. Build both artifacts before running them. `dist/index.html` is the portable download; `dist-hosted/` is the hosted build; `artifacts/pages-release/` is the reviewed deployment package. Build outputs and local verification evidence are ignored by Git.

The separately maintained Constructs Workbench lives in `tools/constructs-workbench/`. Its offline standalone file is intentional; regenerate it with `node tools/constructs-workbench/build-standalone.mjs`. Its browser tests use `playwright.config.js`; portal tests use `playwright.portal.config.js`.

## Documentation

- [Architecture](PORTAL_UI_ARCHITECTURE.md) and [decisions](PORTAL_UI_DECISION_LOG.md)
- [Integration guidelines](docs/BODHANA_INTEGRATION_GUIDELINES.md)
- [Guide authoring](src/content/tool-info/README.md)
- [Deployment and offline behavior](docs/DEPLOYMENT.md)
- [Local device data](docs/LOCAL_DATA.md)
- [Statement paper support and verification](docs/STATEMENT_PAPER_ROLLOUT.md)
- [Word Practice](docs/WORD_PRACTICE.md)
- [Backlog](docs/BACKLOG.md)

Superseded standalone Math, Word Finder, Fractions, Writing and Phonics prototypes and duplicated prototype topics were removed after integration. Tracked historical versions remain in Git history. Current source, fixtures, dictionaries, authoring tools and design/implementation records are retained. The original tablet/PWA plan and handoff are historical requirements; current architecture and later decisions describe the implemented behavior.

Publishing targets the separate `JThalluri/gurukool` artifact repository. Updating this source repository does not itself publish Pages. Follow the deployment guide to publish one reviewed complete release, then verify its actual HTTPS URL.
