import { addRxPlugin, createRxDatabase } from 'rxdb';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import type { RxStorage } from 'rxdb'; // Add this import
import { allSchemas, type FableCollections, type FableDatabase } from './schema';

let db: FableDatabase | null = null;

if (process.env.NODE_ENV === 'development') {
  addRxPlugin(RxDBDevModePlugin);
}

export async function initializeDatabase(): Promise<FableDatabase> {
  if (db) return db;

  // Explicitly type storage as RxStorage to accept both wrapped and unwrapped types
  let storage: RxStorage<any, any> = getRxStorageMemory();
  
  if (process.env.NODE_ENV === 'development') {
    storage = wrappedValidateAjvStorage({
      storage,
    });
  }

  db = await createRxDatabase<FableCollections>({
    name: 'fabledb',
    storage,
    ignoreDuplicate: true,
  });

  const collectionCreators = Object.fromEntries(
    Object.entries(allSchemas).map(([name, schema]) => [
      name,
      { schema },
    ])
  ) as Parameters<FableDatabase['addCollections']>[0];

  await db.addCollections(collectionCreators);

  console.log('✓ RxDB initialized');

  return db;
}

export function getDatabase(): FableDatabase {
  if (!db) {
    throw new Error(
      'Database not initialized. Call initializeDatabase() first.'
    );
  }

  return db;
}