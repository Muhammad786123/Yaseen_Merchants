import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';
import { purchaseService } from '../services/purchaseService.js';

export function usePurchases() {
  const purchases = useLiveQuery(() => db.purchases.reverse().toArray(), []) || [];
  const loading = purchases === undefined;

  return {
    purchases,
    loading,
    addPurchase: purchaseService.add,
    updatePurchase: purchaseService.update,
    deletePurchase: purchaseService.delete,
  };
}
