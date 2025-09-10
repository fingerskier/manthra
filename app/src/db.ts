import Dexie, { type Table } from 'dexie';
import dexieCloud from 'dexie-cloud-addon';

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

    const databaseUrl = import.meta.env?.VITE_DEXIE_CLOUD_URL;

    if (databaseUrl) {
      this.cloud.configure({
        databaseUrl,
      });
    }
  }
}

export const db = new ManthraDB();
