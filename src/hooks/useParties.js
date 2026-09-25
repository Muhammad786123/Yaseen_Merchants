import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';
import { partyService } from '../services/partyService.js';

export function useParties() {
  const parties = useLiveQuery(() => db.parties.toArray(), []) || [];
  const loading = parties === undefined;

  return {
    parties,
    loading,
    addParty: partyService.add,
    updateParty: partyService.update,
    deleteParty: partyService.delete,
  };
}
