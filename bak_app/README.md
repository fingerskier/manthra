# Manthra App

View, search, and edit quotes.

## Seeding data

This project stores its quotes in Dexie Cloud. To populate a new database with the bundled quotes, use the Dexie Cloud CLI:

1. Install the CLI:
   ```sh
   npm install -g dexie-cloud
   ```
2. Connect the CLI to your database (generates `dexie-cloud.json` and `dexie-cloud.key`):
   ```sh
   dexie-cloud connect <DATABASE_URL>
   ```
3. Import the seed data located in this folder:
   ```sh
   dexie-cloud import quotes.json
   ```

The `quotes.json` file contains UUID identifiers for each quote and can be reused to seed other databases.


