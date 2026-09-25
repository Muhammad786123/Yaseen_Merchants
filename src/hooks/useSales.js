import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';
import { saleService } from '../services/saleService.js';

export function useSales() {
  const sales = useLiveQuery(() => db.sales.reverse().toArray(), []) || [];
  const loading = sales === undefined;

  return {
    sales,
    loading,
    addSale: saleService.add,
    updateSale: saleService.update,
    deleteSale: saleService.delete,
  };
}
