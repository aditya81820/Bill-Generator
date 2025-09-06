import AsyncStorage from '@react-native-async-storage/async-storage';
import { Shop, Product, Invoice, Customer } from '@/types';

const KEYS = {
  SHOP: 'shop_details',
  PRODUCTS: 'products',
  INVOICES: 'invoices',
  INVOICE_COUNTER: 'invoice_counter',
  CUSTOMERS: 'customers',
};

export const StorageService = {
  // Shop operations
  async saveShop(shop: Shop): Promise<void> {
    await AsyncStorage.setItem(KEYS.SHOP, JSON.stringify(shop));
  },

  async getShop(): Promise<Shop | null> {
    const data = await AsyncStorage.getItem(KEYS.SHOP);
    return data ? JSON.parse(data) : null;
  },

  // Product operations
  async saveProducts(products: Product[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  },

  async getProducts(): Promise<Product[]> {
    const data = await AsyncStorage.getItem(KEYS.PRODUCTS);
    return data ? JSON.parse(data) : [];
  },

  async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const products = await this.getProducts();
    const newProduct = { ...product, id: Date.now() };
    products.push(newProduct);
    await this.saveProducts(products);
    return newProduct;
  },

  async updateProduct(id: number, updates: Partial<Product>): Promise<void> {
    const products = await this.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      products[index] = { ...products[index], ...updates };
      await this.saveProducts(products);
    }
  },

  async deleteProduct(id: number): Promise<void> {
    const products = await this.getProducts();
    const filtered = products.filter(p => p.id !== id);
    await this.saveProducts(filtered);
  },

  // Invoice operations
  async saveInvoices(invoices: Invoice[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.INVOICES, JSON.stringify(invoices));
  },

  async getInvoices(): Promise<Invoice[]> {
    const data = await AsyncStorage.getItem(KEYS.INVOICES);
    return data ? JSON.parse(data) : [];
  },

  async addInvoice(invoice: Omit<Invoice, 'id' | 'invoiceNumber'>): Promise<Invoice> {
    const invoices = await this.getInvoices();
    const counter = await this.getInvoiceCounter();
    const newInvoice = {
      ...invoice,
      id: Date.now().toString(),
      invoiceNumber: `INV-${String(counter).padStart(4, '0')}`,
    };
    invoices.push(newInvoice);
    await this.saveInvoices(invoices);
    await this.incrementInvoiceCounter();
    return newInvoice;
  },

  async getInvoiceCounter(): Promise<number> {
    const data = await AsyncStorage.getItem(KEYS.INVOICE_COUNTER);
    return data ? parseInt(data) : 1;
  },

  async incrementInvoiceCounter(): Promise<void> {
    const counter = await this.getInvoiceCounter();
    await AsyncStorage.setItem(KEYS.INVOICE_COUNTER, (counter + 1).toString());
  },

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<void> {
    const invoices = await this.getInvoices();
    const index = invoices.findIndex(inv => inv.id === id);
    if (index !== -1) {
      invoices[index] = { ...invoices[index], ...updates };
      await this.saveInvoices(invoices);
    }
  },

  // Customer operations
  async saveCustomers(customers: Customer[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
  },

  async getCustomers(): Promise<Customer[]> {
    const data = await AsyncStorage.getItem(KEYS.CUSTOMERS);
    return data ? JSON.parse(data) : [];
  },

  async addCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
    const customers = await this.getCustomers();
    const existingCustomer = customers.find(
      c => c.name.toLowerCase() === customer.name.toLowerCase() || 
           (customer.phone && c.phone === customer.phone)
    );
    
    if (existingCustomer) {
      // Update existing customer if more info provided
      if (customer.address && !existingCustomer.address) {
        existingCustomer.address = customer.address;
      }
      if (customer.phone && !existingCustomer.phone) {
        existingCustomer.phone = customer.phone;
      }
      await this.saveCustomers(customers);
      return existingCustomer;
    }
    
    const newCustomer = { ...customer, id: Date.now().toString() };
    customers.push(newCustomer);
    await this.saveCustomers(customers);
    return newCustomer;
  },

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<void> {
    const customers = await this.getCustomers();
    const index = customers.findIndex(c => c.id === id);
    if (index !== -1) {
      customers[index] = { ...customers[index], ...updates };
      await this.saveCustomers(customers);
    }
  },

  async deleteCustomer(id: string): Promise<void> {
    const customers = await this.getCustomers();
    const filtered = customers.filter(c => c.id !== id);
    await this.saveCustomers(filtered);
  },
};
