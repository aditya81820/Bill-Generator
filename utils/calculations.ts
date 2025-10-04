import { CartItem, BillCalculation } from '@/types';

export const calculateBill = (
  items: CartItem[],
  billDiscount: number,
  billDiscountType: 'amount' | 'percentage',
  taxPercent: number,
  otherCharges: number
): BillCalculation => {
  // Calculate subtotal and product discounts
  let subtotal = 0;
  let totalProductDiscounts = 0;

  items.forEach(item => {
    const itemTotal = item.qty * item.unitPrice;
    const itemDiscount = (item.discount / 100) * itemTotal;
    subtotal += itemTotal;
    totalProductDiscounts += itemDiscount;
  });

  const afterProductDiscounts = subtotal - totalProductDiscounts;

  // Calculate bill discount
  const billDiscountAmount = billDiscountType === 'percentage' 
    ? (billDiscount / 100) * afterProductDiscounts
    : billDiscount;

  const afterBillDiscount = afterProductDiscounts - billDiscountAmount;

  // Calculate tax
  const taxAmount = (taxPercent / 100) * afterBillDiscount;

  // Calculate grand total and round to nearest rupee
  const grandTotalRaw = afterBillDiscount + taxAmount + otherCharges;
  const grandTotal = Math.round(grandTotalRaw);

  return {
    subtotal,
    totalProductDiscounts,
    billDiscount: billDiscountAmount,
    taxAmount,
    grandTotal,
  };
};

export const formatCurrency = (amount: number): string => {
  return `₹${amount.toFixed(2)}`;
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};