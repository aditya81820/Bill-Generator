export interface Shop {
  id: number;
  name: string;
  address?: string;
  gstin?: string;
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

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  date: number;
  items: CartItem[];
  billDiscount: number;
  taxPercent: number;
  otherCharges: number;
  subtotal: number;
  total: number;
}

export interface BillCalculation {
  subtotal: number;
  totalProductDiscounts: number;
  billDiscount: number;
  taxAmount: number;
  grandTotal: number;
}