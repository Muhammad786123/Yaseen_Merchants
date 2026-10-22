// Verification script for IssueForm availability and validation logic

const stockEntries = [
  {
    itemId: 'it_socks_waste',
    itemName: 'سوکس ویسٹ',
    quality: 'Fine',
    warehouseName: 'godam no 1',
    qty: 6125,
    avgRate: 40.98,
  },
  {
    itemId: 'it_socks_waste',
    itemName: 'سوکس ویسٹ',
    quality: 'Fine',
    warehouseName: 'godam no 2',
    qty: 150,
    avgRate: 40.98,
  },
];

const items = [
  { id: 'it_socks_waste', name: 'سوکس ویسٹ' },
];

function simulateLineComputation(line, fromWarehouse, lines = [line], idx = 0) {
  const selectedItem = items.find((i) => i.id === line.itemId);
  const computedQtyKg = Number(line.issueQtyInput || 0);

  const itemMatches = (s) =>
    s.itemId === line.itemId ||
    (selectedItem && (s.itemName || '').toLowerCase() === (selectedItem.name || '').toLowerCase());

  const qualityMatches = (s) =>
    !line.quality || (s.quality || '').trim().toLowerCase() === (line.quality || '').trim().toLowerCase();

  const matchingEntries = line.itemId
    ? stockEntries.filter((s) => itemMatches(s) && qualityMatches(s))
    : [];

  const godownRawMap = {};
  matchingEntries.forEach((s) => {
    const wName = s.warehouseName || s.warehouseId || 'Main Godown';
    godownRawMap[wName] = (godownRawMap[wName] || 0) + Number(s.qty || 0);
  });

  if (fromWarehouse && !godownRawMap[fromWarehouse]) {
    godownRawMap[fromWarehouse] = 0;
  }

  let priorUsedInFromWarehouse = 0;
  if (fromWarehouse) {
    priorUsedInFromWarehouse = lines
      .slice(0, idx)
      .filter((l) => {
        const sameItem =
          l.itemId === line.itemId ||
          (selectedItem && (l.itemName || '').toLowerCase() === (selectedItem.name || '').toLowerCase());
        const sameQuality =
          !line.quality || (l.quality || '').trim().toLowerCase() === (line.quality || '').trim().toLowerCase();
        return sameItem && sameQuality;
      })
      .reduce((sum, l) => sum + Number(l.issueQtyInput || 0), 0);
  }

  const godownsList = Object.keys(godownRawMap).map((wName) => {
    const raw = godownRawMap[wName];
    const isFromWh = fromWarehouse && fromWarehouse.trim().toLowerCase() === wName.trim().toLowerCase();
    const priorUsed = isFromWh ? priorUsedInFromWarehouse : 0;
    const available = raw - priorUsed;
    return { name: wName, raw, available };
  });

  const totalAllGodowns = godownsList.reduce((sum, g) => sum + g.available, 0);

  let availableInSelected = 0;
  if (fromWarehouse) {
    const found = godownsList.find(
      (g) => g.name.trim().toLowerCase() === fromWarehouse.trim().toLowerCase()
    );
    availableInSelected = found ? found.available : 0;
  }

  let amberWarning = null;
  let redWarning = false;

  if (fromWarehouse && line.itemId && computedQtyKg > 0) {
    if (computedQtyKg > availableInSelected && computedQtyKg <= totalAllGodowns) {
      const otherGodowns = godownsList
        .filter((g) => g.name.trim().toLowerCase() !== fromWarehouse.trim().toLowerCase() && g.available > 0)
        .sort((a, b) => b.available - a.available);
      const targetGodown = otherGodowns.find((g) => g.available >= computedQtyKg) || otherGodowns[0];
      if (targetGodown) {
        amberWarning = { otherGodown: targetGodown };
      } else {
        redWarning = true;
      }
    } else if (computedQtyKg > totalAllGodowns) {
      redWarning = true;
    }
  }

  return {
    totalAllGodowns,
    availableInSelected,
    godownsList,
    amberWarning,
    redWarning,
    isAccepted: fromWarehouse && computedQtyKg > 0 && computedQtyKg <= availableInSelected,
  };
}

console.log('--- STEP 1: item سوکس ویسٹ with no godown selected ---');
let line = { itemId: 'it_socks_waste', quality: '', issueQtyInput: 275 };
let res1 = simulateLineComputation(line, '');
console.log('Total stock (all godowns):', res1.totalAllGodowns, 'KG (expected: 6275)');
console.log('Godowns breakdown:', res1.godownsList.map(g => `${g.name}: ${g.available} KG`).join(' | '));
if (res1.totalAllGodowns !== 6275) {
  console.error('FAILED: totalAllGodowns !== 6275');
  process.exit(1);
}

console.log('\n--- STEP 2: selecting godam no 2 and issue 275 KG ---');
let res2 = simulateLineComputation(line, 'godam no 2');
console.log('Available in godam no 2:', res2.availableInSelected, 'KG (expected: 150)');
console.log('Amber warning present?', !!res2.amberWarning);
if (res2.amberWarning) {
  const msg = `Only ${res2.availableInSelected} KG in godam no 2. ${res2.amberWarning.otherGodown.available} KG is in ${res2.amberWarning.otherGodown.name} - choose that godown or reduce the quantity`;
  console.log('Amber message text:', msg);
  console.log('Button text:', `Use ${res2.amberWarning.otherGodown.name}`);
  if (res2.availableInSelected !== 150 || res2.amberWarning.otherGodown.name !== 'godam no 1' || res2.amberWarning.otherGodown.available !== 6125) {
    console.error('FAILED: Amber warning details mismatch');
    process.exit(1);
  }
} else {
  console.error('FAILED: Expected amber warning');
  process.exit(1);
}

console.log('\n--- STEP 3: selecting godam no 1 and issue 275 KG ---');
let res3 = simulateLineComputation(line, 'godam no 1');
console.log('Available in godam no 1:', res3.availableInSelected, 'KG (expected: 6125)');
console.log('Amber warning present?', !!res3.amberWarning, '(expected false)');
console.log('Is issue accepted?', res3.isAccepted, '(expected true)');
if (res3.availableInSelected !== 6125 || res3.amberWarning || !res3.isAccepted) {
  console.error('FAILED: Issue should be accepted for godam no 1');
  process.exit(1);
}

console.log('\n--- STEP 4: Multiple lines of the same item subtraction ---');
let line1 = { itemId: 'it_socks_waste', quality: '', issueQtyInput: 275 };
let line2 = { itemId: 'it_socks_waste', quality: '', issueQtyInput: 100 };
let resLine2 = simulateLineComputation(line2, 'godam no 1', [line1, line2], 1);
console.log('Line 2 Available in godam no 1:', resLine2.availableInSelected, 'KG (expected: 6125 - 275 = 5850)');
if (resLine2.availableInSelected !== 5850) {
  console.error('FAILED: Multiple lines subtraction mismatch');
  process.exit(1);
}

console.log('\nALL TEST CONDITIONS VERIFIED SUCCESSFULLY!');
