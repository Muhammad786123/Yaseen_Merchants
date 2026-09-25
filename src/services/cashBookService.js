import { db } from '../db/database.js';

export const cashBookService = {
  async getAll() {
    const entries = await db.cashBookEntries.toArray();
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    let running = 250000; // Base cash account opening
    const calculated = entries.map((entry) => {
      const debit = Number(entry.debit || 0);
      const credit = Number(entry.credit || 0);
      running = running - debit + credit;
      return {
        ...entry,
        balance: running,
      };
    });

    return calculated.reverse();
  },

  async addEntry(entryData) {
    const id = entryData.id || 'cb_' + Date.now() + Math.random().toString(36).substr(2, 4);
    const debit = Number(entryData.debit || 0);
    const credit = Number(entryData.credit || 0);

    const newEntry = {
      id,
      date: entryData.date || new Date().toISOString().split('T')[0],
      type: entryData.type || 'General',
      partyId: entryData.partyId || null,
      partyName: entryData.partyName || null,
      bankAccountId: entryData.bankAccountId || null,
      bankAccountName: entryData.bankAccountName || null,
      debit,
      credit,
      description: entryData.description || '',
      linkedTransactionId: entryData.linkedTransactionId || null,
    };

    await db.cashBookEntries.add(newEntry);

    // Update physical Cash account balance in accounts table
    const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
    if (cashAcc) {
      await db.accounts.update(cashAcc.id, {
        balance: Number(cashAcc.balance || 0) - debit + credit,
      });
    }

    return newEntry;
  },

  /**
   * Cash -> Bank Deposit
   * Physical Cash decreases (Debit in Cash Book), Bank Account balance increases.
   * Does NOT touch any Party balance.
   */
  async depositToBank({ date, bankAccountId, bankAccountName, amount, description }) {
    const numAmount = Number(amount || 0);
    const trfId = 'trf_' + Date.now();
    const count = await db.bankTransfers.count();
    const no = `TRF-${String(count + 1).padStart(4, '0')}`;

    // 1. Create single linked Bank Transfer record
    await db.bankTransfers.add({
      id: trfId,
      no,
      date: date || new Date().toISOString().split('T')[0],
      type: 'Deposit',
      bankAccountId,
      bankAccountName,
      amount: numAmount,
      description: description || `Cash deposited to ${bankAccountName}`,
    });

    // 2. Increase target Bank account balance
    const targetBank = await db.accounts.get(bankAccountId);
    if (targetBank) {
      await db.accounts.update(targetBank.id, {
        balance: Number(targetBank.balance || 0) + numAmount,
      });
    } else {
      const bankByName = await db.accounts.where({ name: bankAccountName }).first();
      if (bankByName) {
        await db.accounts.update(bankByName.id, {
          balance: Number(bankByName.balance || 0) + numAmount,
        });
      }
    }

    // 3. Create Cash Book entry (Cash Out)
    return await this.addEntry({
      date,
      type: 'Deposit',
      bankAccountId,
      bankAccountName,
      debit: numAmount,
      credit: 0,
      description: description || `Deposit to ${bankAccountName}`,
      linkedTransactionId: trfId,
    });
  },

  /**
   * Bank -> Cash Withdrawal
   * Physical Cash increases (Credit in Cash Book), Bank Account balance decreases.
   * Does NOT touch any Party balance.
   */
  async withdrawFromBank({ date, bankAccountId, bankAccountName, amount, description }) {
    const numAmount = Number(amount || 0);
    const trfId = 'trf_' + Date.now();
    const count = await db.bankTransfers.count();
    const no = `TRF-${String(count + 1).padStart(4, '0')}`;

    // 1. Create single linked Bank Transfer record
    await db.bankTransfers.add({
      id: trfId,
      no,
      date: date || new Date().toISOString().split('T')[0],
      type: 'Withdrawal',
      bankAccountId,
      bankAccountName,
      amount: numAmount,
      description: description || `Cash withdrawn from ${bankAccountName}`,
    });

    // 2. Decrease target Bank account balance
    const targetBank = await db.accounts.get(bankAccountId);
    if (targetBank) {
      await db.accounts.update(targetBank.id, {
        balance: Math.max(0, Number(targetBank.balance || 0) - numAmount),
      });
    } else {
      const bankByName = await db.accounts.where({ name: bankAccountName }).first();
      if (bankByName) {
        await db.accounts.update(bankByName.id, {
          balance: Math.max(0, Number(bankByName.balance || 0) - numAmount),
        });
      }
    }

    // 3. Create Cash Book entry (Cash In)
    return await this.addEntry({
      date,
      type: 'Withdrawal',
      bankAccountId,
      bankAccountName,
      debit: 0,
      credit: numAmount,
      description: description || `Withdrawal from ${bankAccountName}`,
      linkedTransactionId: trfId,
    });
  },

  /**
   * Cash Given to Party (Advance, Loan, or Payment)
   * Physical Cash decreases (Debit in Cash Book), Party balance changes.
   */
  async giveCashToParty({ date, partyId, partyName, amount, description }) {
    const numAmount = Number(amount || 0);

    // 1. Update Party Balance
    if (partyId) {
      const party = await db.parties.get(partyId);
      if (party) {
        await db.parties.update(party.id, {
          balance: Number(party.balance || 0) - numAmount,
        });
      }
    }

    // 2. Record in Cash Book
    return await this.addEntry({
      date,
      type: 'CashGiven',
      partyId,
      partyName,
      debit: numAmount,
      credit: 0,
      description: description || `Cash given to ${partyName}`,
    });
  },

  /**
   * Cash Received from Party (Receipt or Refund)
   * Physical Cash increases (Credit in Cash Book), Party balance changes.
   */
  async receiveCashFromParty({ date, partyId, partyName, amount, description }) {
    const numAmount = Number(amount || 0);

    // 1. Update Party Balance (only Party A/C touched, nothing else)
    if (partyId) {
      const party = await db.parties.get(partyId);
      if (party) {
        await db.parties.update(party.id, {
          balance: Number(party.balance || 0) + numAmount,
        });
      }
    }

    // 2. Record in Cash Book
    return await this.addEntry({
      date,
      type: 'CashReceived',
      partyId,
      partyName,
      debit: 0,
      credit: numAmount,
      description: description || `Cash received from ${partyName}`,
    });
  },
};
