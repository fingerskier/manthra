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

## Admin mode: edit public quotes, publish private ones

The header panel (signed in) has an **Admin** section. Paste the database's
client id and secret there (the pair `npx dexie-cloud connect` writes to
`dexie-cloud.key`); the app asks Dexie Cloud for a token to check them and
keeps them in that browser's `localStorage`. They are never part of the
build. "Forget admin key" removes them.

With the key set, a quote's edit view gains:

- **Save / Delete on public quotes** — written through the Dexie Cloud REST
  API (`src/db/admin.js`), since sync never accepts public writes. An edit
  keeps the quote's id, so it stays one quote.
- **Publish on your private quotes** — creates the public quote (same
  deterministic id the CLI uses), re-reads it from the server, and only then
  deletes the private copy. It publishes what the editor shows. If the quote
  is already public, the public one just gains the private copy's tags.

The secret grants full write access to the database: only enter it in a
browser you trust. The REST calls come from the browser, so the site's origin
must be allowed by the database (`npx dexie-cloud whitelist <origin>`).

## Publishing quotes in bulk

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
  tags is left alone and reported, and so is one edited (synced from a
  browser) while the CLI runs — re-run to publish the edit.
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
private quotes; the server enforces the same rules on sync. Public quotes
are editable only in admin mode (above).

Quote records use a singular `tag` array property, matching the data
already stored in the cloud database (see `bak_app/export.json`).

## Develop

```sh
npm install
npm run dev      # local dev server
npm run build    # production build
npm run lint
npm test         # publish-quotes and admin client tests (against mock servers)
npm run deploy   # publish dist/ to gh-pages
```
