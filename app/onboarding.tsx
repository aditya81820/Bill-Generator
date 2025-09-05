import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { StorageService } from '@/utils/storage';
import CustomInput from '@/components/CustomInput';
import CustomButton from '@/components/CustomButton';
import { Store } from 'lucide-react-native';

export default function OnboardingScreen() {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    gstin: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your shop name');
      return;
    }

    setLoading(true);
    try {
      const shopData = {
        id: 1,
        name: formData.name.trim(),
        address: formData.address.trim() || undefined,
        gstin: formData.gstin.trim() || undefined,
      };

      await StorageService.saveShop(shopData);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', 'Failed to save shop details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Store size={48} color="#007AFF" />
        </View>
        <Text style={styles.title}>Welcome to Sales Bill</Text>
        <Text style={styles.subtitle}>
          Let's set up your shop details to get started
        </Text>
      </View>

      <View style={styles.form}>
        <CustomInput
          label="Shop Name"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          required
          placeholder="Enter your shop name"
        />
        
        <CustomInput
          label="Shop Address"
          value={formData.address}
          onChangeText={(text) => setFormData({ ...formData, address: text })}
          placeholder="Enter your shop address (optional)"
          multiline
          numberOfLines={3}
        />
        
        <CustomInput
          label="GSTIN / Tax ID"
          value={formData.gstin}
          onChangeText={(text) => setFormData({ ...formData, gstin: text })}
          placeholder="Enter GSTIN or Tax ID (optional)"
        />
      </View>

      <View style={styles.actions}>
        <CustomButton
          title="Get Started"
          onPress={handleSave}
          variant="primary"
          disabled={loading}
        />
      </View>

      <View style={styles.features}>
        <Text style={styles.featuresTitle}>What you can do:</Text>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>• Generate professional invoices</Text>
          <Text style={styles.featureItem}>• Manage your product catalog</Text>
          <Text style={styles.featureItem}>• Track sales and revenue</Text>
          <Text style={styles.featureItem}>• Share invoices via WhatsApp, Email</Text>
          <Text style={styles.featureItem}>• Calculate taxes and discounts automatically</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    marginBottom: 32,
  },
  actions: {
    marginBottom: 40,
  },
  features: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
});