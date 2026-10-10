# Manthra app

React + Vite front-end for the Manthra quote collection.

## Data: Dexie Cloud is the source of truth

The app stores quotes in a [Dexie Cloud](https://dexie.org/cloud/) database
(configured in `dexie-cloud.json`, overridable with the `VITE_DEXIE_CLOUD_URL`
env var). Everything renders from live queries against the local Dexie
replica, which syncs with the cloud db.

- `src/db/index.js` — the Dexie db (schema `quotes: '@id, text, author'`),
  cloud configuration, and CRUD helpers.
- Adding a quote writes it to the signed-in user's **private** realm. Dexie
  Cloud never accepts browser writes to the public realm (`rlm-public`):
  those need an admin client with the `GLOBAL_WRITE` scope, and a browser add
  would just be rolled back on sync. The app lists your unpublished private
  quotes first (marked "private"), then the shuffled public quotes, and hides
  private copies of quotes that are already public.

## Publishing quotes

`npm run publish-quotes` (`scripts/publish-quotes.mjs`) moves quotes into
the public collection through the Dexie Cloud REST API. It prints a plan and
changes nothing unless you pass `--yes`.

```sh
npx dexie-cloud connect https://zlorat9py.dexie.cloud   # once: writes dexie-cloud.key (git-ignored)

npm run publish-quotes -- --user you@example.com          # plan: your private quotes -> public
npm run publish-quotes -- --user you@example.com --yes    # apply
npm run publish-quotes -- --readme --yes                  # add README.md quotes not public yet
```

- `--user <userId>` publishes that user's private quotes (the userId is the
  sign-in email). Each private quote is deleted only after the server lists
  its public copy. Private copies of quotes that are already public are
  deleted instead of published twice; one whose public twin lacks some of its
  tags is left alone and reported.
- `--id <quoteId>` (repeatable) limits `--user` to specific quotes.
- `--readme` also publishes quotes from the repo-root `README.md` (one quote
  per paragraph, indented author line) that are not public yet.
- New public quotes get ids hashed from their text and author, so re-running
  after an interrupted run cannot duplicate them.
- `DEXIE_CLOUD_CLIENT_ID` / `DEXIE_CLOUD_CLIENT_SECRET` override the key file.

## Auth & permissions

Sign-in uses Dexie Cloud's default email OTP dialog (`db.cloud.login()`).
Reading works without an account; the add form appears once signed in.
Edit/delete buttons only appear on quotes the account may update or delete
(per-object `usePermissions` check), which in practice means your own
private quotes. The server enforces the same rules on sync.

Quote records use a singular `tag` array property, matching the data
already stored in the cloud database (see `bak_app/export.json`).

## Develop

```sh
npm install
npm run dev      # local dev server
npm run build    # production build
npm run lint
npm test         # publish-quotes planning tests
npm run deploy   # publish dist/ to gh-pages
```
