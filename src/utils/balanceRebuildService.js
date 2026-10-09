import { db } from '../db/database.js';

/**
 * Rebuilds and synchronizes all Party balances, Cash Book entries, Capital entries,
 * and Bank account balances from underlying source vouchers and transactions.
 * Corrects any legacy inverted party signs and ensures all JV lines (Cash, Capital, Party, Bank)
 * are properly reflected in account balances and ledgers.
 */
export async function rebuildBalancesFromVouchers() {
  let stats = {
    partiesUpdated: 0,
    cashEntriesCreated: 0,
    capitalEntriesCreated: 0,
    accountsUpdated: 0,
  };

  await db.transaction(
    'rw',
    [
      db.parties,
      db.purchases,
      db.sales,
      db.receipts,
      db.payments,
      db.cashBookEntries,
      db.accounts,
      db.journalEntries,
      db.capitalEntries,
      db.bankTransfers,
    ],
    async () => {
      const parties = await db.parties.toArray();
      const purchases = await db.purchases.toArray();
      const sales = await db.sales.toArray();
      const receipts = await db.receipts.toArray();
      const payments = await db.payments.toArray();
      const cashBookEntries = await db.cashBookEntries.toArray();
      const journalEntries = db.journalEntries ? await db.journalEntries.toArray() : [];

      // 1. Recalculate Party balances
      // App convention: party.balance > 0 = payable (we owe), < 0 = receivable.
      // Purchase does balance + total, Sale does balance - total
      // Receipt does balance + amount, Payment does balance - amount
      // CashBook: CashGiven does balance - debit; CashReceived does balance + credit
      // Journal: balance - deb + cred (Credit increases payable; Debit reduces it/creates receivable)
      for (const p of parties) {
        let bal = Number(p.openingBalance || 0);

        purchases.forEach((pur) => {
          if (pur.supplierId === p.id || pur.partyId === p.id) {
            bal += Number(pur.total || 0);
          }
        });

        sales.forEach((s) => {
          if (s.customerId === p.id || s.partyId === p.id) {
            bal -= Number(s.total || 0);
          }
        });

        receipts.forEach((r) => {
          if (r.partyId === p.id) {
            bal += Number(r.amount || 0);
          }
        });

        payments.forEach((pay) => {
          if (pay.partyId === p.id) {
            bal -= Number(pay.amount || 0);
          }
        });

        cashBookEntries.forEach((cb) => {
          if (cb.partyId === p.id) {
            if (cb.type === 'CashGiven' || cb.debit > 0) {
              bal -= Number(cb.debit || 0);
            }
            if (cb.type === 'CashReceived' || cb.credit > 0) {
              bal += Number(cb.credit || 0);
            }
          }
        });

        journalEntries.forEach((jv) => {
          (jv.lines || []).forEach((l) => {
            if (l.accountType === 'party' && (l.accountId === p.id || l.accountName === p.name)) {
              const deb = Number(l.debit || 0);
              const cred = Number(l.credit || 0);
              bal = bal - deb + cred;
            }
          });
        });

        await db.parties.update(p.id, { balance: bal });
        stats.partiesUpdated++;
      }

      // 2. Ensure Journal cash lines exist in Cash Book
      for (const jv of journalEntries) {
        for (const l of jv.lines || []) {
          if (l.accountType === 'cash') {
            const deb = Number(l.debit || 0);
            const cred = Number(l.credit || 0);
            if (deb > 0 || cred > 0) {
              const allCurrentCb = await db.cashBookEntries.toArray();
              const existingCb = allCurrentCb.find(
                (cb) => cb.linkedTransactionId === jv.id || cb.description?.includes(jv.no || jv.refNo)
              );
              if (!existingCb) {
                await db.cashBookEntries.add({
                  id: `cb_jv_${jv.id}_${Math.random().toString(36).substr(2, 4)}`,
                  date: jv.date,
                  type: 'Journal',
                  debit: cred,
                  credit: deb,
                  description: `JV ${jv.no || jv.refNo}${l.detail ? ' - ' + l.detail : (jv.narration ? ' - ' + jv.narration : '')}`,
                  linkedTransactionId: jv.id,
                });
                stats.cashEntriesCreated++;
              }
            }
          }
        }
      }

      // 3. Ensure Journal capital lines exist in Capital entries
      if (db.capitalEntries) {
        for (const jv of journalEntries) {
          for (const l of jv.lines || []) {
            if (l.accountType === 'capital') {
              const deb = Number(l.debit || 0);
              const cred = Number(l.credit || 0);
              const jvRef = jv.no || jv.refNo || 'JV';
              const capDesc = `JV ${jvRef}${l.detail ? ' - ' + l.detail : ''}`;
              const allCap = await db.capitalEntries.toArray();
              const existingCap = allCap.find((c) => c.description?.includes(jvRef));
              if (!existingCap) {
                if (cred > 0) {
                  await db.capitalEntries.add({
                    id: `cap_jv_${jv.id}_${Math.random().toString(36).substr(2, 4)}`,
                    date: jv.date,
                    type: 'Add',
                    amount: cred,
                    description: capDesc,
                  });
                  stats.capitalEntriesCreated++;
                }
                if (deb > 0) {
                  await db.capitalEntries.add({
                    id: `cap_jv_${jv.id}_${Math.random().toString(36).substr(2, 4)}`,
                    date: jv.date,
                    type: 'Withdraw',
                    amount: deb,
                    description: capDesc,
                  });
                  stats.capitalEntriesCreated++;
                }
              }
            }
          }
        }
      }

      // 4. Recalculate Cash account balance from Cash Book
      const refreshedCb = await db.cashBookEntries.toArray();
      const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
      if (cashAcc) {
        let cashBal = Number(cashAcc.openingBalance || 0);
        refreshedCb.forEach((cb) => {
          cashBal = cashBal - Number(cb.debit || 0) + Number(cb.credit || 0);
        });
        await db.accounts.update(cashAcc.id, { balance: cashBal });
        stats.accountsUpdated++;
      }

      // 5. Recalculate Bank account balances
      const bankTransfers = await db.bankTransfers.toArray();
      const bankAccounts = (await db.accounts.toArray()).filter((a) => !a.name.toLowerCase().includes('cash'));
      for (const b of bankAccounts) {
        let bBal = Number(b.openingBalance || 0);

        bankTransfers.forEach((trf) => {
          if (trf.bankAccountId === b.id || trf.bankAccountName === b.name) {
            if (trf.type === 'Deposit') bBal += Number(trf.amount || 0);
            if (trf.type === 'Withdrawal') bBal -= Number(trf.amount || 0);
          }
        });

        receipts.forEach((r) => {
          if (r.account === b.name || r.account === b.id) {
            bBal += Number(r.amount || 0);
          }
        });

        payments.forEach((p) => {
          if (p.account === b.name || p.account === b.id) {
            bBal -= Number(p.amount || 0);
          }
        });

        refreshedCb.forEach((cb) => {
          if (cb.bankAccountId === b.id || cb.bankAccountName === b.name) {
            if (cb.type === 'Deposit') bBal += Number(cb.debit || 0);
            if (cb.type === 'Withdrawal') bBal -= Number(cb.credit || 0);
          }
        });

        journalEntries.forEach((jv) => {
          (jv.lines || []).forEach((l) => {
            if (l.accountType === 'bank' && (l.accountId === b.id || l.accountName === b.name)) {
              bBal = bBal + Number(l.debit || 0) - Number(l.credit || 0);
            }
          });
        });

        await db.accounts.update(b.id, { balance: bBal });
        stats.accountsUpdated++;
      }
    }
  );

  return stats;
}
