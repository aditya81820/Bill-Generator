import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { StorageService } from '@/utils/storage';
import { checkLicenseStatus } from '@/utils/license';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    checkStartup();
  }, []);

  const checkStartup = async () => {
    try {
      // 1) Ensure license is valid/bound
      const lic = await checkLicenseStatus();
      if (!lic.ok) {
        router.replace('/license' as any);
        await SplashScreen.hideAsync();
        return;
      }

      // 2) Continue to onboarding if shop not configured
      const shop = await StorageService.getShop();
      if (!shop) router.replace('/onboarding');
      // Hide splash screen after initialization
      await SplashScreen.hideAsync();
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      // Hide splash screen even on error
      await SplashScreen.hideAsync();
    }
  };

  return (
    <>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
        <Stack.Screen name="license" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="invoice-preview" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
