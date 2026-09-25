import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';
import { productionService } from '../services/productionService.js';

export function useProductions() {
  const productions = useLiveQuery(() => db.productions.reverse().toArray(), []) || [];
  return {
    productions,
    addProduction: productionService.add,
    deleteProduction: productionService.delete,
  };
}
