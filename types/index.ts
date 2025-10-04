export interface Shop {
  id: number;
  name: string;
  address?: string;
  gstin?: string;
  proprietaryName?: string;
  mobileNo?: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  defaultDiscount: number;
}

export interface CartItem {
  id: string;
  productId?: number;
  name: string;
  qty: number;
  unitPrice: number;
  discount: number;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  date: number;
  items: CartItem[];
  billDiscount: number;
  taxPercent: number;
  otherCharges: number;
  otherChargesLabel?: string;
  subtotal: number;
  total: number;
  paidAmount?: number;
  dueAmount?: number;
  paymentMode?: string;
  isPaid?: boolean;
}

export interface BillCalculation {
  subtotal: number;
  totalProductDiscounts: number;
  billDiscount: number;
  taxAmount: number;
  grandTotal: number;
}