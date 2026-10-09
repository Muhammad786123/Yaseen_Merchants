import 'fake-indexeddb/auto';
import { db, clearAllDatabaseData, initDatabase } from '../src/db/database.js';
import { cashBookService } from '../src/services/cashBookService.js';
import { capitalService } from '../src/services/capitalService.js';
import { purchaseService } from '../src/services/purchaseService.js';
import { saleService } from '../src/services/saleService.js';
import { salePurchaseService } from '../src/services/salePurchaseService.js';
import { rebuildBalancesFromVouchers } from '../src/utils/balanceRebuildService.js';

async function runVerification() {
  console.log('=== Starting Journal Voucher & Trial Balance Verification ===\n');

  // Step 1: Initialize and clear database
  await clearAllDatabaseData();
  console.log('1. Database cleared to clean baseline state.');

  // Step 2: Create test parties
  const sup1 = { id: 'sup_1', code: '1001', name: 'Al-Madina Cotton Mill', type: 'Supplier', balance: 0 };
  const sup2 = { id: 'sup_2', code: '1002', name: 'Bismillah Textile Works', type: 'Supplier', balance: 0 };
  const cust1 = { id: 'cust_1', code: '2001', name: 'Crescent Weaving Corp', type: 'Customer', balance: 0 };
  await db.parties.bulkAdd([sup1, sup2, cust1]);
  console.log('2. Created 3 test parties (2 Suppliers, 1 Customer).');

  // Step 3: Enter JV-0001
  const jvRef = 'JV-0001';
  const date = '2026-10-09';
  const narration = 'Opening adjustment voucher';
  const validLines = [
    { accountType: 'party', accountId: 'sup_1', accountName: 'Al-Madina Cotton Mill', detail: 'Party Credit', debit: 0, credit: 116000 },
    { accountType: 'party', accountId: 'sup_2', accountName: 'Bismillah Textile Works', detail: 'Party Credit', debit: 0, credit: 121000 },
    { accountType: 'mall', accountId: 'mall', accountName: 'Mall A/C (Goods / Raw Material Inventory)', detail: 'Mall Debit', debit: 237000, credit: 0 },
    { accountType: 'cash', accountId: 'cash', accountName: 'Cash in Hand (Physical Cash)', detail: 'Cash Debit', debit: 3426000, credit: 0 },
    { accountType: 'bank', accountId: 'meezan', accountName: 'Meezan Bank', detail: 'Meezan Debit', debit: 1000000, credit: 0 },
    { accountType: 'capital', accountId: 'capital', accountName: 'Capital Account', detail: 'Owner Capital Credit', debit: 0, credit: 5000000 },
    { accountType: 'party', accountId: 'cust_1', accountName: 'Crescent Weaving Corp', detail: 'Party Debit', debit: 574000, credit: 0 },
  ];

  const totalDebit = validLines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = validLines.reduce((s, l) => s + l.credit, 0);
  console.log(`3. JV-0001 line totals: Total Debit = ${totalDebit.toLocaleString()}, Total Credit = ${totalCredit.toLocaleString()}`);
  if (totalDebit !== totalCredit || totalDebit !== 5237000) {
    throw new Error(`JV-0001 lines do not equal 5,237,000! Debit=${totalDebit}, Credit=${totalCredit}`);
  }

  const newEntry = {
    id: 'jv_test_001',
    no: jvRef,
    refNo: jvRef,
    date,
    narration,
    totalAmount: totalDebit,
    lines: validLines,
    createdAt: new Date().toISOString(),
  };

  // Perform Journal save using the updated transaction logic
  await db.transaction(
    'rw',
    [db.journalEntries, db.parties, db.accounts, db.cashBookEntries, db.capitalEntries],
    async () => {
      await db.journalEntries.add(newEntry);

      for (const line of validLines) {
        const deb = Number(line.debit) || 0;
        const cred = Number(line.credit) || 0;

        if (line.accountType === 'party') {
          const party = await db.parties.get(line.accountId);
          if (party) {
            const currentBal = Number(party.balance || 0);
            await db.parties.update(party.id, { balance: currentBal - deb + cred });
          }
        } else if (line.accountType === 'capital') {
          if (cred > 0) {
            await capitalService.addEntry({
              type: 'Add',
              amount: cred,
              date,
              description: `JV ${jvRef}${line.detail ? ' - ' + line.detail : ''}`,
            });
          }
          if (deb > 0) {
            await capitalService.addEntry({
              type: 'Withdraw',
              amount: deb,
              date,
              description: `JV ${jvRef}${line.detail ? ' - ' + line.detail : ''}`,
            });
          }
        } else if (line.accountType === 'cash') {
          await cashBookService.addEntry({
            date,
            type: 'Journal',
            debit: cred,
            credit: deb,
            description: `JV ${jvRef}${line.detail ? ' - ' + line.detail : ''}`,
            linkedTransactionId: newEntry.id,
          });
        } else if (line.accountType === 'bank') {
          const bank = (await db.accounts.get(line.accountId)) || (await db.accounts.where({ name: line.accountName }).first());
          if (bank) {
            const currentBal = Number(bank.balance || 0);
            await db.accounts.update(bank.id, { balance: currentBal + deb - cred });
          }
        }
      }
    }
  );
  console.log('4. JV-0001 posted successfully inside Dexie transaction.');

  // Step 4: Verify Postings
  const p1 = await db.parties.get('sup_1');
  const p2 = await db.parties.get('sup_2');
  const c1 = await db.parties.get('cust_1');
  console.log(`\n--- Party Balances Check ---`);
  console.log(`sup_1 (Al-Madina) balance: ${p1.balance} (Expected: 116,000 Payable > 0)`);
  console.log(`sup_2 (Bismillah) balance: ${p2.balance} (Expected: 121,000 Payable > 0)`);
  console.log(`cust_1 (Crescent) balance: ${c1.balance} (Expected: -574,000 Receivable < 0)`);

  if (p1.balance !== 116000 || p2.balance !== 121000 || c1.balance !== -574000) {
    throw new Error('Party balances incorrect!');
  }

  const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
  const meezanAcc = await db.accounts.get('meezan');
  const capBal = await capitalService.getBalance();
  const cbEntries = await db.cashBookEntries.toArray();

  console.log(`\n--- Cash & Accounts Check ---`);
  console.log(`Cash account balance: ${cashAcc.balance} (Expected: 3,426,000)`);
  console.log(`Cash Book entries count: ${cbEntries.length} (Expected: 1)`);
  console.log(`Cash Book entry credit: ${cbEntries[0].credit} (Expected: 3,426,000 Jamma/Inflow)`);
  console.log(`Meezan Bank balance: ${meezanAcc.balance} (Expected: 1,000,000)`);
  console.log(`Capital balance: ${capBal} (Expected: 5,000,000)`);

  if (cashAcc.balance !== 3426000 || cbEntries[0].credit !== 3426000 || meezanAcc.balance !== 1000000 || capBal !== 5000000) {
    throw new Error('Account balances incorrect!');
  }

  // Step 5: Trial Balance Equilibrium Verification
  const allParties = await db.parties.toArray();
  const receivableParties = allParties.filter((p) => Number(p.balance || 0) < 0);
  const totalReceivables = receivableParties.reduce((sum, p) => sum + Math.abs(Number(p.balance || 0)), 0);

  const payableParties = allParties.filter((p) => Number(p.balance || 0) > 0);
  const totalPayables = payableParties.reduce((sum, p) => sum + Number(p.balance || 0), 0);

  const jentries = await db.journalEntries.toArray();
  const jvMallCredit = jentries.flatMap(j => j.lines || [])
    .filter(l => l.accountType === 'mall' || l.accountType === 'expense')
    .reduce((s, l) => s + Number(l.credit || 0) - Number(l.debit || 0), 0);
  const totalSales = 0;
  const totalPurchases = 0;
  const totalExpenses = 0;
  const stockValuation = 0;
  const mallNetPosition = totalSales - (totalPurchases + totalExpenses) + jvMallCredit;
  const mallTradingBalance = mallNetPosition + stockValuation;

  const sumDebits =
    Number(cashAcc.balance || 0) +
    Number(meezanAcc.balance || 0) +
    totalReceivables +
    stockValuation +
    (mallTradingBalance < 0 ? Math.abs(mallTradingBalance) : 0);

  const sumCredits =
    totalPayables +
    capBal +
    (mallTradingBalance >= 0 ? mallTradingBalance : 0);

  const diff = Math.abs(sumDebits - sumCredits);
  console.log(`\n--- Trial Balance Statement Check ---`);
  console.log(`Total Receivables (Debit): ${totalReceivables.toLocaleString()}`);
  console.log(`Total Payables (Credit): ${totalPayables.toLocaleString()}`);
  console.log(`Mall Net Position: ${mallNetPosition.toLocaleString()}`);
  console.log(`Mall Trading Balance (Debit side): ${Math.abs(mallTradingBalance).toLocaleString()}`);
  console.log(`SUM DEBITS:  ${sumDebits.toLocaleString()}`);
  console.log(`SUM CREDITS: ${sumCredits.toLocaleString()}`);
  console.log(`DIFFERENCE:  ${diff}`);

  if (diff !== 0 || sumDebits !== 5237000 || sumCredits !== 5237000) {
    throw new Error(`Trial Balance is OUT OF BALANCE! Diff = ${diff}`);
  }
  console.log(`>>> PASS: Trial Balance is 100% Balanced with 0 Difference! <<<`);

  // Step 6: Verify SalePurchaseLedger
  const mallSummary = await salePurchaseService.getSummary();
  console.log(`\n--- Sale Purchase (Mall A/C) Ledger Check ---`);
  console.log(`Mall A/C Net Balance: ${mallSummary.netBalance} (Matches mallNetPosition: ${mallNetPosition})`);
  console.log(`Journal Adjustments: ${mallSummary.jvAdjustments}`);
  if (mallSummary.netBalance !== mallNetPosition || mallSummary.jvAdjustments !== -237000) {
    throw new Error('Mall A/C Ledger summary does not match Trial Balance mallNetPosition!');
  }
  console.log(`>>> PASS: Mall A/C Ledger matches Trial Balance perfectly! <<<`);

  // Step 7: Enter 4 mixed transactions (Purchase, Sale, Cash Book, Journal)
  console.log(`\n--- Entering 4 Mixed Transactions ---`);
  // 1. Purchase of 200,000 from sup_1 (on credit)
  await purchaseService.add({
    date: '2026-10-10',
    supplierId: 'sup_1',
    supplierName: 'Al-Madina Cotton Mill',
    items: [{ itemName: 'Comber Noil', quantity: 100, weight: 1000, rate: 200, total: 200000 }],
    total: 200000,
    paid: 0,
    balance: 200000,
  });
  console.log('+ Transaction 1: Purchase Rs. 200,000 from sup_1');

  // 2. Sale of 350,000 to cust_1 (on credit)
  await saleService.add({
    date: '2026-10-10',
    customerId: 'cust_1',
    customerName: 'Crescent Weaving Corp',
    items: [{ itemName: 'Processed Yarn', quantity: 50, weight: 500, rate: 700, total: 350000 }],
    total: 350000,
    received: 0,
    balance: 350000,
  });
  console.log('+ Transaction 2: Sale Rs. 350,000 to cust_1');

  // 3. Cash payment to sup_2: Rs. 50,000 from physical Cash
  await cashBookService.giveCashToParty({
    date: '2026-10-10',
    partyId: 'sup_2',
    partyName: 'Bismillah Textile Works',
    amount: 50000,
    description: 'Cash payment to supplier',
  });
  console.log('+ Transaction 3: Cash Book Payment Rs. 50,000 to sup_2');

  // 4. JV-0002: Transfer 100,000 from Meezan Bank to HBL
  const hblAcc = await db.accounts.where({ name: 'HBL' }).first();
  const jv2Lines = [
    { accountType: 'bank', accountId: hblAcc.id, accountName: 'HBL', debit: 100000, credit: 0 },
    { accountType: 'bank', accountId: 'meezan', accountName: 'Meezan Bank', debit: 0, credit: 100000 },
  ];
  await db.transaction(
    'rw',
    [db.journalEntries, db.parties, db.accounts, db.cashBookEntries, db.capitalEntries],
    async () => {
      await db.journalEntries.add({
        id: 'jv_test_002',
        no: 'JV-0002',
        refNo: 'JV-0002',
        date: '2026-10-10',
        narration: 'Interbank funds transfer',
        totalAmount: 100000,
        lines: jv2Lines,
        createdAt: new Date().toISOString(),
      });
      await db.accounts.update(hblAcc.id, { balance: Number(hblAcc.balance || 0) + 100000 });
      await db.accounts.update('meezan', { balance: Number(meezanAcc.balance || 0) - 100000 });
    }
  );
  console.log('+ Transaction 4: JV-0002 Bank Transfer Rs. 100,000 (Meezan -> HBL)');

  // Step 8: Re-verify Trial Balance after mixed transactions
  const partiesAfter = await db.parties.toArray();
  const recAfter = partiesAfter.filter((p) => Number(p.balance || 0) < 0).reduce((s, p) => s + Math.abs(Number(p.balance || 0)), 0);
  const payAfter = partiesAfter.filter((p) => Number(p.balance || 0) > 0).reduce((s, p) => s + Number(p.balance || 0), 0);
  const cashAfter = await db.accounts.where({ name: 'Cash' }).first();
  const bankAccountsAfter = (await db.accounts.toArray()).filter((a) => !a.name.toLowerCase().includes('cash'));
  const bankSumAfter = bankAccountsAfter.reduce((s, a) => s + Number(a.balance || 0), 0);
  const capAfter = await capitalService.getBalance();

  const jentriesAfter = await db.journalEntries.toArray();
  const jvMallCrAfter = jentriesAfter.flatMap(j => j.lines || [])
    .filter(l => l.accountType === 'mall' || l.accountType === 'expense')
    .reduce((s, l) => s + Number(l.credit || 0) - Number(l.debit || 0), 0);

  const purchasesAfter = await db.purchases.toArray();
  const salesAfter = await db.sales.toArray();
  const expensesAfter = await db.expenses.toArray();
  const totPurAfter = purchasesAfter.reduce((s, p) => s + Number(p.total || 0), 0);
  const totSalAfter = salesAfter.reduce((s, p) => s + Number(p.total || 0), 0);
  const totExpAfter = expensesAfter.reduce((s, p) => s + Number(p.amount || 0), 0);

  const mallNetAfter = totSalAfter - (totPurAfter + totExpAfter) + jvMallCrAfter;
  const mallTradingAfter = mallNetAfter; // stockValuation = 0

  const debitsAfter =
    Number(cashAfter.balance || 0) +
    bankSumAfter +
    recAfter +
    (mallTradingAfter < 0 ? Math.abs(mallTradingAfter) : 0);

  const creditsAfter =
    payAfter +
    capAfter +
    (mallTradingAfter >= 0 ? mallTradingAfter : 0);

  const diffAfter = Math.abs(debitsAfter - creditsAfter);
  console.log(`\n--- Trial Balance After Mixed Transactions ---`);
  console.log(`Cash in Hand: ${cashAfter.balance.toLocaleString()}`);
  console.log(`Bank Accounts Total: ${bankSumAfter.toLocaleString()}`);
  console.log(`Receivables: ${recAfter.toLocaleString()}`);
  console.log(`Payables: ${payAfter.toLocaleString()}`);
  console.log(`Mall Net Position: ${mallNetAfter.toLocaleString()}`);
  console.log(`SUM DEBITS:  ${debitsAfter.toLocaleString()}`);
  console.log(`SUM CREDITS: ${creditsAfter.toLocaleString()}`);
  console.log(`DIFFERENCE:  ${diffAfter}`);

  if (diffAfter !== 0) {
    throw new Error(`Trial Balance is out of balance after mixed transactions! Diff = ${diffAfter}`);
  }
  console.log(`>>> PASS: Trial Balance remains 100% Balanced after mixed transactions! <<<`);

  // Step 9: Test rebuildBalancesFromVouchers
  console.log(`\n--- Testing rebuildBalancesFromVouchers ---`);
  // Deliberately tamper with one party balance to simulate legacy inverted data
  await db.parties.update('sup_1', { balance: -999999 });
  const tamperedP1 = await db.parties.get('sup_1');
  console.log(`Tampered sup_1 balance: ${tamperedP1.balance}`);

  const rebuildStats = await rebuildBalancesFromVouchers();
  console.log(`Rebuild stats:`, rebuildStats);

  const repairedP1 = await db.parties.get('sup_1');
  console.log(`Repaired sup_1 balance: ${repairedP1.balance}`);
  // Original sup_1: JV credit 116,000 + Purchase 200,000 = 316,000
  if (repairedP1.balance !== 316000) {
    throw new Error(`Rebuild failed to restore sup_1 balance! Found: ${repairedP1.balance}, Expected: 316,000`);
  }
  console.log(`>>> PASS: rebuildBalancesFromVouchers restored all balances accurately! <<<`);

  console.log('\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
}

runVerification().catch((err) => {
  console.error('\n*** TEST FAILED ***\n', err);
  process.exit(1);
});
