import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import CustomInput from '@/components/CustomInput';
import CustomButton from '@/components/CustomButton';
import { validateAndBindLicense, LicenseStorage } from '@/utils/license';

export default function LicenseScreen() {
  const [vendorPhone, setVendorPhone] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Prefill from local storage if present
    (async () => {
      const local = await LicenseStorage.getLocal();
      if (local) {
        setVendorPhone(local.vendorPhone);
        setLicenseKey(local.licenseKey);
      }
    })();
  }, []);

  const onSubmit = async () => {
    const phone = vendorPhone.trim();
    const key = licenseKey.trim();
    if (!phone || !key) {
      Alert.alert('Missing Info', 'Please enter vendor phone and license key.');
      return;
    }
    try {
      setLoading(true);
      const res = await validateAndBindLicense(phone, key);
      if (!res.ok) {
        Alert.alert('License Error', res.reason || 'Unable to validate license');
        return;
      }
      Alert.alert('Success', 'License validated successfully!', [
        { text: 'Continue', onPress: () => router.replace('/onboarding') },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to validate license. Check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <View style={styles.card}>
        <Text style={styles.title}>Activate License</Text>
        <Text style={styles.subtitle}>Enter your registered phone and license key</Text>

        <CustomInput
          label="Vendor Phone"
          value={vendorPhone}
          onChangeText={setVendorPhone}
          placeholder="e.g. 9876543210"
          keyboardType="phone-pad"
          required
        />

        <CustomInput
          label="License Key"
          value={licenseKey}
          onChangeText={setLicenseKey}
          placeholder="e.g. ABCD1234"
          autoCapitalize="characters"
          required
        />

        <CustomButton
          title={loading ? 'Validating...' : 'Validate & Continue'}
          onPress={onSubmit}
          variant="primary"
          disabled={loading}
          style={{ marginTop: 12 }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
});
