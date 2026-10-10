import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';
import { issueService } from '../services/issueService.js';

export function useIssues() {
  const issues = useLiveQuery(() => db.issues.reverse().toArray(), []) || [];
  return {
    issues,
    addIssue: issueService.add,
    updateIssue: issueService.update,
    deleteIssue: issueService.delete,
  };
}
