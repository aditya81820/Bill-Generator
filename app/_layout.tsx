import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { StorageService } from '@/utils/storage';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const shop = await StorageService.getShop();
      if (!shop) {
        router.replace('/onboarding');
      }
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
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="invoice-preview" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
