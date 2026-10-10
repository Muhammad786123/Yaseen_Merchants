import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import QuickActionCard from '../../components/dashboard/QuickActionCard.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import PurchaseForm from '../../components/forms/PurchaseForm.jsx';
import SaleForm from '../../components/forms/SaleForm.jsx';
import { useParties } from '../../hooks/useParties.js';
import { useItems } from '../../hooks/useItems.js';
import { usePurchases } from '../../hooks/usePurchases.js';
import { useSales } from '../../hooks/useSales.js';
import { useStock } from '../../hooks/useStock.js';
import { useFinances } from '../../hooks/useFinances.js';
import { useWarehouses } from '../../hooks/useWarehouses.js';
import { useApp } from '../../context/AppContext.jsx';
import { fmt, formatDate } from '../../utils/formatters.js';
import { splitPartyBalances } from '../../utils/partyBalances.js';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  BookOpen,
  Plus,
  ArrowRight,
  Scale,
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { showToast } = useApp();

  const { parties } = useParties();
  const { items } = useItems();
  const { purchases, addPurchase } = usePurchases();
  const { sales, addSale } = useSales();
  const { stockEntries } = useStock();
  const { accounts } = useFinances();
  const { warehouses } = useWarehouses();

  const [activeModal, setActiveModal] = useState(null); // 'purchase' | 'sale'

  // Summary Metrics Calculations
  const totalStockQty = stockEntries.reduce((sum, s) => sum + Number(s.qty || 0), 0);
  const totalStockVal = stockEntries.reduce((sum, s) => sum + Number(s.value || 0), 0);

  const { totalReceivable, totalPayable } = splitPartyBalances(parties);

  const totalCashBank = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

  const suppliers = parties.filter((p) => p.type === 'Supplier' || p.type === 'Both');
  const customers = parties.filter((p) => p.type === 'Customer' || p.type === 'Both');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard Overview"
        subtitle="Shahid Yaseen Cotton Waste Merchant — Textile trading, stock & Roznamcha monitoring"
        actions={
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setActiveModal('sale')}
            >
              New Sale
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => setActiveModal('purchase')}
            >
              New Purchase
            </Button>
          </div>
        }
      />

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Stock Inventory"
          value={`${totalStockQty.toLocaleString('en-PK')} KG`}
          sub={`Value: ${fmt(totalStockVal)}`}
          icon={Package}
          color="text-black"
          onClick={() => navigate('/stock')}
        />
        <StatCard
          label="Total Receivables"
          value={fmt(totalReceivable)}
          sub="Pending from Customers"
          icon={TrendingUp}
          color="text-[#1a6b2e]"
          onClick={() => navigate('/receivable')}
        />
        <StatCard
          label="Total Payables"
          value={fmt(totalPayable)}
          sub="Owed to Suppliers"
          icon={TrendingDown}
          color="text-red-700"
          onClick={() => navigate('/payable')}
        />
        <StatCard
          label="Cash & Bank Balance"
          value={fmt(totalCashBank)}
          sub={`${accounts.length} Active Accounts`}
          icon={DollarSign}
          color="text-blue-900"
          onClick={() => navigate('/cash-book')}
        />
      </div>

      {/* Quick Transaction Actions */}
      <div>
        <div className="border-b-2 border-black pb-1 mb-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-black">
            Quick Actions
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <QuickActionCard
            title="Create Purchase"
            description="Record raw material purchase invoice"
            icon={ShoppingCart}
            onClick={() => setActiveModal('purchase')}
          />
          <QuickActionCard
            title="Create Sale Invoice"
            description="Bill finished goods to customer"
            icon={TrendingUp}
            onClick={() => setActiveModal('sale')}
          />
          <QuickActionCard
            title="New Cash Book Entry"
            description="Roznamcha cash in / cash out (Credit/Debit)"
            icon={DollarSign}
            onClick={() => navigate('/cash-book')}
          />
          <QuickActionCard
            title="New Journal Entry"
            description="Multi-account general journal voucher (JV)"
            icon={BookOpen}
            onClick={() => navigate('/journal')}
          />
          <QuickActionCard
            title="Trial Balance"
            description="Total accounts sheet - Parties, Cash, Banks, Mall A/C"
            icon={Scale}
            onClick={() => navigate('/reports?tab=tb')}
          />
        </div>
      </div>

      {/* Recent Purchases & Sales in classic PERBALACC tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Purchases */}
        <div className="border-2 border-black bg-white">
          <div className="bg-[#DFDFDF] border-b-2 border-black px-3 py-2 flex items-center justify-between">
            <h3 className="text-xs font-black text-black uppercase tracking-wider">Recent Purchases</h3>
            <button
              type="button"
              onClick={() => navigate('/purchase')}
              className="text-xs font-bold text-blue-900 hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100 border-b border-black text-black font-bold">
                  <th className="border-e border-black px-2 py-1.5 text-start w-20">Bill #</th>
                  <th className="border-e border-black px-2 py-1.5 text-start">Supplier</th>
                  <th className="border-e border-black px-2 py-1.5 text-start w-20">Date</th>
                  <th className="border-e border-black px-2 py-1.5 text-left w-24" dir="ltr">Total</th>
                  <th className="px-2 py-1.5 text-center w-20">Status</th>
                </tr>
              </thead>
              <tbody>
                {purchases.slice(0, 5).map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate('/purchase')}
                    className="border-b border-black hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="border-e border-black px-2 py-1.5 font-mono font-bold text-black text-start">
                      {p.no}
                    </td>
                    <td className="border-e border-black px-2 py-1.5 font-semibold text-gray-900 truncate max-w-[150px] text-start">
                      {p.supplierName}
                    </td>
                    <td className="border-e border-black px-2 py-1.5 text-gray-700 whitespace-nowrap text-start">
                      {formatDate(p.date)}
                    </td>
                    <td className="border-e border-black px-2 py-1.5 font-mono font-bold text-left text-black whitespace-nowrap tabular-nums" dir="ltr">
                      {fmt(p.total)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {p.balance > 0 ? (
                        <Badge variant="amber">Due: {fmt(p.balance)}</Badge>
                      ) : (
                        <Badge variant="green">Paid</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500 font-medium">
                      No purchase invoices recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Sales */}
        <div className="border-2 border-black bg-white">
          <div className="bg-[#DFDFDF] border-b-2 border-black px-3 py-2 flex items-center justify-between">
            <h3 className="text-xs font-black text-black uppercase tracking-wider">Recent Sales</h3>
            <button
              type="button"
              onClick={() => navigate('/sale')}
              className="text-xs font-bold text-blue-900 hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100 border-b border-black text-black font-bold">
                  <th className="border-e border-black px-2 py-1.5 text-start w-20">Bill #</th>
                  <th className="border-e border-black px-2 py-1.5 text-start">Customer</th>
                  <th className="border-e border-black px-2 py-1.5 text-start w-20">Date</th>
                  <th className="border-e border-black px-2 py-1.5 text-left w-24" dir="ltr">Total</th>
                  <th className="px-2 py-1.5 text-center w-20">Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 5).map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate('/sale')}
                    className="border-b border-black hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="border-e border-black px-2 py-1.5 font-mono font-bold text-black text-start">
                      {s.no}
                    </td>
                    <td className="border-e border-black px-2 py-1.5 font-semibold text-gray-900 truncate max-w-[150px] text-start">
                      {s.customerName}
                    </td>
                    <td className="border-e border-black px-2 py-1.5 text-gray-700 whitespace-nowrap text-start">
                      {formatDate(s.date)}
                    </td>
                    <td className="border-e border-black px-2 py-1.5 font-mono font-bold text-left text-black whitespace-nowrap tabular-nums" dir="ltr">
                      {fmt(s.total)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {s.balance > 0 ? (
                        <Badge variant="blue">Due: {fmt(s.balance)}</Badge>
                      ) : (
                        <Badge variant="green">Cleared</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500 font-medium">
                      No sales invoices recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals for Quick Actions */}
      <Modal
        isOpen={activeModal === 'purchase'}
        onClose={() => setActiveModal(null)}
        title="Record New Purchase"
        maxWidth="max-w-4xl"
      >
        <PurchaseForm
          suppliers={suppliers}
          warehouses={warehouses}
          items={items}
          onSubmit={async (data) => {
            await addPurchase(data);
            showToast('Purchase invoice saved successfully!');
            setActiveModal(null);
          }}
          onCancel={() => setActiveModal(null)}
        />
      </Modal>

      <Modal
        isOpen={activeModal === 'sale'}
        onClose={() => setActiveModal(null)}
        title="Record New Sale"
        maxWidth="max-w-4xl"
      >
        <SaleForm
          customers={customers}
          warehouses={warehouses}
          items={items}
          onSubmit={async (data) => {
            await addSale(data);
            showToast('Sale invoice created successfully!');
            setActiveModal(null);
          }}
          onCancel={() => setActiveModal(null)}
        />
      </Modal>
    </div>
  );
}
