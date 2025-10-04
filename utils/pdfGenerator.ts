import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';
import { Invoice, Shop } from '@/types';
import { formatCurrency, formatDate } from './calculations';

export const generateInvoicePDF = async (invoice: Invoice, shop: Shop): Promise<string> => {
  // Create HTML content for the invoice
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .top-bar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .shop-block { max-width: 55%; }
        .shop-name { font-size: 20px; font-weight: bold; margin-bottom: 4px; }
        .shop-details { font-size: 13px; color: #666; }
        .customer-block { max-width: 40%; text-align: right; font-size: 13px; }
        .heading { text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 10px; }
        .invoice-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .items-table th { background-color: #f5f5f5; font-weight: bold; }
        .totals { margin-left: auto; width: 300px; }
        .totals table { width: 100%; }
        .totals td { padding: 5px; }
        .grand-total { font-weight: bold; font-size: 16px; border-top: 2px solid #333; }
        .text-right { text-align: right; }
      </style>
    </head>
    <body>
      

      <div class="heading">Estimated Bill</div>
      <div class="top-bar">
        <div class="shop-block">
          <div class="shop-name">${shop.name}</div>
          <div class="shop-details">
            ${shop.proprietaryName ? `<div>Proprietor: ${shop.proprietaryName}</div>` : ''}
            ${shop.address ? `<div>${shop.address}</div>` : ''}
            ${shop.mobileNo ? `<div>Mobile: ${shop.mobileNo}</div>` : ''}
            ${shop.gstin ? `<div>GSTIN: ${shop.gstin}</div>` : ''}
          </div>
        </div>
        <div class="customer-block">
          <div><strong>Customer:</strong> ${invoice.customerName}</div>
          ${invoice.customerPhone ? `<div>Phone: ${invoice.customerPhone}</div>` : ''}
          ${invoice.customerAddress ? `<div>Address: ${invoice.customerAddress}</div>` : ''}
        </div>
      </div>

      <div class="invoice-info">
        <div>
          <strong>Invoice No:</strong> ${invoice.invoiceNumber}<br>
          <strong>Date:</strong> ${formatDate(invoice.date)}
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Discount</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map(item => {
            const itemTotal = item.qty * item.unitPrice;
            const discountAmount = (item.discount / 100) * itemTotal;
            const netAmount = itemTotal - discountAmount;
            return `
              <tr>
                <td>${item.name}</td>
                <td>${item.qty}</td>
                <td>${formatCurrency(item.unitPrice)}</td>
                <td>${item.discount}%</td>
                <td class="text-right">${formatCurrency(netAmount)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr>
            <td>Subtotal:</td>
            <td class="text-right">${formatCurrency(invoice.subtotal)}</td>
          </tr>
          ${invoice.billDiscount > 0 ? `
            <tr>
              <td>Bill Discount:</td>
              <td class="text-right">-${formatCurrency(invoice.billDiscount)}</td>
            </tr>
          ` : ''}
          ${invoice.taxPercent > 0 ? `
            <tr>
              <td>Tax (${invoice.taxPercent}%):</td>
              <td class="text-right">${formatCurrency((invoice.taxPercent / 100) * (invoice.subtotal - invoice.billDiscount))}</td>
            </tr>
          ` : ''}
          ${invoice.otherCharges > 0 ? `
            <tr>
              <td>${invoice.otherChargesLabel || 'Other Charges'}:</td>
              <td class="text-right">${formatCurrency(invoice.otherCharges)}</td>
            </tr>
          ` : ''}
          <tr class="grand-total">
            <td><strong>Grand Total:</strong></td>
            <td class="text-right"><strong>${formatCurrency(invoice.total)}</strong></td>
          </tr>
        </table>
      </div>

      ${(invoice.paidAmount !== undefined || invoice.paymentMode) ? `
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">
          <strong>Payment Details:</strong><br><br>
          <div class="totals">
            <table>
              ${invoice.paidAmount !== undefined ? `
                <tr>
                  <td>Paid Amount:</td>
                  <td class="text-right">${formatCurrency(invoice.paidAmount)}</td>
                </tr>
              ` : ''}
              ${invoice.dueAmount !== undefined && invoice.dueAmount > 0 ? `
                <tr>
                  <td>Due Amount:</td>
                  <td class="text-right" style="color: #FF3B30; font-weight: bold;">${formatCurrency(invoice.dueAmount)}</td>
                </tr>
              ` : ''}
              ${invoice.paymentMode ? `
                <tr>
                  <td>Payment Mode:</td>
                  <td class="text-right">${invoice.paymentMode}</td>
                </tr>
              ` : ''}
            </table>
            ${invoice.isPaid ? `
              <div style="text-align: center; margin-top: 15px; padding: 10px; background-color: #E8F5E8; border-radius: 8px;">
                <strong style="color: #34C759; font-size: 16px;">✓ PAID</strong>
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}
    </body>
    </html>
  `;

  // Generate PDF from HTML
  const { uri } = await Print.printToFileAsync({
    html: htmlContent,
    base64: false,
  });

  return uri;
};

export const shareInvoice = async (fileUri: string): Promise<void> => {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Invoice',
      UTI: '.pdf',
    });
  }
};

// Opens WhatsApp chat with a specific phone number and a prefilled message.
// Note: Attaching files directly via URL scheme is not supported. This opens the chat for direct send without contact picker.
export const shareInvoiceToWhatsApp = async (
  phoneE164: string,
  message: string
): Promise<void> => {
  // Ensure phone number is in international format without spaces
  const phone = phoneE164.replace(/[^0-9+]/g, '');
  const encodedMessage = encodeURIComponent(message);
  const url = Platform.select({
    ios: `whatsapp://send?phone=${phone}&text=${encodedMessage}`,
    android: `whatsapp://send?phone=${phone}&text=${encodedMessage}`,
    default: `https://wa.me/${phone}?text=${encodedMessage}`,
  });

  try {
    const canOpen = await Linking.canOpenURL(url!);
    if (canOpen) {
      await Linking.openURL(url!);
    } else {
      throw new Error('WhatsApp not available');
    }
  } catch (e) {
    // Fallback: open wa.me in browser
    await Linking.openURL(`https://wa.me/${phone}?text=${encodedMessage}`);
  }
};
