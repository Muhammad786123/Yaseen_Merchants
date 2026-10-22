import { db } from '../db/database.js';
import { syncStockEntriesToDb } from '../utils/stockUtils.js';

/**
 * Calculates the total value of an issue by summing item values.
 * Formula: sum of (item.value || issueQty * rate) over issue.items.
 * Never reads stored issue.totalValue directly.
 *
 * @param {Object} issue
 * @returns {number}
 */
export function issueTotalValue(issue) {
  if (!issue || !Array.isArray(issue.items)) return 0;
  const rawSum = issue.items.reduce((sum, item) => {
    const val = Number(item.value);
    if (!isNaN(val) && val > 0) {
      return sum + val;
    }
    const qty = Number(item.issueQty !== undefined ? item.issueQty : (item.qty !== undefined ? item.qty : 0));
    const rate = Number(item.rate || 0);
    return sum + (qty * rate || 0);
  }, 0);
  return Math.round(rawSum * 100) / 100;
}

/**
 * One-time repair on app start:
 * For every saved issue whose totalValue is 0 or missing but whose items have values,
 * sets totalValue = issueTotalValue(issue).
 */
export async function repairIssueTotalValues() {
  if (!db.issues) return;
  const allIssues = await db.issues.toArray();
  const updates = [];
  for (const iss of allIssues) {
    const computedVal = issueTotalValue(iss);
    if ((!iss.totalValue || Number(iss.totalValue) === 0) && computedVal > 0) {
      updates.push({ ...iss, totalValue: computedVal });
    }
  }
  if (updates.length > 0) {
    await db.transaction('rw', [db.issues], async () => {
      for (const u of updates) {
        await db.issues.put(u);
      }
    });
    console.log(`Repaired ${updates.length} issue total values.`);
  }
}

/**
 * Resolves rates and values for issue items strictly via exact match:
 * item + quality + fromWarehouse.
 * If no matching stock row in that warehouse, uses item's weighted average rate across all warehouses.
 */
async function processIssueItems(items = [], fromWarehouse = '') {
  const stockEntries = db.stockEntries ? await db.stockEntries.toArray() : [];
  const whName = (fromWarehouse || 'Raw Material Store').replace(/wirehouse/gi, 'Warehouse');
  const normalizedWh = (whName || '').trim().toLowerCase();

  return (items || []).map((item) => {
    const issueQty = Number(item.issueQty !== undefined ? item.issueQty : (item.qty || 0));
    let rate = Number(item.rate || 0);

    if (!rate || rate <= 0) {
      // Exact match: item + quality + selected warehouse
      const normalizedQuality = (item.quality || '').trim().toLowerCase();
      const matchingStock = stockEntries.find(
        (s) =>
          (s.itemId === item.itemId || (item.itemName && (s.itemName || '').toLowerCase() === item.itemName.toLowerCase())) &&
          (s.quality || '').trim().toLowerCase() === normalizedQuality &&
          ((s.warehouseName || '').trim().toLowerCase() === normalizedWh || (s.warehouseId || '').trim().toLowerCase() === normalizedWh)
      );

      if (matchingStock && Number(matchingStock.avgRate) > 0) {
        rate = Number(matchingStock.avgRate);
      } else {
        // Fallback: item average rate across all warehouses
        const itemStockRows = stockEntries.filter(
          (s) =>
            (s.itemId === item.itemId || (item.itemName && (s.itemName || '').toLowerCase() === item.itemName.toLowerCase())) &&
            Number(s.qty || 0) > 0 &&
            Number(s.avgRate || 0) > 0
        );
        const totalItemQty = itemStockRows.reduce((sum, s) => sum + Number(s.qty || 0), 0);
        const totalItemVal = itemStockRows.reduce(
          (sum, s) => sum + (Number(s.value !== undefined ? s.value : s.qty * s.avgRate) || 0),
          0
        );
        if (totalItemQty > 0) {
          rate = totalItemVal / totalItemQty;
        }
      }
    }

    const rawValue = item.value !== undefined && Number(item.value) > 0
      ? Number(item.value)
      : issueQty * rate;
    const value = Math.round(rawValue * 100) / 100;

    return {
      ...item,
      quality: item.quality || '',
      issueQty,
      rate,
      value,
    };
  });
}

export const issueService = {
  async getAll() {
    return await db.issues.reverse().toArray();
  },

  async getById(id) {
    return await db.issues.get(id);
  },

  async add(issueData) {
    const id = issueData.id || 'iss_' + Date.now();
    const count = await db.issues.count();
    const no = issueData.no || `ISS-${String(count + 1).padStart(4, '0')}`;
    const fromWarehouse = (issueData.fromWarehouse || 'Raw Material Store').replace(/wirehouse/gi, 'Warehouse');

    const processedItems = await processIssueItems(issueData.items, fromWarehouse);
    const totalValue = issueTotalValue({ items: processedItems });

    const newIssue = {
      id,
      no,
      date: issueData.date || new Date().toISOString().split('T')[0],
      fromWarehouse,
      items: processedItems,
      totalValue,
      createdAt: issueData.createdAt || new Date().toISOString(),
      updatedAt: null,
      editCount: 0,
    };

    await db.transaction('rw', [db.issues], async () => {
      await db.issues.add(newIssue);
    });

    await syncStockEntriesToDb();
    return newIssue;
  },

  /**
   * Atomic Update for Material Issue:
   * (1) Replaces issue record preserving id, no, createdAt
   * (2) syncStockEntriesToDb automatically recalculates moving weighted average stock
   */
  async update(id, issueData) {
    const existing = await db.issues.get(id);
    if (!existing) throw new Error('Issue record not found: ' + id);

    const fromWarehouse = (issueData.fromWarehouse || existing.fromWarehouse || 'Raw Material Store').replace(/wirehouse/gi, 'Warehouse');
    const processedItems = await processIssueItems(issueData.items, fromWarehouse);
    const totalValue = issueTotalValue({ items: processedItems });

    const updatedIssue = {
      ...existing,
      date: issueData.date || existing.date,
      fromWarehouse,
      items: processedItems,
      totalValue,
      updatedAt: new Date().toISOString(),
      editCount: (Number(existing.editCount) || 0) + 1,
    };

    await db.transaction('rw', [db.issues], async () => {
      await db.issues.put(updatedIssue);
    });

    await syncStockEntriesToDb();
    return updatedIssue;
  },

  /**
   * Atomic Delete for Material Issue:
   * (1) Remove record
   * (2) syncStockEntriesToDb automatically reverses stock deductions
   */
  async delete(id) {
    const existing = await db.issues.get(id);
    if (!existing) return;

    await db.transaction('rw', [db.issues], async () => {
      await db.issues.delete(id);
    });

    await syncStockEntriesToDb();
  },
};
