import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import QuickActionCard from '../../components/dashboard/QuickActionCard.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import PurchaseForm from '../../components/forms/PurchaseForm.jsx';
import SaleForm from '../../components/forms/SaleForm.jsx';
import ReceiptForm from '../../components/forms/ReceiptForm.jsx';
import PaymentForm from '../../components/forms/PaymentForm.jsx';
import { useParties } from '../../hooks/useParties.js';
import { useItems } from '../../hooks/useItems.js';
import { usePurchases } from '../../hooks/usePurchases.js';
import { useSales } from '../../hooks/useSales.js';
import { useStock } from '../../hooks/useStock.js';
import { useFinances } from '../../hooks/useFinances.js';
import { useWarehouses } from '../../hooks/useWarehouses.js';
import { useApp } from '../../context/AppContext.jsx';
import { fmt, formatDate } from '../../utils/formatters.js';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Receipt as ReceiptIcon,
  CreditCard,
  Plus,
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { showToast } = useApp();

  const { parties } = useParties();
  const { items } = useItems();
  const { purchases, addPurchase } = usePurchases();
  const { sales, addSale } = useSales();
  const { stockEntries } = useStock();
  const { receipts, payments, accounts, addReceipt, addPayment } = useFinances();
  const { warehouses } = useWarehouses();

  const [activeModal, setActiveModal] = useState(null); // 'purchase' | 'sale' | 'receipt' | 'payment'

  // Summary Metrics Calculations
  const totalStockQty = stockEntries.reduce((sum, s) => sum + Number(s.qty || 0), 0);
  const totalStockVal = stockEntries.reduce((sum, s) => sum + Number(s.value || 0), 0);

  const totalReceivable = parties
    .filter((p) => p.balance < 0 || p.type === 'Customer')
    .reduce((sum, p) => sum + Math.abs(Number(p.balance || 0)), 0);

  const totalPayable = parties
    .filter((p) => p.balance > 0 && p.type !== 'Customer')
    .reduce((sum, p) => sum + Number(p.balance || 0), 0);

  const totalCashBank = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

  const suppliers = parties.filter((p) => p.type === 'Supplier' || p.type === 'Both');
  const customers = parties.filter((p) => p.type === 'Customer' || p.type === 'Both');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Overview"
        subtitle="Real-time textile trading & stock monitoring system"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Stock Inventory"
          value={`${totalStockQty.toLocaleString('en-PK')} KG`}
          sub={`Value: ${fmt(totalStockVal)}`}
          icon={Package}
          color="text-[#1E3A5F]"
          onClick={() => navigate('/stock')}
        />
        <StatCard
          label="Total Receivables"
          value={fmt(totalReceivable)}
          sub="Pending from Customers"
          icon={TrendingUp}
          color="text-emerald-600"
          onClick={() => navigate('/receivable')}
        />
        <StatCard
          label="Total Payables"
          value={fmt(totalPayable)}
          sub="Owed to Suppliers"
          icon={TrendingDown}
          color="text-red-600"
          onClick={() => navigate('/payable')}
        />
        <StatCard
          label="Cash & Bank Balance"
          value={fmt(totalCashBank)}
          sub={`${accounts.length} Active Accounts`}
          icon={DollarSign}
          color="text-[#C97B2E]"
          onClick={() => navigate('/cash-bank')}
        />
      </div>

      {/* Quick Transaction Actions */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title="Create Purchase"
            description="Record raw material purchase"
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
            title="Customer Receipt"
            description="Receive payment from buyer"
            icon={ReceiptIcon}
            onClick={() => setActiveModal('receipt')}
          />
          <QuickActionCard
            title="Supplier Payment"
            description="Pay supplier balance"
            icon={CreditCard}
            onClick={() => setActiveModal('payment')}
          />
        </div>
      </div>

      {/* Recent Purchases & Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Purchases */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#1E3A5F]">Recent Purchases</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/purchase')}>
              View All
            </Button>
          </div>
          <div className="divide-y divide-[#F0EDE8]">
            {purchases.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className="py-2.5 flex items-center justify-between text-xs hover:bg-[#FAF9F7] px-2 rounded-lg cursor-pointer transition-colors"
                onClick={() => navigate('/purchase')}
              >
                <div>
                  <div className="font-semibold text-[#1E3A5F]">{p.no}</div>
                  <div className="text-gray-500">{p.supplierName} • {formatDate(p.date)}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{fmt(p.total)}</div>
                  {p.balance > 0 ? (
                    <Badge variant="amber">Due: {fmt(p.balance)}</Badge>
                  ) : (
                    <Badge variant="green">Paid</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Sales */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#1E3A5F]">Recent Sales</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/sale')}>
              View All
            </Button>
          </div>
          <div className="divide-y divide-[#F0EDE8]">
            {sales.slice(0, 5).map((s) => (
              <div
                key={s.id}
                className="py-2.5 flex items-center justify-between text-xs hover:bg-[#FAF9F7] px-2 rounded-lg cursor-pointer transition-colors"
                onClick={() => navigate('/sale')}
              >
                <div>
                  <div className="font-semibold text-[#1E3A5F]">{s.no}</div>
                  <div className="text-gray-500">{s.customerName} • {formatDate(s.date)}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{fmt(s.total)}</div>
                  {s.balance > 0 ? (
                    <Badge variant="blue">Due: {fmt(s.balance)}</Badge>
                  ) : (
                    <Badge variant="green">Cleared</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Modals for Quick Actions */}
      <Modal
        isOpen={activeModal === 'purchase'}
        onClose={() => setActiveModal(null)}
        title="Record New Purchase"
        maxWidth="max-w-3xl"
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
        maxWidth="max-w-3xl"
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

      <Modal
        isOpen={activeModal === 'receipt'}
        onClose={() => setActiveModal(null)}
        title="Record Customer Receipt"
      >
        <ReceiptForm
          parties={customers}
          accounts={accounts}
          onSubmit={async (data) => {
            await addReceipt(data);
            showToast('Cash receipt recorded successfully!');
            setActiveModal(null);
          }}
          onCancel={() => setActiveModal(null)}
        />
      </Modal>

      <Modal
        isOpen={activeModal === 'payment'}
        onClose={() => setActiveModal(null)}
        title="Record Supplier Payment"
      >
        <PaymentForm
          parties={suppliers}
          accounts={accounts}
          onSubmit={async (data) => {
            await addPayment(data);
            showToast('Supplier payment recorded successfully!');
            setActiveModal(null);
          }}
          onCancel={() => setActiveModal(null)}
        />
      </Modal>
    </div>
  );
}
