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
  stockAdjustments = []
) {
  const positions = {};

  // Helper to find item details
  const getItemInfo = (itemId, itemName) => {
    const found = items.find((i) => i.id === itemId || (itemName && i.name.toLowerCase() === itemName.toLowerCase()));
    return {
      id: found?.id || itemId,
      name: found?.name || itemName || 'Unknown Item',
      category: found?.category || 'Raw Material',
      quality: found?.quality || 'Cotton A',
    };
  };

  // Helper to find warehouse details
  const getWarehouseInfo = (warehouseId, warehouseName) => {
    const found = warehouses.find(
      (w) =>
        (warehouseId && w.id === warehouseId) ||
        (warehouseName && w.name.toLowerCase() === warehouseName.toLowerCase()) ||
        (warehouseId && w.name.toLowerCase() === warehouseId.toLowerCase())
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
      const quality = it.quality || itInfo.quality || 'Cotton A';
      const qty = Number(it.qty || 0);
      const rate = Number(it.rate || 0);
      const amount = it.amount !== undefined ? Number(it.amount) : qty * rate;

      if (qty > 0) {
        events.push({
          date: p.date,
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

  // 2. Outward from Sales
  sales.forEach((s) => {
    const wInfo = getWarehouseInfo(s.warehouseId, s.warehouseName);
    s.items?.forEach((it) => {
      if (it.type === 'service') return;
      const itInfo = getItemInfo(it.itemId, it.itemName);
      const quality = it.quality || itInfo.quality || 'Cotton A';
      const qty = Number(it.qty || 0);

      if (qty > 0) {
        events.push({
          date: s.date,
          type: 'OUT',
          source: 'Sale',
          refNo: s.no,
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

  // 3. Outward from Issues
  issues.forEach((iss) => {
    const wInfo = getWarehouseInfo(iss.fromWarehouse, iss.fromWarehouse);
    iss.items?.forEach((it) => {
      const itInfo = getItemInfo(it.itemId, it.itemName);
      const quality = it.quality || itInfo.quality || 'Cotton A';
      const qty = Number(it.issueQty || it.qty || 0);

      if (qty > 0) {
        events.push({
          date: iss.date,
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
      const quality = prd.quality || 'Cotton A';
      const rate = 115; // standard production output rate

      events.push({
        date: prd.date,
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
    const quality = adj.quality || itInfo.quality || 'Cotton A';
    const qty = Math.abs(Number(adj.qty || 0));
    const rate = Number(adj.rate || 0);
    const isReduce = adj.type === 'REDUCE' || Number(adj.qty) < 0;

    if (qty > 0) {
      if (isReduce) {
        events.push({
          date: adj.date,
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

  // Sort events chronologically to compute true moving weighted average rate
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Process all events sequentially
  events.forEach((ev) => {
    const key = `${ev.itemId}__${ev.quality}__${ev.warehouseName}`;

    if (!positions[key]) {
      positions[key] = {
        id: `stk_${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        itemId: ev.itemId,
        itemName: ev.itemName,
        category: ev.category,
        quality: ev.quality,
        warehouseId: ev.warehouseId,
        warehouseName: ev.warehouseName,
        qty: 0,
        avgRate: 0,
        totalCost: 0,
        value: 0,
      };
    }

    const pos = positions[key];

    if (ev.type === 'IN') {
      const inQty = Number(ev.qty || 0);
      const inCost = ev.amount !== undefined ? Number(ev.amount) : inQty * Number(ev.rate || 0);
      const newQty = pos.qty + inQty;
      const newCost = pos.totalCost + inCost;
      const newAvgRate = newQty > 0 ? newCost / newQty : (ev.rate || pos.avgRate);

      pos.qty = newQty;
      pos.totalCost = Math.max(0, newCost);
      pos.avgRate = Number(newAvgRate.toFixed(2));
      pos.value = Math.round(pos.qty * pos.avgRate);
    } else if (ev.type === 'OUT') {
      const outQty = Number(ev.qty || 0);
      const newQty = Math.max(0, pos.qty - outQty);
      pos.qty = newQty;
      pos.totalCost = pos.qty * pos.avgRate;
      pos.value = Math.round(pos.qty * pos.avgRate);
    }
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

    const computed = computeStockPositions(
      purchases,
      sales,
      issues,
      productions,
      items,
      warehouses,
      stockAdjustments
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

    sales.forEach((s) => {
      s.items?.forEach((it) => {
        if ((it.itemId === item.id || it.itemName === item.name) && it.type !== 'service') {
          ledgerOut += Number(it.qty || 0);
        }
      });
    });

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

    const ledgerBalance = Math.max(0, ledgerIn - ledgerOut);

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
