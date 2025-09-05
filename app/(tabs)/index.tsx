import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { StorageService } from '@/utils/storage';
import { Shop, Invoice } from '@/types';
import { formatCurrency } from '@/utils/calculations';
import CustomButton from '@/components/CustomButton';
import LoadingSpinner from '@/components/LoadingSpinner';
import { FileText, Package, TrendingUp, Users } from 'lucide-react-native';

export default function DashboardScreen() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    totalProducts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [shopData, invoices, products] = await Promise.all([
        StorageService.getShop(),
        StorageService.getInvoices(),
        StorageService.getProducts(),
      ]);

      if (!shopData) {
        router.replace('/onboarding');
        return;
      }

      setShop(shopData);
      
      // Get recent invoices (last 5)
      const sortedInvoices = invoices.sort((a, b) => b.date - a.date);
      setRecentInvoices(sortedInvoices.slice(0, 5));

      // Calculate stats
      const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
      setStats({
        totalInvoices: invoices.length,
        totalRevenue,
        totalProducts: products.length,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back!</Text>
        <Text style={styles.shopName}>{shop?.name}</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <FileText size={24} color="#007AFF" />
          <Text style={styles.statNumber}>{stats.totalInvoices}</Text>
          <Text style={styles.statLabel}>Total Invoices</Text>
        </View>
        <View style={styles.statCard}>
          <TrendingUp size={24} color="#34C759" />
          <Text style={styles.statNumber}>{formatCurrency(stats.totalRevenue)}</Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>
        <View style={styles.statCard}>
          <Package size={24} color="#FF9500" />
          <Text style={styles.statNumber}>{stats.totalProducts}</Text>
          <Text style={styles.statLabel}>Products</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <CustomButton
            title="Generate New Bill"
            onPress={() => router.push('/generate-bill')}
            variant="primary"
            style={styles.actionButton}
          />
          <CustomButton
            title="View All Invoices"
            onPress={() => router.push('/invoices')}
            variant="outline"
            style={styles.actionButton}
          />
        </View>
      </View>

      {/* Recent Invoices */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Invoices</Text>
        {recentInvoices.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color="#CCC" />
            <Text style={styles.emptyText}>No invoices yet</Text>
            <Text style={styles.emptySubtext}>Create your first invoice to get started</Text>
          </View>
        ) : (
          <View style={styles.invoiceList}>
            {recentInvoices.map((invoice) => (
              <TouchableOpacity
                key={invoice.id}
                style={styles.invoiceItem}
                onPress={() => router.push(`/invoice-preview?id=${invoice.id}`)}
              >
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                  <Text style={styles.customerName}>{invoice.customerName}</Text>
                  <Text style={styles.invoiceDate}>
                    {new Date(invoice.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.invoiceAmount}>
                  {formatCurrency(invoice.total)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
    padding: 24,
    paddingTop: 60,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 16,
    opacity: 0.9,
  },
  shopName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
  emptyState: {
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
  invoiceList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  customerName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  invoiceDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  invoiceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
});