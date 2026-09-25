import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';
import { itemService } from '../services/itemService.js';

export function useItems() {
  const items = useLiveQuery(() => db.items.toArray(), []) || [];
  const loading = items === undefined;

  return {
    items,
    loading,
    addItem: itemService.add,
    updateItem: itemService.update,
    deleteItem: itemService.delete,
  };
}
