import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';
import { stockTransferService } from '../services/stockTransferService.js';

export function useStockTransfers() {
  const stockTransfers =
    useLiveQuery(() => (db.stockTransfers ? db.stockTransfers.toArray() : []), []) || [];

  return {
    stockTransfers,
    addStockTransfer: (data) => stockTransferService.add(data),
    updateStockTransfer: (id, data) => stockTransferService.update(id, data),
    deleteStockTransfer: (id) => stockTransferService.delete(id),
  };
}
