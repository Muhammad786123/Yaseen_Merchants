// Test script to verify Stock Ledger / Warehouse Ledger / Item Ledger side marker logic
// TEST: ADJ-IN 5,925 + PUR 1,800 - ISS 7,000 shows the balance 5,925 جمع, 7,725 جمع, 725 جمع, and the closing balance 725 KG جمع.
// A stock balance of -50 KG shows بنام in red.

function deriveRowMarker(mode, rowBalNum, rowSide) {
  let rowMarker = '';
  let markerColor = undefined;

  if (mode === 'currency') {
    if (rowSide) {
      rowMarker = rowSide.ur;
      markerColor = rowSide.color;
    }
  } else {
    // Quantity mode (Stock / Warehouse / Item Ledger)
    if (rowBalNum !== null) {
      if (rowBalNum > 0) {
        rowMarker = 'جمع';
        markerColor = '#16a34a';
      } else if (rowBalNum < 0) {
        rowMarker = 'بنام';
        markerColor = '#dc2626';
      } else {
        rowMarker = '';
        markerColor = undefined;
      }
    }
  }

  return { rowMarker, markerColor };
}

function deriveFooterMarker(mode, finalBalance, balanceSideFn) {
  const marker =
    mode === 'currency'
      ? balanceSideFn(finalBalance).ur
      : finalBalance > 0
      ? 'جمع'
      : finalBalance < 0
      ? 'بنام'
      : '';

  const color =
    mode === 'currency'
      ? balanceSideFn(finalBalance).color
      : finalBalance > 0
      ? '#16a34a'
      : finalBalance < 0
      ? '#dc2626'
      : undefined;

  return { marker, color };
}

function testScenario() {
  const movements = [
    { type: 'Adjustment', refNo: 'ADJ-IN-01', inQty: 5925, outQty: 0 },
    { type: 'Purchase', refNo: 'PUR-01', inQty: 1800, outQty: 0 },
    { type: 'Issue', refNo: 'ISS-01', inQty: 0, outQty: 7000 },
  ];

  let runningQty = 0;
  const rows = movements.map((m, idx) => {
    runningQty += m.inQty - m.outQty;
    const { rowMarker, markerColor } = deriveRowMarker('quantity', runningQty, null);
    return {
      billNo: m.refNo,
      credit: m.inQty,
      debit: m.outQty,
      balance: runningQty,
      rowMarker,
      markerColor,
    };
  });

  console.log('--- Row by Row Evaluation ---');
  rows.forEach((r) => {
    console.log(`${r.billNo} -> Debit(بنام): ${r.debit}, Credit(جمع): ${r.credit}, Balance: ${r.balance}, Marker: ${r.rowMarker} (${r.markerColor})`);
  });

  const finalBalance = rows[rows.length - 1].balance;
  const footer = deriveFooterMarker('quantity', finalBalance, () => ({}));
  console.log(`\nClosing Balance: ${finalBalance} KG, Marker: ${footer.marker} (${footer.color})`);

  // Assertions
  if (rows[0].balance === 5925 && rows[0].rowMarker === 'جمع') {
    console.log('✔ Row 1 correct: 5,925 جمع');
  } else {
    throw new Error('Row 1 assertion failed');
  }

  if (rows[1].balance === 7725 && rows[1].rowMarker === 'جمع') {
    console.log('✔ Row 2 correct: 7,725 جمع');
  } else {
    throw new Error('Row 2 assertion failed');
  }

  if (rows[2].balance === 725 && rows[2].rowMarker === 'جمع') {
    console.log('✔ Row 3 correct: 725 جمع');
  } else {
    throw new Error('Row 3 assertion failed');
  }

  if (finalBalance === 725 && footer.marker === 'جمع') {
    console.log('✔ Footer correct: 725 KG جمع');
  } else {
    throw new Error('Footer assertion failed');
  }

  // Negative balance scenario (-50 KG)
  const negFooter = deriveFooterMarker('quantity', -50, () => ({}));
  console.log(`\nNegative Stock Balance: -50 KG, Marker: ${negFooter.marker} (${negFooter.color})`);
  if (negFooter.marker === 'بنام' && negFooter.color === '#dc2626') {
    console.log('✔ Negative stock correctly shows بنام in red (#dc2626)');
  } else {
    throw new Error('Negative assertion failed');
  }
}

testScenario();
