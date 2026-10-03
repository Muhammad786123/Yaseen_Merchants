import { db } from '../db/database.js';

export const BACKUP_TABLES = [
  'parties',
  'qualities',
  'items',
  'warehouses',
  'stockEntries',
  'purchases',
  'issues',
  'productions',
  'sales',
  'receipts',
  'payments',
  'expenses',
  'accounts',
  'cashBookEntries',
  'bankTransfers',
  'capitalEntries',
  'users',
  'settings',
];

export const MAX_AUTO_BACKUPS = 5;

/**
 * Format backup filename: yaseen-backup-YYYY-MM-DD-HHmm.json
 */
export function getBackupFilename() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `yaseen-backup-${yyyy}-${mm}-${dd}-${hh}${min}.json`;
}

/**
 * Trigger browser file download from an in-memory object
 */
export function downloadJsonFile(dataObj, filename) {
  const jsonStr = JSON.stringify(dataObj, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read all tables and produce the canonical backup JSON bundle
 */
export async function createBackupBundle() {
  const data = {};
  const itemCounts = {};
  let totalRecords = 0;

  for (const tableName of BACKUP_TABLES) {
    if (db[tableName]) {
      const records = await db[tableName].toArray();
      data[tableName] = records;
      itemCounts[tableName] = records.length;
      totalRecords += records.length;
    }
  }

  const bundle = {
    appName: 'Shahid Yaseen Cotton Waste Merchant',
    appId: 'yaseen-merchants-erp',
    exportedAt: new Date().toISOString(),
    version: 1,
    tablesCount: Object.keys(data).length,
    totalRecords,
    itemCounts,
    data,
  };

  return bundle;
}

/**
 * Export full database to JSON file and trigger browser download
 */
export async function exportDatabaseToJson() {
  const bundle = await createBackupBundle();
  const filename = getBackupFilename();
  downloadJsonFile(bundle, filename);

  // Record timestamp of manual backup
  localStorage.setItem('yaseen_last_manual_backup', new Date().toISOString());

  return {
    filename,
    totalRecords: bundle.totalRecords,
    itemCounts: bundle.itemCounts,
    exportedAt: bundle.exportedAt,
  };
}

/**
 * Validate imported JSON structure
 */
export function validateBackupData(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'The selected file is not a valid JSON document.' };
  }

  if (!parsed.data || typeof parsed.data !== 'object') {
    return {
      valid: false,
      error: 'Invalid backup format: missing root "data" container with database tables.',
    };
  }

  const keys = Object.keys(parsed.data);
  const matched = BACKUP_TABLES.filter((t) => keys.includes(t));

  if (matched.length === 0) {
    return {
      valid: false,
      error: 'Incompatible file: contains no recognized Yaseen Merchants accounting tables.',
    };
  }

  return { valid: true, tablesFound: matched };
}

/**
 * Restore all tables from an imported backup object
 */
export async function restoreDatabaseFromJson(backupObj) {
  const validation = validateBackupData(backupObj);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { data } = backupObj;
  let totalRestored = 0;
  const tablesRestored = [];

  await db.transaction('rw', db.tables, async () => {
    for (const tableName of BACKUP_TABLES) {
      if (db[tableName]) {
        await db[tableName].clear();
        if (data[tableName] && Array.isArray(data[tableName]) && data[tableName].length > 0) {
          await db[tableName].bulkAdd(data[tableName]);
          totalRestored += data[tableName].length;
          tablesRestored.push(tableName);
        }
      }
    }
  });

  return {
    success: true,
    totalRestored,
    tablesRestored,
    exportedAt: backupObj.exportedAt,
  };
}

/**
 * Run automatic background backup snapshot into IndexedDB
 */
export async function runAutoBackup(force = false) {
  try {
    const isEnabled = localStorage.getItem('yaseen_auto_backup_enabled') !== 'false';
    if (!isEnabled && !force) return null;

    const freq = localStorage.getItem('yaseen_auto_backup_freq') || 'session';
    const lastBackupStr = localStorage.getItem('yaseen_last_auto_backup');
    const now = Date.now();

    if (!force) {
      if (freq === 'session') {
        const sessionDone = sessionStorage.getItem('yaseen_session_backed_up');
        if (sessionDone) return null;
      } else if (freq === 'daily' && lastBackupStr) {
        const lastTime = new Date(lastBackupStr).getTime();
        if (now - lastTime < 24 * 3600 * 1000) return null;
      } else if (freq === 'weekly' && lastBackupStr) {
        const lastTime = new Date(lastBackupStr).getTime();
        if (now - lastTime < 7 * 24 * 3600 * 1000) return null;
      }
    }

    // Capture snapshot bundle
    const bundle = await createBackupBundle();

    if (!db.autoBackups) return null;

    const snapshot = {
      id: `ab_${now}`,
      createdAt: now,
      timestamp: bundle.exportedAt,
      totalRecords: bundle.totalRecords,
      itemCounts: bundle.itemCounts,
      data: bundle.data,
    };

    await db.autoBackups.add(snapshot);

    // Prune older snapshots if exceeding MAX_AUTO_BACKUPS
    const allBackups = await db.autoBackups.orderBy('createdAt').reverse().toArray();
    if (allBackups.length > MAX_AUTO_BACKUPS) {
      const toDelete = allBackups.slice(MAX_AUTO_BACKUPS);
      for (const b of toDelete) {
        await db.autoBackups.delete(b.id);
      }
    }

    localStorage.setItem('yaseen_last_auto_backup', bundle.exportedAt);
    sessionStorage.setItem('yaseen_session_backed_up', 'true');

    return snapshot;
  } catch (err) {
    console.error('Failed to run automatic backup:', err);
    return null;
  }
}

/**
 * Retrieve all auto-backups ordered by latest first
 */
export async function getAutoBackups() {
  try {
    if (!db.autoBackups) return [];
    return await db.autoBackups.orderBy('createdAt').reverse().toArray();
  } catch (err) {
    console.error('Error fetching auto-backups:', err);
    return [];
  }
}

/**
 * Restore from a specific auto backup record
 */
export async function restoreAutoBackup(backupId) {
  if (!db.autoBackups) throw new Error('Auto-backup database table not available.');
  const record = await db.autoBackups.get(backupId);
  if (!record) throw new Error('Auto-backup snapshot not found.');

  return await restoreDatabaseFromJson({
    appName: 'Shahid Yaseen Cotton Waste Merchant',
    exportedAt: record.timestamp,
    version: 1,
    data: record.data,
  });
}

/**
 * Delete a specific auto backup
 */
export async function deleteAutoBackup(backupId) {
  if (!db.autoBackups) return;
  await db.autoBackups.delete(backupId);
}
