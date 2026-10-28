import React from 'react';
import { ChevronRight } from 'lucide-react';
import { ProcessIcon } from './ui';
import { itemAmount, receiptTitle } from '../lib/format';

export default function ReceiptRow({ receipt, onClick, showDate }) {
  const amount = receipt.items?.length === 1 ? itemAmount(receipt.items[0]) : '';
  return (
    <button type="button" className="receipt-row" onClick={onClick}>
      <ProcessIcon process={receipt.process} />
      <div className="receipt-row-main">
        <p className="receipt-row-title">{receiptTitle(receipt)}</p>
        <p className="receipt-row-sub">
          {receipt.vendor_name || '업체 미입력'}
          {showDate ? ` · ${showDate}` : ` · ${receipt.process?.name || ''}`}
        </p>
      </div>
      {amount ? <span className="receipt-row-amount">{amount}</span> : <ChevronRight size={18} className="text-tertiary" />}
    </button>
  );
}
