import { db } from '../db/database.js';

/**
 * Computes live stock positions grouped by Item + Quality + Warehouse
 * directly from transaction history (purchases, sales, issues, productions).
 *
 * This guarantees Stock.jsx and StockLedger.jsx share the exact same source of truth.
 */
export function computeStockPositions(
  purchases = [],
  sales = [],
  issues = [],
  productions = [],
  items = [],
  warehouses = [],
  stockAdjustments = [],
  stockTransfers = []
) {
  const positions = {};

  // Helper to find item details
  const getItemInfo = (itemId, itemName) => {
    const found = items.find(
      (i) =>
        (itemId && i.id === itemId) ||
        (itemName && i.name && i.name.toLowerCase() === itemName.toLowerCase())
    );
    return {
      id: found?.id || itemId,
      name: found?.name || itemName || 'Unknown Item',
      category: found?.category || 'Raw Material',
      quality: found?.quality || '',
    };
  };

  // Helper to find warehouse details
  const getWarehouseInfo = (warehouseId, warehouseName) => {
    const found = warehouses.find(
      (w) =>
        (warehouseId && w.id === warehouseId) ||
        (warehouseName && w.name && w.name.toLowerCase() === warehouseName.toLowerCase()) ||
        (warehouseId && w.name && w.name.toLowerCase() === warehouseId.toLowerCase())
    );
    return {
      id: found?.id || warehouseId || 'w1',
      name: found?.name || warehouseName || 'Raw Material Store',
    };
  };

  // Collect all inventory movement events
  const events = [];

  // 1. Inward from Purchases
  purchases.forEach((p) => {
    const wInfo = getWarehouseInfo(p.warehouseId, p.warehouseName);
    p.items?.forEach((it) => {
      if (it.type === 'service') return; // Skip service lines
      const itInfo = getItemInfo(it.itemId, it.itemName);
      const quality = it.quality || '';
      const qty = Number(it.qty || 0);
      const rate = Number(it.rate || 0);
      const amount = it.amount !== undefined ? Number(it.amount) : qty * rate;

      if (qty > 0) {
        events.push({
          date: p.date,
          createdAt: p.createdAt,
          type: 'IN',
          source: 'Purchase',
          refNo: p.no,
          itemId: itInfo.id,
          itemName: itInfo.name,
          category: itInfo.category,
          quality,
          warehouseId: wInfo.id,
          warehouseName: wInfo.name,
          qty,
          rate,
          amount,
        });
      }
    });
  });

  // 2. Outward from Sales: REMOVED per Option B (Sales must NOT affect stock)

  // 3. Outward from Issues
  issues.forEach((iss) => {
    const wInfo = getWarehouseInfo(iss.fromWarehouse, iss.fromWarehouse);
    iss.items?.forEach((it) => {
      const itInfo = getItemInfo(it.itemId, it.itemName);
      const quality = it.quality || '';
      const qty = Number(it.issueQty || it.qty || 0);

      if (qty > 0) {
        events.push({
          date: iss.date,
          createdAt: iss.createdAt,
          type: 'OUT',
          source: 'Issue',
          refNo: iss.no,
          itemId: itInfo.id,
          itemName: itInfo.name,
          category: itInfo.category,
          quality,
          warehouseId: wInfo.id,
          warehouseName: wInfo.name,
          qty,
        });
      }
    });
  });

  // 4. Inward from Productions (Finished Products Output)
  productions.forEach((prd) => {
    const outputQty = Number(prd.outputQty || 0);
    if (outputQty > 0) {
      const itInfo = getItemInfo(null, prd.product);
      const wInfo = getWarehouseInfo(null, 'Finished Goods Store');
      const quality = prd.quality || '';
      const rate = 115; // standard production output rate

      events.push({
        date: prd.date,
        createdAt: prd.createdAt,
        type: 'IN',
        source: 'Production',
        refNo: prd.no,
        itemId: itInfo.id,
        itemName: prd.product || itInfo.name,
        category: 'Finished Product',
        quality,
        warehouseId: wInfo.id,
        warehouseName: wInfo.name,
        qty: outputQty,
        rate,
        amount: outputQty * rate,
      });
    }
  });

  // 5. Manual Stock Adjustments (Add / Reduce / Opening Balances)
  stockAdjustments.forEach((adj) => {
    const itInfo = getItemInfo(adj.itemId, adj.itemName);
    const wInfo = getWarehouseInfo(adj.warehouseId, adj.warehouseName);
    const quality = adj.quality || '';
    const qty = Math.abs(Number(adj.qty || 0));
    const rate = Number(adj.rate || 0);
    const isReduce = adj.type === 'REDUCE' || Number(adj.qty) < 0;

    if (qty > 0) {
      if (isReduce) {
        events.push({
          date: adj.date,
          createdAt: adj.createdAt,
          type: 'OUT',
          source: 'Adjustment',
          refNo: adj.no,
          itemId: itInfo.id,
          itemName: itInfo.name,
          category: itInfo.category,
          quality,
          warehouseId: wInfo.id,
          warehouseName: wInfo.name,
          qty,
          note: adj.reason || adj.note,
        });
      } else {
        events.push({
          date: adj.date,
          createdAt: adj.createdAt,
          type: 'IN',
          source: 'Adjustment',
          refNo: adj.no,
          itemId: itInfo.id,
          itemName: itInfo.name,
          category: itInfo.category,
          quality,
          warehouseId: wInfo.id,
          warehouseName: wInfo.name,
          qty,
          rate,
          amount: qty * rate,
          note: adj.reason || adj.note,
        });
      }
    }
  });

  // 6. Transfers between warehouses
  stockTransfers.forEach((trf) => {
    const itInfo = getItemInfo(trf.itemId, trf.itemName);
    const fromW = getWarehouseInfo(trf.fromWarehouseId, trf.fromWarehouseName);
    const toW = getWarehouseInfo(trf.toWarehouseId, trf.toWarehouseName);
    const quality = trf.quality || '';
    const qty = Math.abs(Number(trf.qty || 0));

    if (qty > 0) {
      // OUT from source
      events.push({
        date: trf.date,
        createdAt: trf.createdAt,
        type: 'OUT',
        source: 'Transfer',
        refNo: trf.no,
        transferId: trf.id,
        fromWarehouseId: fromW.id,
        fromWarehouseName: fromW.name,
        toWarehouseId: toW.id,
        toWarehouseName: toW.name,
        itemId: itInfo.id,
        itemName: itInfo.name,
        category: itInfo.category,
        quality,
        warehouseId: fromW.id,
        warehouseName: fromW.name,
        qty,
        note: trf.remarks || `Transfer to ${toW.name}`,
      });

      // IN at destination at source's average rate at that time
      events.push({
        date: trf.date,
        createdAt: trf.createdAt,
        type: 'IN',
        source: 'Transfer',
        refNo: trf.no,
        transferId: trf.id,
        fromWarehouseId: fromW.id,
        fromWarehouseName: fromW.name,
        toWarehouseId: toW.id,
        toWarehouseName: toW.name,
        itemId: itInfo.id,
        itemName: itInfo.name,
        category: itInfo.category,
        quality,
        warehouseId: toW.id,
        warehouseName: toW.name,
        qty,
        note: trf.remarks || `Transfer from ${fromW.name}`,
      });
    }
  });

  // Sort events by date ascending, then IN events before OUT events on the same date, then by createdAt (or refNo) ascending
  events.sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    if (timeA !== timeB) return timeA - timeB;

    // IN events processed before OUT events on the same date
    if (a.type !== b.type) {
      return a.type === 'IN' ? -1 : 1;
    }

    // Secondary sort by createdAt ascending
    if (a.createdAt && b.createdAt) {
      const createdA = new Date(a.createdAt).getTime();
      const createdB = new Date(b.createdAt).getTime();
      if (!isNaN(createdA) && !isNaN(createdB) && createdA !== createdB) {
        return createdA - createdB;
      }
    }

    // Fallback: refNo ascending
    const refA = String(a.refNo || '');
    const refB = String(b.refNo || '');
    return refA.localeCompare(refB);
  });

  const itemState = {}; // itemId -> { qty, rate } across ALL godowns

  // Process all events sequentially
  events.forEach((ev) => {
    const key = `${ev.itemId}__${ev.warehouseName}`;

    if (!positions[key]) {
      positions[key] = {
        id: `stk_${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        itemId: ev.itemId,
        itemName: ev.itemName,
        category: ev.category,
        quality: '',
        warehouseId: ev.warehouseId,
        warehouseName: ev.warehouseName,
        qty: 0,
        avgRate: 0,
        totalCost: 0,
        value: 0,
      };
    }

    const pos = positions[key];

    // Update position quantity in this godown
    if (ev.type === 'IN') {
      pos.qty += Number(ev.qty || 0);
    } else if (ev.type === 'OUT') {
      pos.qty -= Number(ev.qty || 0);
    }

    // Every event whose source is NOT 'Transfer' (transfers only move stock between godowns)
    if (ev.source !== 'Transfer') {
      if (!itemState[ev.itemId]) {
        itemState[ev.itemId] = { qty: 0, rate: 0 };
      }
      const state = itemState[ev.itemId];

      if (ev.type === 'IN') {
        const inQty = Number(ev.qty || 0);
        const rate = Number(ev.rate || 0);
        const cost = ev.amount !== undefined ? Number(ev.amount) : inQty * rate;

        if (state.qty <= 0) {
          state.rate = inQty > 0 ? cost / inQty : (ev.rate !== undefined ? rate : 0);
        } else {
          state.rate = (state.qty * state.rate + cost) / (state.qty + inQty);
        }
        state.qty += inQty;
      } else if (ev.type === 'OUT') {
        const outQty = Number(ev.qty || 0);
        state.qty -= outQty;
        // rate stays unchanged
      }
    }
  });

  // After the loop, set for every position:
  // rate = itemState[itemId].rate; avgRate = round(rate, 2); totalCost = qty * rate; value = Math.round(qty * rate).
  Object.values(positions).forEach((pos) => {
    const state = itemState[pos.itemId];
    const rate = state ? Number(state.rate || 0) : 0;
    pos.rawRate = rate;
    pos.rate = rate;
    pos.avgRate = Number(rate.toFixed(2));
    pos.totalCost = pos.qty * rate;
    pos.value = Math.round(pos.qty * rate);
  });

  return Object.values(positions);
}

/**
 * Recomputes all stock positions from IndexedDB tables and synchronizes db.stockEntries.
 */
export async function syncStockEntriesToDb() {
  try {
    const purchases = await db.purchases.toArray();
    const sales = await db.sales.toArray();
    const issues = await db.issues.toArray();
    const productions = await db.productions.toArray();
    const items = await db.items.toArray();
    const warehouses = await db.warehouses.toArray();
    const stockAdjustments = db.stockAdjustments ? await db.stockAdjustments.toArray() : [];
    const stockTransfers = db.stockTransfers ? await db.stockTransfers.toArray() : [];

    const computed = computeStockPositions(
      purchases,
      sales,
      issues,
      productions,
      items,
      warehouses,
      stockAdjustments,
      stockTransfers
    );

    await db.stockEntries.clear();
    if (computed.length > 0) {
      await db.stockEntries.bulkAdd(computed);
    }
    return computed;
  } catch (err) {
    console.error('Failed to sync stock entries to DB:', err);
    return [];
  }
}

/**
 * Automated consistency check:
 * Compares computed stock status totals against ledger movement totals for each item.
 */
export function verifyStockConsistency(
  purchases = [],
  sales = [],
  issues = [],
  productions = [],
  stockPositions = [],
  items = [],
  stockAdjustments = []
) {
  const discrepancies = [];

  items.forEach((item) => {
    // 1. Calculate Ledger net balance
    let ledgerIn = 0;
    let ledgerOut = 0;

    purchases.forEach((p) => {
      p.items?.forEach((it) => {
        if ((it.itemId === item.id || it.itemName === item.name) && it.type !== 'service') {
          ledgerIn += Number(it.qty || 0);
        }
      });
    });

    // Sales do NOT affect stock (Option B)

    issues.forEach((iss) => {
      iss.items?.forEach((it) => {
        if (it.itemId === item.id || it.itemName === item.name) {
          ledgerOut += Number(it.issueQty || it.qty || 0);
        }
      });
    });

    productions.forEach((prd) => {
      if (prd.product === item.name) {
        ledgerIn += Number(prd.outputQty || 0);
      }
    });

    stockAdjustments.forEach((adj) => {
      if (
        adj.itemId === item.id ||
        (adj.itemName && item.name && adj.itemName.toLowerCase() === item.name.toLowerCase())
      ) {
        const qty = Math.abs(Number(adj.qty || 0));
        if (adj.type === 'REDUCE' || Number(adj.qty) < 0) {
          ledgerOut += qty;
        } else {
          ledgerIn += qty;
        }
      }
    });

    const ledgerBalance = ledgerIn - ledgerOut;

    // 2. Calculate Stock status total across all warehouses/qualities
    const stockStatusTotal = stockPositions
      .filter((s) => s.itemId === item.id || s.itemName === item.name)
      .reduce((sum, s) => sum + Number(s.qty || 0), 0);

    if (ledgerBalance !== stockStatusTotal) {
      discrepancies.push({
        itemId: item.id,
        itemName: item.name,
        ledgerBalance,
        stockStatusTotal,
        diff: ledgerBalance - stockStatusTotal,
      });
    }
  });

  return {
    isConsistent: discrepancies.length === 0,
    discrepancies,
  };
}
