import Dexie, { type Table } from 'dexie';
import dexieCloud from 'dexie-cloud-addon';
import cloudConfig from '../dexie-cloud.json';

export interface Quote {
  id?: string;
  text: string;
  author: string | null;
  tag: string[];
}

export class ManthraDB extends Dexie {
  public quotes!: Table<Quote>;

  constructor() {
    super('manthra', {
      addons: [dexieCloud],
      autoOpen: true,
    });

    this.version(1).stores({
      quotes: 'id, text, author, tag',
    });

    const databaseUrl =
      import.meta.env?.VITE_DEXIE_CLOUD_URL ?? cloudConfig.databaseUrl ?? cloudConfig.dbUrl;

    if (databaseUrl) {
      this.cloud.configure({
        databaseUrl,
      });

      void this.cloud.sync();
    } else {
      console.warn('Dexie Cloud database URL not configured');
    }
  }
}

export const db = new ManthraDB();
window.db = db;

declare global {
  interface Window {
    db: ManthraDB;
  }
}
