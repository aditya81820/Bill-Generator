import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StorageService } from '@/utils/storage';
import { generateInvoicePDF, shareInvoice } from '@/utils/pdfGenerator';
import { formatCurrency, formatDate } from '@/utils/calculations';
import { Shop, Invoice } from '@/types';
import CustomButton from '@/components/CustomButton';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Share, Download, ArrowLeft, Edit3 } from 'lucide-react-native';

export default function InvoicePreviewScreen() {
  const params = useLocalSearchParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const shopData = await StorageService.getShop();
      setShop(shopData);

      if (params.id) {
        // Loading existing invoice
        const invoices = await StorageService.getInvoices();
        const existingInvoice = invoices.find(inv => inv.id === params.id);
        if (existingInvoice) {
          setInvoice(existingInvoice);
        }
      } else if (params.data) {
        // Preview new invoice
        const invoiceData = JSON.parse(params.data as string);
        setInvoice(invoiceData as Invoice);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load invoice data');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const saveInvoice = async () => {
    if (!invoice || params.id) return; // Already saved or no invoice

    setSaving(true);
    try {
      await StorageService.addInvoice(invoice);
      Alert.alert('Success', 'Invoice saved successfully!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!invoice || !shop) return;

    try {
      const pdfUri = await generateInvoicePDF(invoice, shop);
      await shareInvoice(pdfUri);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate or share invoice');
    }
  };

  const handleDownload = async () => {
    if (!invoice || !shop) return;

    try {
      const pdfUri = await generateInvoicePDF(invoice, shop);
      Alert.alert('Success', 'Invoice downloaded successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to download invoice');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!invoice || !shop) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Invoice not found</Text>
        <CustomButton
          title="Go Back"
          onPress={() => router.back()}
          variant="primary"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Invoice Preview</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleDownload}
          >
            <Download size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleShare}
          >
            <Share size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.invoiceContainer}>
          {/* Shop Header */}
          <View style={styles.shopHeader}>
            <Text style={styles.shopName}>{shop.name}</Text>
            {shop.proprietaryName && (
              <Text style={styles.proprietaryName}>Proprietor: {shop.proprietaryName}</Text>
            )}
            {shop.address && (
              <Text style={styles.shopAddress}>{shop.address}</Text>
            )}
            {shop.mobileNo && (
              <Text style={styles.shopMobile}>Mobile: {shop.mobileNo}</Text>
            )}
            {shop.gstin && (
              <Text style={styles.shopGstin}>GSTIN: {shop.gstin}</Text>
            )}
          </View>

          {/* Invoice Info */}
          <View style={styles.invoiceInfo}>
            <View style={styles.invoiceRow}>
              <Text style={styles.label}>Invoice No:</Text>
              <Text style={styles.value}>{invoice.invoiceNumber || 'PREVIEW'}</Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.label}>Date:</Text>
              <Text style={styles.value}>{formatDate(invoice.date)}</Text>
            </View>
          </View>

          {/* Customer Info */}
          <View style={styles.customerInfo}>
            <Text style={styles.sectionTitle}>Bill To:</Text>
            <Text style={styles.customerName}>{invoice.customerName}</Text>
            {invoice.customerPhone && (
              <Text style={styles.customerPhone}>Phone: {invoice.customerPhone}</Text>
            )}
            {invoice.customerAddress && (
              <Text style={styles.customerAddress}>Address: {invoice.customerAddress}</Text>
            )}
          </View>

          {/* Items Table */}
          <View style={styles.itemsTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.itemColumn]}>Item</Text>
              <Text style={[styles.tableCell, styles.qtyColumn]}>Qty</Text>
              <Text style={[styles.tableCell, styles.priceColumn]}>Price</Text>
              <Text style={[styles.tableCell, styles.discountColumn]}>Disc%</Text>
              <Text style={[styles.tableCell, styles.amountColumn]}>Amount</Text>
            </View>
            
            {invoice.items.map((item, index) => {
              const itemTotal = item.qty * item.unitPrice;
              const discountAmount = (item.discount / 100) * itemTotal;
              const netAmount = itemTotal - discountAmount;

              return (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.itemColumn]}>{item.name}</Text>
                  <Text style={[styles.tableCell, styles.qtyColumn]}>{item.qty}</Text>
                  <Text style={[styles.tableCell, styles.priceColumn]}>
                    {formatCurrency(item.unitPrice)}
                  </Text>
                  <Text style={[styles.tableCell, styles.discountColumn]}>
                    {item.discount}%
                  </Text>
                  <Text style={[styles.tableCell, styles.amountColumn]}>
                    {formatCurrency(netAmount)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Totals */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
            </View>
            
            {invoice.billDiscount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Bill Discount:</Text>
                <Text style={[styles.totalValue, styles.discountValue]}>
                  -{formatCurrency(invoice.billDiscount)}
                </Text>
              </View>
            )}
            
            {invoice.taxPercent > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax ({invoice.taxPercent}%):</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency((invoice.taxPercent / 100) * (invoice.subtotal - invoice.billDiscount))}
                </Text>
              </View>
            )}
            
            {invoice.otherCharges > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Other Charges:</Text>
                <Text style={styles.totalValue}>{formatCurrency(invoice.otherCharges)}</Text>
              </View>
            )}
            
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Grand Total:</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(invoice.total)}</Text>
            </View>
          </View>

          {/* Payment Details */}
          {(invoice.paidAmount !== undefined || invoice.paymentMode) && (
            <View style={styles.paymentSection}>
              <Text style={styles.sectionTitle}>Payment Details:</Text>
              {invoice.paidAmount !== undefined && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Paid Amount:</Text>
                  <Text style={styles.paymentValue}>{formatCurrency(invoice.paidAmount)}</Text>
                </View>
              )}
              {invoice.dueAmount !== undefined && invoice.dueAmount > 0 && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Due Amount:</Text>
                  <Text style={[styles.paymentValue, styles.dueAmount]}>{formatCurrency(invoice.dueAmount)}</Text>
                </View>
              )}
              {invoice.paymentMode && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Payment Mode:</Text>
                  <Text style={styles.paymentValue}>{invoice.paymentMode}</Text>
                </View>
              )}
              {invoice.isPaid && (
                <View style={styles.paidStatus}>
                  <Text style={styles.paidStatusText}>✓ PAID</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {!params.id && (
          <CustomButton
            title="Save Invoice"
            onPress={saveInvoice}
            variant="primary"
            disabled={saving}
            style={styles.actionButton}
          />
        )}
        {params.id && (
          <CustomButton
            title="Edit Invoice"
            onPress={() => router.push(`/edit-invoice?id=${params.id}`)}
            variant="secondary"
            style={styles.actionButton}
          />
        )}
        <CustomButton
          title="Share Invoice"
          onPress={handleShare}
          variant="secondary"
          style={styles.actionButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 16,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  invoiceContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shopHeader: {
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#333',
    paddingBottom: 16,
    marginBottom: 20,
  },
  shopName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  proprietaryName: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  shopAddress: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  shopMobile: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  shopGstin: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  invoiceInfo: {
    marginBottom: 20,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  value: {
    fontSize: 16,
    color: '#666',
  },
  customerInfo: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
  },
  customerAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  itemsTable: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tableCell: {
    fontSize: 14,
    color: '#333',
  },
  itemColumn: {
    flex: 3,
  },
  qtyColumn: {
    flex: 1,
    textAlign: 'center',
  },
  priceColumn: {
    flex: 2,
    textAlign: 'right',
  },
  discountColumn: {
    flex: 1,
    textAlign: 'center',
  },
  amountColumn: {
    flex: 2,
    textAlign: 'right',
    fontWeight: '600',
  },
  totalsSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  discountValue: {
    color: '#FF9500',
  },
  grandTotalRow: {
    borderTopWidth: 2,
    borderTopColor: '#333',
    marginTop: 8,
    paddingTop: 16,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  actions: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  actionButton: {
    marginBottom: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  paymentSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  paymentLabel: {
    fontSize: 16,
    color: '#666',
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  dueAmount: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  paidStatus: {
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
  },
  paidStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
});
