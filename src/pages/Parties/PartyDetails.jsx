import React from 'react';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import { fmt } from '../../utils/formatters.js';
import { Phone, MapPin, DollarSign, Calendar } from 'lucide-react';

export default function PartyDetails({ party, onClose }) {
  if (!party) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAF9F7] p-4 rounded-xl border border-[#E0DBD3]">
        <div className="space-y-2">
          <div className="text-xs text-gray-500 font-medium">Party Category</div>
          <div>
            <Badge
              variant={
                party.type === 'Supplier'
                  ? 'orange'
                  : party.type === 'Customer'
                  ? 'blue'
                  : 'purple'
              }
            >
              {party.type}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
            <Phone className="w-4 h-4 text-gray-400" />
            <span>{party.phone || 'No phone provided'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{party.city || 'No city provided'}</span>
          </div>
        </div>

        <div className="space-y-3 bg-white p-3 rounded-lg border border-[#E0DBD3]">
          <div>
            <div className="text-xs text-gray-500">Opening Balance</div>
            <div className="text-sm font-semibold text-gray-800">
              {fmt(party.openingBalance || 0)}
            </div>
          </div>
          <div className="pt-2 border-t border-[#E0DBD3]">
            <div className="text-xs text-gray-500">Current Ledger Balance</div>
            <div
              className={`text-lg font-bold ${
                party.balance > 0
                  ? 'text-red-600'
                  : party.balance < 0
                  ? 'text-emerald-600'
                  : 'text-gray-800'
              }`}
            >
              {fmt(party.balance || 0)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button variant="secondary" onClick={onClose}>
          Close Details
        </Button>
      </div>
    </div>
  );
}
