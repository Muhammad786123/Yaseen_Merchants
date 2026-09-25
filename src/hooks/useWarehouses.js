import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';
import { warehouseService } from '../services/warehouseService.js';

export function useWarehouses() {
  const warehouses = useLiveQuery(() => db.warehouses.toArray(), []) || [];
  return {
    warehouses,
    addWarehouse: warehouseService.add,
    updateWarehouse: warehouseService.update,
    deleteWarehouse: warehouseService.delete,
  };
}
