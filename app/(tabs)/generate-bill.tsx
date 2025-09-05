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
} from 'react-native';
import { router } from 'expo-router';
import { StorageService } from '@/utils/storage';
import { calculateBill, formatCurrency } from '@/utils/calculations';
import { Product, CartItem } from '@/types';
import CustomInput from '@/components/CustomInput';
import CustomButton from '@/components/CustomButton';
import { Plus, Minus, Trash2, ShoppingCart, Search, Package } from 'lucide-react-native';

export default function GenerateBillScreen() {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [billDiscount, setBillDiscount] = useState(0);
  const [billDiscountType, setBillDiscountType] = useState<'amount' | 'percentage'>('percentage');
  const [taxPercent, setTaxPercent] = useState(0);
  const [applyTax, setApplyTax] = useState(false);
  const [otherCharges, setOtherCharges] = useState(0);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  
  // Product search and suggestions
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    qty: 1,
    unitPrice: 0,
    discount: 0,
  });
  
  // New product creation form
  const [createProductForm, setCreateProductForm] = useState({
    name: '',
    price: 0,
    defaultDiscount: 0,
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const productList = await StorageService.getProducts();
    setProducts(productList);
  };

  // Product search and suggestion handlers
  const handleProductSearch = (text: string) => {
    setProductSearchQuery(text);
    
    if (text.length > 0) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredProducts(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
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
    setProductSearchQuery(product.name);
    setShowSuggestions(false);
  };

  const handleAddNewProduct = () => {
    setCreateProductForm({
      name: newProduct.name,
      price: 0,
      defaultDiscount: 0,
    });
    setShowSuggestions(false);
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
      
      // Add to local products list
      setProducts([...products, newProd]);
      
      // Select the newly created product
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

  const calculation = calculateBill(
    cartItems,
    billDiscount,
    billDiscountType,
    taxPercent,
    otherCharges
  );

  const handlePreviewInvoice = () => {
    if (!customerName.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }

    if (cartItems.length === 0) {
      Alert.alert('Error', 'Please add at least one product');
      return;
    }

    const invoiceData = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      date: Date.now(),
      items: cartItems,
      billDiscount: calculation.billDiscount,
      taxPercent,
      otherCharges,
      subtotal: calculation.subtotal,
      total: calculation.grandTotal,
    };

    router.push({
      pathname: '/invoice-preview',
      params: { data: JSON.stringify(invoiceData) },
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Generate New Bill</Text>
      </View>

      {/* Customer Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Details</Text>
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
          placeholder="Enter phone number (optional)"
        />
      </View>

      {/* Products */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Products</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setShowAddProduct(true);
              setProductSearchQuery('');
              setShowSuggestions(false);
              setNewProduct({ name: '', qty: 1, unitPrice: 0, discount: 0 });
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
      {cartItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discount & Tax Settings</Text>
          <View style={styles.settingsCard}>
            {/* Bill Discount */}
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
              value={billDiscount.toString()}
              onChangeText={(text) => setBillDiscount(parseFloat(text) || 0)}
              keyboardType="numeric"
              placeholder={billDiscountType === 'percentage' ? 'Enter percentage' : 'Enter amount'}
            />
            
            {/* Tax Settings */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Apply GST</Text>
              <Switch
                value={applyTax}
                onValueChange={(value) => {
                  setApplyTax(value);
                  if (!value) {
                    setTaxPercent(0);
                  } else {
                    setTaxPercent(18);
                  }
                }}
              />
            </View>
            
            {applyTax && (
              <CustomInput
                label="GST Rate (%)"
                value={taxPercent.toString()}
                onChangeText={(text) => setTaxPercent(parseFloat(text) || 0)}
                keyboardType="numeric"
                placeholder="Enter GST percentage"
              />
            )}
            
            {/* Other Charges */}
            <CustomInput
              label="Other Charges"
              value={otherCharges.toString()}
              onChangeText={(text) => setOtherCharges(parseFloat(text) || 0)}
              keyboardType="numeric"
              placeholder="Additional charges (optional)"
            />
          </View>
        </View>
      )}

      
      {/* Bill Summary */}
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
                <Text style={styles.summaryLabel}>Other Charges:</Text>
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
            title="Preview Invoice"
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
              setShowSuggestions(false);
              setNewProduct({ name: '', qty: 1, unitPrice: 0, discount: 0 });
            }}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            {/* Product Details Form */}
            <ScrollView style={styles.productForm}>
              {/* Product Name with Integrated Suggestions */}
              <View style={styles.productInputContainer}>
                <CustomInput
                  label="Product Name"
                  value={newProduct.name}
                  onChangeText={(text) => {
                    setNewProduct({ ...newProduct, name: text });
                    handleProductSearch(text);
                  }}
                  required
                  placeholder="Enter or search product name"
                />
                
                {/* Product Suggestions Dropdown */}
                {showSuggestions && newProduct.name.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    {filteredProducts.length > 0 ? (
                      <FlatList
                        data={filteredProducts}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={styles.suggestionItem}
                            onPress={() => selectProduct(item)}
                          >
                            <Package size={16} color="#007AFF" />
                            <View style={styles.suggestionDetails}>
                              <Text style={styles.suggestionName}>{item.name}</Text>
                              <Text style={styles.suggestionPrice}>{formatCurrency(item.price)}</Text>
                            </View>
                          </TouchableOpacity>
                        )}
                        maxHeight={200}
                      />
                    ) : (
                      <View style={styles.noSuggestions}>
                        <Text style={styles.noSuggestionsText}>No products found</Text>
                      </View>
                    )}
                    
                    {/* Add New Product Option */}
                    {newProduct.name.length > 0 && (
                      <TouchableOpacity
                        style={styles.addNewProductOption}
                        onPress={handleAddNewProduct}
                      >
                        <Plus size={16} color="#34C759" />
                        <Text style={styles.addNewProductText}>
                          Add new product: "{newProduct.name}"
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
              <CustomInput
                label="Quantity"
                value={newProduct.qty.toString()}
                onChangeText={(text) => setNewProduct({ ...newProduct, qty: parseInt(text) || 1 })}
                keyboardType="numeric"
                required
              />
              <CustomInput
                label="Unit Price"
                value={newProduct.unitPrice.toString()}
                onChangeText={(text) => setNewProduct({ ...newProduct, unitPrice: parseFloat(text) || 0 })}
                keyboardType="numeric"
                required
                placeholder="0.00"
              />
              <CustomInput
                label="Item Discount (%)"
                value={newProduct.discount.toString()}
                onChangeText={(text) => setNewProduct({ ...newProduct, discount: parseFloat(text) || 0 })}
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
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <CustomInput
              label="Product Name"
              value={createProductForm.name}
              onChangeText={(text) => setCreateProductForm({ ...createProductForm, name: text })}
              required
              placeholder="Enter product name"
            />
            <CustomInput
              label="Default Price"
              value={createProductForm.price.toString()}
              onChangeText={(text) => setCreateProductForm({ ...createProductForm, price: parseFloat(text) || 0 })}
              keyboardType="numeric"
              required
              placeholder="0.00"
            />
            <CustomInput
              label="Default Discount (%)"
              value={createProductForm.defaultDiscount.toString()}
              onChangeText={(text) => setCreateProductForm({ ...createProductForm, defaultDiscount: parseFloat(text) || 0 })}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#34C759',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  discountText: {
    fontSize: 12,
    color: '#FF9500',
    marginTop: 4,
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
  cancelButton: {
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
  
  // Search and Suggestions Styles
  searchContainer: {
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginTop: 8,
    maxHeight: 250,
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
  suggestionPrice: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  noSuggestions: {
    padding: 20,
    alignItems: 'center',
  },
  noSuggestionsText: {
    fontSize: 14,
    color: '#999',
  },
  addNewProductOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  addNewProductText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  productForm: {
    flex: 1,
  },
  
  // Product input with suggestions
  productInputContainer: {
    position: 'relative',
    marginBottom: 16,
    zIndex: 1000,
  },
  
  // Item discount styles
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
});
