import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';
import { qualityService } from '../services/qualityService.js';

export function useQualities() {
  const qualities = useLiveQuery(() => db.qualities.toArray(), []) || [];
  return {
    qualities,
    addQuality: qualityService.add,
    updateQuality: qualityService.update,
    deleteQuality: qualityService.delete,
  };
}
