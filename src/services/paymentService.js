import { db } from '../db/database.js';
import { cashBookService } from './cashBookService.js';

export const paymentService = {
  async getAll() {
    return await db.payments.reverse().toArray();
  },

  async add(paymentData) {
    const id = paymentData.id || 'pay_' + Date.now();
    const count = await db.payments.count();
    const no = paymentData.no || `PAY-${String(count + 1).padStart(4, '0')}`;
    const amount = Number(paymentData.amount || 0);

    const newPayment = {
      id,
      no,
      date: paymentData.date || new Date().toISOString().split('T')[0],
      partyId: paymentData.partyId,
      partyName: paymentData.partyName,
      amount,
      account: paymentData.account || 'Cash',
      description: paymentData.description || '',
    };

    await db.payments.add(newPayment);

    // Update supplier party balance (reduces supplier payable debt or increases customer advance)
    if (paymentData.partyId) {
      const party = await db.parties.get(paymentData.partyId);
      if (party) {
        await db.parties.update(party.id, {
          balance: Number(party.balance || 0) - amount,
        });
      }
    }

    // Cash movement vs Bank movement
    if (paymentData.account === 'Cash') {
      await cashBookService.addEntry({
        date: newPayment.date,
        type: 'Payment',
        partyId: paymentData.partyId,
        partyName: paymentData.partyName,
        debit: amount,
        credit: 0,
        description: paymentData.description || `Cash payment ${no} to ${paymentData.partyName}`,
        linkedTransactionId: id,
      });
    } else {
      // Update specific bank account balance
      const accountObj = await db.accounts.where({ name: paymentData.account }).first();
      if (accountObj) {
        await db.accounts.update(accountObj.id, {
          balance: Math.max(0, Number(accountObj.balance || 0) - amount),
        });
      }
    }

    return newPayment;
  },

  async delete(id) {
    return await db.payments.delete(id);
  },
};
