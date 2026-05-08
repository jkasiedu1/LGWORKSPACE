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

### Security-Critical Variables

- `VITE_ROLE_ADMIN_API_URL`: Backend endpoint that grants admin claims. If omitted, the app derives `/roles/grant` from `VITE_R2_SIGNER_URL`.
- `VITE_R2_SIGNER_URL`: Worker endpoint used to sign R2 uploads.
- `VITE_GEMINI_API_KEY`: Gemini API key for AI features.

For the R2 signer worker, configure:

- `ALLOWED_ORIGINS`: Comma-separated list of trusted frontend origins.
- `FIREBASE_PROJECT_ID`: Firebase project ID.
- `FIREBASE_WEB_API_KEY`: Firebase web API key used for ID token lookup.
- `FIREBASE_SERVICE_ACCOUNT_EMAIL`: Service account email allowed to manage Firebase Auth users.
- `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY`: Service account private key used to mint Google OAuth tokens.

RBAC is claims-first: production admin access should come from Firebase custom claims, not hardcoded email allowlists.

### Role Management Endpoint

The existing Cloudflare worker now exposes `POST /roles/grant`.

- Caller must be authenticated with a Firebase ID token.
- Caller must already have the `seniorPastor` or `isSeniorPastor` custom claim.
- The worker looks up the target Firebase Auth user by email and assigns custom claims.

## Troubleshooting Deploy Clones

If clone fails with `could not read Username for 'https://github.com'`:

1. Ensure EpicGlobal has GitHub credentials configured for this repo.
2. If using HTTPS auth, use a GitHub PAT with repository read access.
3. If using org SSO, ensure token/app is authorized for the org.

## Firestore From Terminal

Use the built-in npm scripts to manage Firestore quickly:

1. Authenticate once
	npm run fb:login

2. Confirm active account
	npm run fb:whoami

3. Set Firebase project
	npm run fb:project

4. Deploy both rules and indexes
	npm run firestore:deploy

Optional:

- Deploy only rules
  npm run firestore:rules

- Deploy only indexes
  npm run firestore:indexes

- Run local Firestore emulator
  npm run firestore:emulator

- Run both Firestore and Auth emulators
	npm run firebase:emulators

- Run app and emulators together in one command
	npm run dev:local

This project pins emulator ports in `firebase.json` to reduce collisions in shared/dev-container environments:

- Firestore: `127.0.0.1:8085`
- Auth: `127.0.0.1:9099`
- Emulator UI: `127.0.0.1:4005`

### Connect The App To Local Emulators

To make the frontend use your local Firebase emulators, set these in `.env.local`:

```bash
VITE_USE_FIRESTORE_EMULATOR=true
VITE_FIRESTORE_EMULATOR_HOST=127.0.0.1
VITE_FIRESTORE_EMULATOR_PORT=8085
VITE_USE_AUTH_EMULATOR=false
VITE_AUTH_EMULATOR_HOST=127.0.0.1
VITE_AUTH_EMULATOR_PORT=9099
```

If you only start Firestore, leave `VITE_USE_AUTH_EMULATOR=false` so login still uses your normal Firebase Auth backend.

If you want the full local stack, use:

```bash
VITE_USE_FIRESTORE_EMULATOR=true
VITE_USE_AUTH_EMULATOR=true
```

Then either run the emulator in one terminal and the app in another:

```bash
npm run firestore:emulator
npm run dev
```

Or run everything together:

```bash
npm run dev:local
```