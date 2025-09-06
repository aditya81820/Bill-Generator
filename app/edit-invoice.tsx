import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StorageService } from '@/utils/storage';
import { calculateBill, formatCurrency } from '@/utils/calculations';
import { Invoice, CartItem } from '@/types';
import CustomInput from '@/components/CustomInput';
import CustomButton from '@/components/CustomButton';
import LoadingSpinner from '@/components/LoadingSpinner';
import { 
  ArrowLeft, 
  Save, 
  Edit3, 
  Trash2, 
  Plus,
  CreditCard
} from 'lucide-react-native';

export default function EditInvoiceScreen() {
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  
  // Editable fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [items, setItems] = useState<CartItem[]>([]);
  const [billDiscount, setBillDiscount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');

  const paymentModes = ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Cheque'];

  useEffect(() => {
    loadInvoice();
  }, []);

  const loadInvoice = async () => {
    if (!params.id) {
      Alert.alert('Error', 'Invoice ID not provided');
      router.back();
      return;
    }

    try {
      const invoices = await StorageService.getInvoices();
      const existingInvoice = invoices.find(inv => inv.id === params.id);
      
      if (!existingInvoice) {
        Alert.alert('Error', 'Invoice not found');
        router.back();
        return;
      }

      setInvoice(existingInvoice);
      setCustomerName(existingInvoice.customerName);
      setCustomerPhone(existingInvoice.customerPhone || '');
      setCustomerAddress(existingInvoice.customerAddress || '');
      setItems(existingInvoice.items);
      setBillDiscount(existingInvoice.billDiscount);
      setTaxPercent(existingInvoice.taxPercent);
      setOtherCharges(existingInvoice.otherCharges);
      setPaidAmount(existingInvoice.paidAmount || 0);
      setPaymentMode(existingInvoice.paymentMode || 'Cash');
    } catch (error) {
      Alert.alert('Error', 'Failed to load invoice');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index: number, updates: Partial<CartItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const calculation = calculateBill(
    items,
    billDiscount,
    'amount', // Assume amount for existing invoices
    taxPercent,
    otherCharges
  );

  const dueAmount = Math.max(0, calculation.grandTotal - paidAmount);

  const saveChanges = async () => {
    if (!invoice) return;

    if (!customerName.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Error', 'Please add at least one item');
      return;
    }

    setSaving(true);
    try {
      const updatedInvoice: Partial<Invoice> = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        items,
        billDiscount: calculation.billDiscount,
        taxPercent,
        otherCharges,
        subtotal: calculation.subtotal,
        total: calculation.grandTotal,
        paidAmount,
        dueAmount,
        paymentMode,
        isPaid: dueAmount === 0,
      };

      await StorageService.updateInvoice(invoice.id, updatedInvoice);

      Alert.alert('Success', 'Invoice updated successfully!', [
        {
          text: 'OK',
          onPress: () => router.push(`/invoice-preview?id=${invoice.id}`)
        }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!invoice) {
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
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Invoice</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveChanges}
          disabled={saving}
        >
          <Save size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.invoiceInfo}>
        <Text style={styles.invoiceNumber}>Invoice: {invoice.invoiceNumber}</Text>
        <Text style={styles.invoiceDate}>
          Date: {new Date(invoice.date).toLocaleDateString()}
        </Text>
      </View>

      {/* Customer Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Details</Text>
        <View style={styles.sectionCard}>
          <CustomInput
            label="Customer Name"
            value={customerName}
            onChangeText={setCustomerName}
            required
            placeholder="Enter customer name"
          />
          <CustomInput
            label="Phone Number"
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
            placeholder="Enter phone number"
          />
          <CustomInput
            label="Customer Address"
            value={customerAddress}
            onChangeText={setCustomerAddress}
            placeholder="Enter customer address"
            multiline
            numberOfLines={2}
          />
        </View>
      </View>

      {/* Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        <View style={styles.sectionCard}>
          {items.map((item, index) => {
            const itemTotal = item.qty * item.unitPrice;
            const discountAmount = (item.discount / 100) * itemTotal;
            const netAmount = itemTotal - discountAmount;

            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <TouchableOpacity
                    onPress={() => removeItem(index)}
                    style={styles.deleteButton}
                  >
                    <Trash2 size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.itemRow}>
                  <View style={styles.itemField}>
                    <Text style={styles.fieldLabel}>Qty</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={item.qty.toString()}
                      onChangeText={(text) => updateItem(index, { qty: parseInt(text) || 1 })}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.itemField}>
                    <Text style={styles.fieldLabel}>Price</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={item.unitPrice.toString()}
                      onChangeText={(text) => updateItem(index, { unitPrice: parseFloat(text) || 0 })}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.itemField}>
                    <Text style={styles.fieldLabel}>Disc%</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={item.discount.toString()}
                      onChangeText={(text) => updateItem(index, { discount: parseFloat(text) || 0 })}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                
                <View style={styles.itemTotal}>
                  <Text style={styles.itemTotalText}>
                    Total: {formatCurrency(netAmount)}
                    {item.discount > 0 && (
                      <Text style={styles.discountText}> (Disc: -{formatCurrency(discountAmount)})</Text>
                    )}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Billing Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Billing Details</Text>
        <View style={styles.sectionCard}>
          <CustomInput
            label="Bill Discount"
            value={billDiscount.toString()}
            onChangeText={(text) => setBillDiscount(parseFloat(text) || 0)}
            keyboardType="numeric"
            placeholder="Enter bill discount amount"
          />
          <CustomInput
            label="Tax Percentage"
            value={taxPercent.toString()}
            onChangeText={(text) => setTaxPercent(parseFloat(text) || 0)}
            keyboardType="numeric"
            placeholder="Enter tax percentage"
          />
          <CustomInput
            label="Other Charges"
            value={otherCharges.toString()}
            onChangeText={(text) => setOtherCharges(parseFloat(text) || 0)}
            keyboardType="numeric"
            placeholder="Enter other charges"
          />
        </View>
      </View>

      {/* Payment Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Details</Text>
        <View style={styles.sectionCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Grand Total:</Text>
            <Text style={styles.totalValue}>{formatCurrency(calculation.grandTotal)}</Text>
          </View>
          
          <CustomInput
            label="Paid Amount"
            value={paidAmount.toString()}
            onChangeText={(text) => setPaidAmount(parseFloat(text) || 0)}
            keyboardType="numeric"
            placeholder="Enter paid amount"
          />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Due Amount:</Text>
            <Text style={[styles.totalValue, dueAmount > 0 && styles.dueAmount]}>
              {formatCurrency(dueAmount)}
            </Text>
          </View>
          
          <View style={styles.paymentModeContainer}>
            <Text style={styles.fieldLabel}>Payment Mode:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.paymentModeButtons}>
                {paymentModes.map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.paymentModeButton,
                      paymentMode === mode && styles.paymentModeActive
                    ]}
                    onPress={() => setPaymentMode(mode)}
                  >
                    <Text style={[
                      styles.paymentModeText,
                      paymentMode === mode && styles.paymentModeTextActive
                    ]}>
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          
          {dueAmount === 0 && (
            <View style={styles.paidStatus}>
              <Text style={styles.paidStatusText}>✓ FULLY PAID</Text>
            </View>
          )}
        </View>
      </View>

      {/* Bill Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bill Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(calculation.subtotal)}</Text>
          </View>
          {billDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Bill Discount:</Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>
                -{formatCurrency(billDiscount)}
              </Text>
            </View>
          )}
          {calculation.taxAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax ({taxPercent}%):</Text>
              <Text style={styles.summaryValue}>{formatCurrency(calculation.taxAmount)}</Text>
            </View>
          )}
          {otherCharges > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Other Charges:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(otherCharges)}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.grandTotalLabel}>Grand Total:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(calculation.grandTotal)}</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <CustomButton
          title={saving ? "Saving..." : "Save Changes"}
          onPress={saveChanges}
          variant="primary"
          disabled={saving}
        />
      </View>
    </ScrollView>
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
  saveButton: {
    padding: 8,
  },
  invoiceInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  invoiceDate: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    margin: 16,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  itemCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  itemField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  itemTotal: {
    alignItems: 'flex-end',
  },
  itemTotalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  discountText: {
    color: '#FF9500',
    fontSize: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  dueAmount: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  paymentModeContainer: {
    marginTop: 12,
  },
  paymentModeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentModeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  paymentModeActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  paymentModeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  paymentModeTextActive: {
    color: '#FFFFFF',
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
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  discountValue: {
    color: '#FF9500',
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
  actionButtons: {
    padding: 16,
    paddingBottom: 32,
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
});
