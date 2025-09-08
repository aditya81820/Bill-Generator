import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Alert, ScrollView } from 'react-native';
import { StorageService } from '@/utils/storage';
import { Customer } from '@/types';
import CustomInput from '@/components/CustomInput';
import CustomButton from '@/components/CustomButton';
import { Plus, User, Phone, MapPin, Trash2 } from 'lucide-react-native';

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const list = await StorageService.getCustomers();
      setCustomers(list);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return customers;
    const q = query.toLowerCase();
    return customers.filter(
      c => c.name.toLowerCase().includes(q) || (c.phone || '').includes(query)
    );
  }, [customers, query]);

  const openAdd = () => {
    setForm({ name: '', phone: '', address: '' });
    setShowAddModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Customer name is required');
      return;
    }
    try {
      const saved = await StorageService.addCustomer({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
      });
      setCustomers(prev => {
        const exists = prev.find(c => c.id === saved.id);
        return exists ? prev.map(c => (c.id === saved.id ? saved : c)) : [...prev, saved];
      });
      setShowAddModal(false);
      Alert.alert('Success', 'Customer saved');
    } catch (e) {
      Alert.alert('Error', 'Failed to save customer');
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Delete Customer', 'Are you sure you want to delete this customer?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(id) },
    ]);
  };

  const remove = async (id: string) => {
    try {
      await StorageService.deleteCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      Alert.alert('Error', 'Failed to delete customer');
    }
  };

  const renderItem = ({ item }: { item: Customer }) => (
    <View style={styles.item}>
      <View style={styles.itemHeader}>
        <Text style={styles.name}>{item.name}</Text>
        <TouchableOpacity onPress={() => confirmDelete(item.id)} style={styles.deleteBtn}>
          <Trash2 size={18} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      {item.phone ? (
        <View style={styles.row}>
          <Phone size={16} color="#666" />
          <Text style={styles.sub}>{item.phone}</Text>
        </View>
      ) : null}
      {item.address ? (
        <View style={styles.row}>
          <MapPin size={16} color="#666" />
          <Text style={styles.sub}>{item.address}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Customers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchCard}>
        <CustomInput
          label="Search"
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or phone"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered.length === 0 && styles.emptyList}
        renderItem={renderItem}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <User size={48} color="#CCC" />
              <Text style={styles.emptyText}>No customers found</Text>
              <Text style={styles.emptySub}>Tap + to add a customer</Text>
            </View>
          ) : null
        }
      />

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Customer</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="always">
            <CustomInput
              label="Name"
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: text })}
              autoFocus
              required
              placeholder="Enter customer name"
            />
            <CustomInput
              label="Phone"
              value={form.phone}
              onChangeText={(text) => setForm({ ...form, phone: text })}
              keyboardType="phone-pad"
              placeholder="Enter phone (optional)"
            />
            <CustomInput
              label="Address"
              value={form.address}
              onChangeText={(text) => setForm({ ...form, address: text })}
              multiline
              numberOfLines={2}
              placeholder="Enter address (optional)"
            />
          </ScrollView>
          <View style={styles.modalFooter}>
            <CustomButton title="Save Customer" onPress={save} variant="primary" />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 12,
    borderRadius: 12,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  emptySub: {
    marginTop: 6,
    fontSize: 14,
    color: '#999',
  },
  item: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  sub: {
    fontSize: 14,
    color: '#666',
  },
  deleteBtn: {
    padding: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    paddingTop: 60,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelText: {
    color: '#007AFF',
    fontSize: 16,
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  modalFooter: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
});
