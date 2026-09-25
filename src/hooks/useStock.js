import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';

export function useStock() {
  const stockEntries = useLiveQuery(() => db.stockEntries.toArray(), []) || [];
  return {
    stockEntries,
    loading: stockEntries === undefined,
  };
}
