# Lifegate Workspace

Internal ministry workspace app built with React + Vite.

## Local Development

### Prerequisites
- Node.js 20.x (see `.nvmrc`)
- npm 10+

### Run
```bash
nvm use
npm ci
npm run dev
```

### Build Check
```bash
npm run verify-deploy
```

## Deployment (EpicGlobal / Vercel-like)

Use these project settings:

- Repository URL: `https://github.com/lifegateportal/lifegate-workspace.git`
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Node version: `20`

### SPA Rewrite (Required)

Deep links must rewrite to `index.html`.

- Source: `/*`
- Destination: `/index.html`

`vercel.json` is included with this rewrite for Vercel-compatible platforms.

## Environment Variables

Set all required `VITE_` variables in the platform project settings.

Use `.env.example` as the source of truth.

## Troubleshooting Deploy Clones

If clone fails with `could not read Username for 'https://github.com'`:

1. Ensure EpicGlobal has GitHub credentials configured for this repo.
2. If using HTTPS auth, use a GitHub PAT with repository read access.
3. If using org SSO, ensure token/app is authorized for the org.