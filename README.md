# Save The Gate

A greenfield Express + React + MongoDB campaign site for tracking petitions, publishing updates, listing campaign contacts, and hosting moderated community discussion.

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

The Vite client runs on `http://localhost:5173`; the API runs on `http://localhost:4000`.

Staff sign in with email and password. Admins can invite moderators from the Users tab; if SMTP is not configured, invite links are printed to the server console.

## Production

```bash
npm run build
npm start
```

`npm start` only starts the already-built server. Run `npm run build` after code or asset changes.

Set `MONGO_URI`, `SESSION_SECRET`, `APP_URL`, and `OWNER_EMAIL` in the production environment. Express serves the built React app and the `/api` routes from one Node process.

## Notes

- Petition count syncing is best-effort. Admins can manually override counts and goals whenever Change.org markup changes or blocks fetching.
- The visual direction uses original gate-inspired art and UI motifs. Do not add official franchise artwork unless licensed.
