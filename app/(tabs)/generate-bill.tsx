import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  Switch,
  TextInput,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import * as Contacts from 'expo-contacts';
import { StorageService } from '@/utils/storage';
import { calculateBill, formatCurrency } from '@/utils/calculations';
import { Product, CartItem, Customer } from '@/types';
import CustomInput from '@/components/CustomInput';
import CustomButton from '@/components/CustomButton';
import { 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  Search, 
  Package, 
  Phone, 
  User, 
  MapPin, 
  CreditCard,
  Edit3
} from 'lucide-react-native';

export default function GenerateBillScreen() {
  // Customer Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);

  // Add these new states near the other state declarations
  const [otherChargesLabel, setOtherChargesLabel] = useState('Other Charges');
  const [showOtherChargesFields, setShowOtherChargesFields] = useState(false);
  
  // Cart and Products
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Billing Details
  const [billDiscount, setBillDiscount] = useState(0);
  const [billDiscountInput, setBillDiscountInput] = useState('');
  const [billDiscountType, setBillDiscountType] = useState<'amount' | 'percentage'>('percentage');
  const [taxPercent, setTaxPercent] = useState(0);
  const [taxPercentInput, setTaxPercentInput] = useState('');
  const [applyTax, setApplyTax] = useState(false);
  const [otherCharges, setOtherCharges] = useState(0);
  const [otherChargesInput, setOtherChargesInput] = useState('');
  
  // Payment Details
  const [paidAmount, setPaidAmount] = useState(0);
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Product Management
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  
  // Product search and suggestions - simplified
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    qty: 1,
    unitPrice: 0,
    discount: 0,
  });
  
  // String inputs for newProduct to allow clearing
  const [newProductQtyInput, setNewProductQtyInput] = useState('1');
  const [newProductUnitPriceInput, setNewProductUnitPriceInput] = useState('');
  const [newProductDiscountInput, setNewProductDiscountInput] = useState('');

  // Legacy inline item add states (to avoid lint errors and allow clearing)
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemDiscount, setNewItemDiscount] = useState('0');
  
  // New product creation form
  const [createProductForm, setCreateProductForm] = useState({
    name: '',
    price: 0,
    defaultDiscount: 0,
  });
  const [createProductPriceInput, setCreateProductPriceInput] = useState('');
  const [createProductDiscountInput, setCreateProductDiscountInput] = useState('');

  // New customer creation form
  const [createCustomerForm, setCreateCustomerForm] = useState({
    name: '',
    phone: '',
    address: '',
  });

  // Edit item functionality
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);

  const paymentModes = ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Cheque'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [productList, customerList] = await Promise.all([
      StorageService.getProducts(),
      StorageService.getCustomers(),
    ]);
    setProducts(productList);
    setCustomers(customerList);
    // Initialize input strings from defaults
    setBillDiscountInput(billDiscount ? String(billDiscount) : '');
    setTaxPercentInput(taxPercent ? String(taxPercent) : '');
    setOtherChargesInput(otherCharges ? String(otherCharges) : '');
    setPaidAmountInput(paidAmount ? String(paidAmount) : '');
  };

  // Customer Management
  const handleCustomerNameChange = (text: string) => {
    setCustomerName(text);
    if (text.length > 0) {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredCustomers(filtered);
      setShowCustomerSuggestions(true);
    } else {
      setShowCustomerSuggestions(false);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone || '');
    setCustomerAddress(customer.address || '');
    setShowCustomerSuggestions(false);
  };

  const openAddCustomerModal = () => {
    setCreateCustomerForm({ name: customerName.trim(), phone: '', address: '' });
    setShowCustomerSuggestions(false);
    setShowAddCustomerModal(true);
  };

  const saveNewCustomer = async () => {
    if (!createCustomerForm.name.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }
    try {
      const saved = await StorageService.addCustomer({
        name: createCustomerForm.name.trim(),
        phone: createCustomerForm.phone.trim() || undefined,
        address: createCustomerForm.address.trim() || undefined,
      });
      // Update local state and pick this customer
      setCustomers(prev => {
        const exists = prev.find(c => c.id === saved.id);
        return exists ? prev.map(c => (c.id === saved.id ? saved : c)) : [...prev, saved];
      });
      setCustomerName(saved.name);
      setCustomerPhone(saved.phone || '');
      setCustomerAddress(saved.address || '');
      setShowAddCustomerModal(false);
      Alert.alert('Success', 'Customer saved');
    } catch (e) {
      Alert.alert('Error', 'Failed to save customer');
    }
  };

  const requestContactsPermission = async () => {
    try {
      const { status: currentStatus } = await Contacts.getPermissionsAsync();
      
      let finalStatus = currentStatus;
      
      if (currentStatus !== 'granted') {
        const { status: requestStatus } = await Contacts.requestPermissionsAsync();
        finalStatus = requestStatus;
      }
      
      if (finalStatus === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
          sort: Contacts.SortTypes.FirstName,
        });

        if (data.length > 0) {
          const contactOptions = data
            .filter(contact => contact.name && contact.phoneNumbers?.length > 0)
            .slice(0, 10)
            .map(contact => ({
              name: contact.name,
              phone: contact.phoneNumbers?.[0]?.number?.replace(/[^0-9+]/g, '') || '',
            }));

          if (contactOptions.length > 0) {
            Alert.alert(
              'Select Contact',
              'Choose a contact to add',
              contactOptions.map((contact) => ({
                text: `${contact.name} - ${contact.phone}`,
                onPress: () => {
                  setCustomerName(contact.name);
                  setCustomerPhone(contact.phone);
                },
              })).concat([{ text: 'Cancel', style: 'cancel' }])
            );
          } else {
            Alert.alert('No Contacts', 'No contacts with phone numbers found.');
          }
        } else {
          Alert.alert('No Contacts', 'No contacts found on your device.');
        }
      } else {
        Alert.alert(
          'Permission Required', 
          'Contacts permission is needed to import customer details. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              Alert.alert('Enable Permission', 'Go to Settings > Apps > Bill Generator > Permissions > Contacts and enable access.');
            }}
          ]
        );
      }
    } catch (error) {
      console.error('Error accessing contacts:', error);
      Alert.alert('Error', 'Failed to access contacts. Please try again.');
    }
  };

  // Simplified product search - no suggestions dropdown
  const handleProductSearch = (text: string) => {
    setProductSearchQuery(text);
    setNewProduct({ ...newProduct, name: text });
    
    if (text.length > 0) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  };

  const selectProduct = (product: Product) => {
    setNewProduct({
      name: product.name,
      qty: 1,
      unitPrice: product.price,
      discount: product.defaultDiscount,
    });
    setNewProductQtyInput('1');
    setNewProductUnitPriceInput(product.price?.toString() || '');
    setNewProductDiscountInput(
      typeof product.defaultDiscount === 'number' ? product.defaultDiscount.toString() : ''
    );
    setProductSearchQuery(product.name);
  };

  const handleAddNewProduct = () => {
    setCreateProductForm({
      name: newProduct.name,
      price: 0,
      defaultDiscount: 0,
    });
    setCreateProductPriceInput('');
    setCreateProductDiscountInput('');
    setShowCreateProduct(true);
  };

  const saveNewProduct = async () => {
    if (!createProductForm.name.trim() || createProductForm.price <= 0) {
      Alert.alert('Error', 'Please enter valid product details');
      return;
    }

    try {
      const newProd = await StorageService.addProduct({
        name: createProductForm.name.trim(),
        price: createProductForm.price,
        defaultDiscount: createProductForm.defaultDiscount,
      });
      
      setProducts([...products, newProd]);
      setNewProduct({
        name: newProd.name,
        qty: 1,
        unitPrice: newProd.price,
        discount: newProd.defaultDiscount,
      });
      setProductSearchQuery(newProd.name);
      setCreateProductForm({ name: '', price: 0, defaultDiscount: 0 });
      setShowCreateProduct(false);
      
      Alert.alert('Success', 'Product created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create product');
    }
  };

  const addProductToCart = () => {
    if (!newProduct.name || newProduct.unitPrice <= 0) {
      Alert.alert('Error', 'Please enter valid product details');
      return;
    }

    const cartItem: CartItem = {
      id: Date.now().toString(),
      name: newProduct.name,
      qty: newProduct.qty,
      unitPrice: newProduct.unitPrice,
      discount: newProduct.discount,
    };

    setCartItems([...cartItems, cartItem]);
    setNewProduct({ name: '', qty: 1, unitPrice: 0, discount: 0 });
    setNewProductQtyInput('1');
    setNewProductUnitPriceInput('');
    setNewProductDiscountInput('');
    setShowAddProduct(false);
  };

  const updateCartItem = (id: string, updates: Partial<CartItem>) => {
    setCartItems(items =>
      items.map(item => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const removeCartItem = (id: string) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  const startEditItem = (item: CartItem) => {
    setEditingItemId(item.id);
    setEditingItem({ ...item });
  };

  const saveEditItem = () => {
    if (editingItem && editingItemId) {
      updateCartItem(editingItemId, editingItem);
      setEditingItemId(null);
      setEditingItem(null);
    }
  };

  const cancelEditItem = () => {
    setEditingItemId(null);
    setEditingItem(null);
  };

  const calculation = calculateBill(
    cartItems,
    billDiscount,
    billDiscountType,
    taxPercent,
    otherCharges
  );

  const dueAmount = Math.max(0, calculation.grandTotal - paidAmount);

  const handlePreviewInvoice = async () => {
    if (!customerName.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }

    if (cartItems.length === 0) {
      Alert.alert('Error', 'Please add at least one product');
      return;
    }

    // Save customer if new
    await StorageService.addCustomer({
      name: customerName.trim(),
      phone: customerPhone.trim() || undefined,
      address: customerAddress.trim() || undefined,
    });

    const invoiceData = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      date: Date.now(),
      items: cartItems,
      billDiscount: calculation.billDiscount,
      taxPercent,
      otherCharges,
      otherChargesLabel: otherChargesLabel,
      subtotal: calculation.subtotal,
      total: calculation.grandTotal,
      paidAmount,
      dueAmount,
      paymentMode,
      isPaid: dueAmount === 0,
    };

    router.push({
      pathname: '/invoice-preview',
      params: { data: JSON.stringify(invoiceData), autoShare: customerPhone ? '1' : undefined },
    });
  };

  // Pick contact and populate Add Customer modal form
  const pickContactForNewCustomer = async () => {
    try {
      const { status: currentStatus } = await Contacts.getPermissionsAsync();
      let finalStatus = currentStatus;
      if (currentStatus !== 'granted') {
        const { status: requestStatus } = await Contacts.requestPermissionsAsync();
        finalStatus = requestStatus;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('Permission Required', 'Contacts permission is needed. Enable it in settings.');
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });
      if (!data.length) {
        Alert.alert('No Contacts', 'No contacts found.');
        return;
      }
      const options = data
        .filter(c => c.name && c.phoneNumbers?.length)
        .slice(0, 10)
        .map(c => ({
          name: c.name!,
          phone: c.phoneNumbers?.[0]?.number?.replace(/[^0-9+]/g, '') || '',
        }));
      if (!options.length) {
        Alert.alert('No Contacts', 'No contacts with phone numbers found.');
        return;
      }
      Alert.alert(
        'Select Contact',
        'Choose a contact to add',
        [
          ...options.map((opt) => ({
            text: `${opt.name} - ${opt.phone}`,
            onPress: () => setCreateCustomerForm(prev => ({
              ...prev,
              name: opt.name,
              phone: opt.phone,
            })),
          })),
          { text: 'Cancel', onPress: () => {} },
        ]
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to access contacts.');
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="always">
      <View style={styles.header}>
        <Text style={styles.title}>Generate New Bill</Text>
      </View>

      {/* Customer Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Details</Text>
        <View style={styles.customerContainer}>
          <View style={styles.customerInputContainer}>
            <CustomInput
              label="Customer Name"
              value={customerName}
              onChangeText={handleCustomerNameChange}
              required
              placeholder="Enter customer name"
            />
            {showCustomerSuggestions && (
              <View style={styles.suggestionsContainer}>
                <ScrollView 
                  style={styles.scrollableSuggestions}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="always"
                >
                  {filteredCustomers.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.suggestionItem}
                      onPress={() => selectCustomer(item)}
                    >
                      <User size={16} color="#007AFF" />
                      <View style={styles.suggestionDetails}>
                        <Text style={styles.suggestionName}>{item.name}</Text>
                        {item.phone && (
                          <Text style={styles.suggestionPhone}>{item.phone}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                  
                  <TouchableOpacity 
                    style={styles.addNewProductOption} 
                    onPress={openAddCustomerModal}
                  >
                    <Plus size={16} color="#34C759" />
                    <Text style={styles.addNewActionText}>
                      Add New Customer{customerName ? `: "${customerName}"` : ''}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Products */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Products</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setShowAddProduct(true);
              setNewProduct({ name: '', qty: 1, unitPrice: 0, discount: 0 });
              setProductSearchQuery('');
              setFilteredProducts([]);
            }}
          >
            <Plus size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {cartItems.length === 0 ? (
          <View style={styles.emptyCart}>
            <ShoppingCart size={48} color="#CCC" />
            <Text style={styles.emptyText}>No products added</Text>
            <Text style={styles.emptySubtext}>Tap the + button to add products</Text>
          </View>
        ) : (
          <View style={styles.cartList}>
            {cartItems.map((item) => {
              const itemTotal = item.qty * item.unitPrice;
              const discountAmount = (item.discount / 100) * itemTotal;
              const netAmount = itemTotal - discountAmount;

              return (
                <View key={item.id} style={styles.cartItem}>
                  <View style={styles.cartItemHeader}>
                    <Text style={styles.productName}>{item.name}</Text>
                    <TouchableOpacity
                      onPress={() => removeCartItem(item.id)}
                      style={styles.deleteButton}
                    >
                      <Trash2 size={16} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.cartItemDetails}>
                    <View style={styles.qtyControls}>
                      <TouchableOpacity
                        onPress={() => updateCartItem(item.id, { qty: Math.max(1, item.qty - 1) })}
                        style={styles.qtyButton}
                      >
                        <Minus size={16} color="#007AFF" />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.qty}</Text>
                      <TouchableOpacity
                        onPress={() => updateCartItem(item.id, { qty: item.qty + 1 })}
                        style={styles.qtyButton}
                      >
                        <Plus size={16} color="#007AFF" />
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.priceText}>
                      {formatCurrency(item.unitPrice)} × {item.qty} = {formatCurrency(netAmount)}
                    </Text>
                  </View>
                  
                  {/* Item Discount Input */}
                  <View style={styles.itemDiscountContainer}>
                    <Text style={styles.itemDiscountLabel}>Item Discount (%):</Text>
                    <View style={styles.itemDiscountInput}>
                      <CustomInput
                        label=""
                        value={item.discount.toString()}
                        onChangeText={(text) => updateCartItem(item.id, { discount: parseFloat(text) || 0 })}
                        keyboardType="numeric"
                        placeholder="0"
                        style={styles.smallInput}
                      />
                    </View>
                  </View>
                  
                  {item.discount > 0 && (
                    <Text style={styles.discountText}>
                      Discount: {item.discount}% (-{formatCurrency(discountAmount)})
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Discount & Tax Settings */}
      {/* Discount & Tax Settings */}
{cartItems.length > 0 && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Discount & Tax Settings</Text>
    <View style={styles.settingsCard}>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Bill Discount</Text>
        <View style={styles.discountControls}>
          <TouchableOpacity
            style={[styles.discountTypeButton, billDiscountType === 'percentage' && styles.discountTypeActive]}
            onPress={() => setBillDiscountType('percentage')}
          >
            <Text style={[styles.discountTypeText, billDiscountType === 'percentage' && styles.discountTypeTextActive]}>%</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.discountTypeButton, billDiscountType === 'amount' && styles.discountTypeActive]}
            onPress={() => setBillDiscountType('amount')}
          >
            <Text style={[styles.discountTypeText, billDiscountType === 'amount' && styles.discountTypeTextActive]}>₹</Text>
          </TouchableOpacity>
        </View>
      </View>
      <CustomInput
        label=""
        value={billDiscountInput}
        onChangeText={(text) => {
          setBillDiscountInput(text);
          setBillDiscount(text === '' ? 0 : parseFloat(text));
        }}
        keyboardType="numeric"
        placeholder={billDiscountType === 'percentage' ? 'Enter percentage' : 'Enter amount'}
      />
      
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Apply GST</Text>
        <Switch
          value={applyTax}
          onValueChange={(value) => {
            setApplyTax(value);
            setTaxPercent(value ? 18 : 0);
          }}
        />
      </View>
      
      {applyTax && (
        <CustomInput
          label="GST Rate (%)"
          value={taxPercentInput}
          onChangeText={(text) => {
            setTaxPercentInput(text);
            setTaxPercent(text === '' ? 0 : parseFloat(text));
          }}
          keyboardType="numeric"
          placeholder="Enter GST percentage"
        />
      )}
      
      {/* Updated Other Charges Section with Toggle */}
      <View style={styles.otherChargesContainer}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Other Charges</Text>
          <Switch
            value={showOtherChargesFields}
            onValueChange={(value) => {
              setShowOtherChargesFields(value);
              if (!value) {
                setOtherCharges(0);
                setOtherChargesInput('');
              }
            }}
          />
        </View>
        
        {showOtherChargesFields && (
          <View style={styles.otherChargesFields}>
            <CustomInput
              label="Charge Description"
              value={otherChargesLabel}
              onChangeText={setOtherChargesLabel}
              placeholder="Enter charge description"
            />
            <CustomInput
              label="Amount"
              value={otherChargesInput}
              onChangeText={(text) => {
                setOtherChargesInput(text);
                setOtherCharges(text === '' ? 0 : parseFloat(text));
              }}
              keyboardType="numeric"
              placeholder="Enter amount"
            />
          </View>
        )}
      </View>
    </View>
  </View>
)}

      {/* Payment Section */}
      {cartItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Grand Total:</Text>
              <Text style={styles.paymentTotal}>{formatCurrency(calculation.grandTotal)}</Text>
            </View>
            
            <CustomInput
              label="Paid Amount"
              value={paidAmountInput}
              onChangeText={(text) => {
                setPaidAmountInput(text);
                setPaidAmount(text === '' ? 0 : parseFloat(text));
              }}
              keyboardType="numeric"
              placeholder="Enter paid amount"
            />
            
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Due Amount:</Text>
              <Text style={[styles.paymentValue, dueAmount > 0 && styles.dueAmount]}>
                {formatCurrency(dueAmount)}
              </Text>
            </View>
            
            <View style={styles.paymentModeContainer}>
              <Text style={styles.paymentModeLabel}>Payment Mode:</Text>
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
          </View>
        </View>
      )}

{/* Bill Summary - Updated to use dynamic label */}
{cartItems.length > 0 && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Bill Summary</Text>
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotal:</Text>
        <Text style={styles.summaryValue}>{formatCurrency(calculation.subtotal)}</Text>
      </View>
      {calculation.totalProductDiscounts > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Product Discounts:</Text>
          <Text style={[styles.summaryValue, styles.discountValue]}>
            -{formatCurrency(calculation.totalProductDiscounts)}
          </Text>
        </View>
      )}
      {calculation.billDiscount > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Bill Discount:</Text>
          <Text style={[styles.summaryValue, styles.discountValue]}>
            -{formatCurrency(calculation.billDiscount)}
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
          <Text style={styles.summaryLabel}>{otherChargesLabel}:</Text>
          <Text style={styles.summaryValue}>{formatCurrency(otherCharges)}</Text>
        </View>
      )}
      <View style={[styles.summaryRow, styles.totalRow]}>
        <Text style={styles.totalLabel}>Grand Total:</Text>
        <Text style={styles.totalValue}>{formatCurrency(calculation.grandTotal)}</Text>
      </View>
    </View>
  </View>
)}

      {/* Action Buttons */}
      {cartItems.length > 0 && (
        <View style={styles.actionButtons}>
          <CustomButton
            title="Generate Invoice"
            onPress={handlePreviewInvoice}
            variant="primary"
          />
        </View>
      )}

      {/* Add Product Modal */}
      <Modal
        visible={showAddProduct}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddProduct(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Product</Text>
            <TouchableOpacity onPress={() => {
              setShowAddProduct(false);
              setProductSearchQuery('');
              setNewProduct({ name: '', qty: 1, unitPrice: 0, discount: 0 });
            }}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <ScrollView style={styles.productForm} keyboardShouldPersistTaps="always">
              {/* Product Name Input */}
              <CustomInput
                label="Product Name"
                value={newProduct.name}
                onChangeText={handleProductSearch}
                autoFocus
                required
                placeholder="Enter product name"
              />
              
              {/* Quick Product Selection */}
              {filteredProducts.length > 0 && (
                <View style={styles.quickProductsContainer}>
                  <Text style={styles.quickProductsTitle}>Quick Select:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickProductsScroll}>
                    {filteredProducts.map((product) => (
                      <TouchableOpacity
                        key={product.id}
                        style={styles.quickProductItem}
                        onPress={() => selectProduct(product)}
                      >
                        <Package size={16} color="#007AFF" />
                        <Text style={styles.quickProductName} numberOfLines={1}>
                          {product.name}
                        </Text>
                        <Text style={styles.quickProductPrice}>
                          {formatCurrency(product.price)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              
              {/* Product Not Found Option */}
              {newProduct.name.length > 0 && filteredProducts.length === 0 && (
                <TouchableOpacity
                  style={styles.addNewProductCard}
                  onPress={handleAddNewProduct}
                >
                  <Plus size={20} color="#34C759" />
                  <View style={styles.addNewProductTextContainer}>
                    <Text style={styles.addNewProductTitle}>Product Not Found</Text>
                    <Text style={styles.addNewProductSubtitle}>
                      Create new product: "{newProduct.name}"
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              
              <CustomInput
                label="Quantity"
                value={newProductQtyInput}
                onChangeText={(text) => {
                  setNewProductQtyInput(text);
                  setNewProduct({ ...newProduct, qty: text === '' ? 0 : parseInt(text) || 0 });
                }}
                keyboardType="numeric"
                required
              />
              <CustomInput
                label="Unit Price"
                value={newProductUnitPriceInput}
                onChangeText={(text) => {
                  setNewProductUnitPriceInput(text);
                  setNewProduct({ ...newProduct, unitPrice: text === '' ? 0 : parseFloat(text) || 0 });
                }}
                keyboardType="numeric"
                required
                placeholder="0.00"
              />
              <CustomInput
                label="Item Discount (%)"
                value={newProductDiscountInput}
                onChangeText={(text) => {
                  setNewProductDiscountInput(text);
                  setNewProduct({ ...newProduct, discount: text === '' ? 0 : parseFloat(text) || 0 });
                }}
                keyboardType="numeric"
                placeholder="0"
              />
            </ScrollView>
          </View>
          
          <View style={styles.modalActions}>
            <CustomButton
              title="Add to Cart"
              onPress={addProductToCart}
              variant="primary"
            />
          </View>
        </View>
      </Modal>

      {/* Create New Product Modal */}
      <Modal
        visible={showCreateProduct}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Product</Text>
            <TouchableOpacity onPress={() => {
              setShowCreateProduct(false);
              setCreateProductForm({ name: '', price: 0, defaultDiscount: 0 });
            }}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <CustomInput
              label="Product Name"
              value={createProductForm.name}
              onChangeText={(text) => setCreateProductForm({ ...createProductForm, name: text })}
              autoFocus
              required
              placeholder="Enter product name"
            />
            <CustomInput
              label="Default Price"
              value={createProductPriceInput}
              onChangeText={(text) => {
                setCreateProductPriceInput(text);
                setCreateProductForm({ ...createProductForm, price: text === '' ? 0 : parseFloat(text) || 0 });
              }}
              keyboardType="numeric"
              required
              placeholder="0.00"
            />
            <CustomInput
              label="Default Discount (%)"
              value={createProductDiscountInput}
              onChangeText={(text) => {
                setCreateProductDiscountInput(text);
                setCreateProductForm({ ...createProductForm, defaultDiscount: text === '' ? 0 : parseFloat(text) || 0 });
              }}
              keyboardType="numeric"
              placeholder="0"
            />
          </ScrollView>
          
          <View style={styles.modalActions}>
            <CustomButton
              title="Create Product"
              onPress={saveNewProduct}
              variant="primary"
            />
          </View>
        </View>
      </Modal>

      {/* Add New Customer Modal */}
      <Modal
        visible={showAddCustomerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddCustomerModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Customer</Text>
            <TouchableOpacity onPress={() => setShowAddCustomerModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="always">
            <CustomInput
              label="Customer Name"
              value={createCustomerForm.name}
              onChangeText={(text) => setCreateCustomerForm({ ...createCustomerForm, name: text })}
              autoFocus
              required
              placeholder="Enter customer name"
            />
            <View style={styles.phoneInputContainer}>
              <CustomInput
                label="Phone Number"
                value={createCustomerForm.phone}
                onChangeText={(text) => setCreateCustomerForm({ ...createCustomerForm, phone: text })}
                keyboardType="phone-pad"
                placeholder="Enter phone number (optional)"
              />
              <TouchableOpacity style={styles.contactButton} onPress={pickContactForNewCustomer}>
                <Phone size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <CustomInput
              label="Address"
              value={createCustomerForm.address}
              onChangeText={(text) => setCreateCustomerForm({ ...createCustomerForm, address: text })}
              multiline
              numberOfLines={2}
              placeholder="Enter address (optional)"
            />
          </ScrollView>

          <View style={styles.modalActions}>
            <CustomButton
              title="Save Customer"
              onPress={saveNewCustomer}
              variant="primary"
            />
          </View>
        </View>
      </Modal>
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
    padding: 24,
    paddingTop: 60,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  
  // Customer styles
  customerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  customerInputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  contactButton: {
    marginLeft: 12,
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
  },
  scrollableSuggestions: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionDetails: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  suggestionPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  
  // Product styles
  emptyCart: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  
  // Cart list styles
  cartList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cartItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cartItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  cartItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 4,
  },
  qtyButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  priceText: {
    fontSize: 14,
    color: '#666',
  },
  itemDiscountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  itemDiscountLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  itemDiscountInput: {
    width: 80,
  },
  smallInput: {
    height: 40,
  },
  discountText: {
    color: '#FF9500',
    fontSize: 12,
  },
  
  // Quick Products Selection
  quickProductsContainer: {
    marginBottom: 16,
  },
  quickProductsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  quickProductsScroll: {
    flexGrow: 0,
  },
  quickProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 150,
  },
  quickProductName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
    marginRight: 8,
    flex: 1,
  },
  quickProductPrice: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  
  // Add New Product Card
  addNewProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  addNewProductTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  addNewProductTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D5A2D',
  },
  addNewProductSubtitle: {
    fontSize: 14,
    color: '#4A7C4A',
    marginTop: 2,
  },
  
  // Settings Card Styles
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  discountControls: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 2,
  },
  discountTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  discountTypeActive: {
    backgroundColor: '#007AFF',
  },
  discountTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  discountTypeTextActive: {
    color: '#FFFFFF',
  },
  
  // Payment styles
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 16,
    color: '#666',
  },
  paymentTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  dueAmount: {
    color: '#FF3B30',
  },
  paymentModeContainer: {
    marginTop: 16,
  },
  paymentModeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
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
  
  // Summary styles
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
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
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: '#E5E5EA',
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  actionButtons: {
    padding: 16,
    paddingBottom: 32,
  },
  
  // Section header styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#34C759',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalActions: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  productForm: {
    flex: 1,
  },
  addNewProductOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  addNewActionText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  // Add these styles to the StyleSheet:
  otherChargesContainer: {
    marginBottom: 16,
  },
  otherChargesFields: {
    gap: 12,
  },
});