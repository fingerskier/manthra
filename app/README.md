# Manthra app

React + Vite front-end for the Manthra quote collection.

## Data: Dexie Cloud is the source of truth

The app stores quotes in a [Dexie Cloud](https://dexie.org/cloud/) database
(configured in `dexie-cloud.json`, overridable with the `VITE_DEXIE_CLOUD_URL`
env var). Everything renders from live queries against the local Dexie
replica, which syncs with the cloud db.

- `src/db/index.js` — the Dexie db (schema `quotes: '@id, text, author'`),
  cloud configuration, and CRUD helpers. New quotes are written to the
  `rlm-public` realm so they are shared with everyone.
- `src/db/seed.js` — pre-population. The repo-root `README.md` is imported
  raw and parsed into quotes; after the signed-in user's first sync, the
  seeds are `bulkPut` into the db **only if it is still empty**. Seed ids are
  deterministic hashes of the quote, so seeding is idempotent and can never
  duplicate quotes already in the cloud.

## Auth

Sign-in uses Dexie Cloud's default email OTP dialog (`db.cloud.login()`).
Reading works without an account; adding, editing, and deleting quotes
requires signing in. Writes to the public realm are accepted by the server
for accounts with permission to it (the database owner by default).

## Develop

```sh
npm install
npm run dev      # local dev server
npm run build    # production build
npm run lint
npm run deploy   # publish dist/ to gh-pages
```
