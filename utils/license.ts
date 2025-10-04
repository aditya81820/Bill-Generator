import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { firestore } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export type LicenseRecord = {
  license_key: string;
  device_id?: string;
  expires_at?: string; // ISO date string
  revoked?: boolean;
};

export type LocalLicenseInfo = {
  vendorPhone: string;
  licenseKey: string;
};

const KEYS = {
  LOCAL_LICENSE: 'license_info',
  DEVICE_ID: 'device_id_cached',
};

async function ensureDeviceId(): Promise<string> {
  // Prefer stable Android ID on Android. On iOS/others, persist a generated ID in AsyncStorage.
  try {
    // Support both newer and older SDKs
    // @ts-ignore - some SDKs expose getAndroidId, others expose androidId
    if (typeof (Application as any).getAndroidId === 'function') {
      // @ts-ignore
      const id = await (Application as any).getAndroidId();
      if (id) return id as string;
    } else {
      // @ts-ignore
      const id = (Application as any).androidId as string | null | undefined;
      if (id) return id;
    }
  } catch {}
  const cached = await AsyncStorage.getItem(KEYS.DEVICE_ID);
  if (cached) return cached;
  const generated = `dev_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  await AsyncStorage.setItem(KEYS.DEVICE_ID, generated);
  return generated;
}

export const LicenseStorage = {
  async getLocal(): Promise<LocalLicenseInfo | null> {
    const data = await AsyncStorage.getItem(KEYS.LOCAL_LICENSE);
    return data ? JSON.parse(data) : null;
  },
  async saveLocal(info: LocalLicenseInfo): Promise<void> {
    await AsyncStorage.setItem(KEYS.LOCAL_LICENSE, JSON.stringify(info));
  },
  async clearLocal(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.LOCAL_LICENSE);
  },
};

function isExpired(expires_at?: string) {
  if (!expires_at) return false;
  const now = new Date();
  const exp = new Date(expires_at);
  return now > exp;
}

export async function fetchLicense(vendorPhone: string): Promise<LicenseRecord | null> {
  try {
    const ref = doc(firestore, 'licenses', vendorPhone);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as LicenseRecord) : null;
  } catch (e: any) {
    console.error('fetchLicense error:', e?.message || e);
    return null;
  }
}

export async function validateAndBindLicense(vendorPhone: string, licenseKey: string): Promise<{
  ok: boolean;
  reason?: string;
}> {
  try {
    const deviceId = await ensureDeviceId();
    const ref = doc(firestore, 'licenses', vendorPhone);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { ok: false, reason: 'License not found' };
    const data = snap.data() as LicenseRecord;
    if (data.revoked) return { ok: false, reason: 'License revoked' };
    if (isExpired(data.expires_at)) return { ok: false, reason: 'License expired' };
    if (!data.license_key || data.license_key !== licenseKey)
      return { ok: false, reason: 'Invalid license key' };

    if (!data.device_id || data.device_id.length === 0) {
      // Attempt to bind current device
      try {
        await updateDoc(ref, { device_id: deviceId });
      } catch (e: any) {
        const msg = typeof e?.message === 'string' ? e.message : String(e);
        if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('permission-denied')) {
          return { ok: false, reason: 'Write denied while binding device. Update Firestore rules or bind device_id manually.' };
        }
        return { ok: false, reason: `Failed to bind device: ${msg}` };
      }
    } else if (data.device_id !== deviceId) {
      return { ok: false, reason: 'License already used on another device' };
    }

    // Persist locally
    await LicenseStorage.saveLocal({ vendorPhone, licenseKey });
    return { ok: true };
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : String(e);
    console.error('validateAndBindLicense error:', msg);
    return { ok: false, reason: msg };
  }
}

export async function checkLicenseStatus(): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const local = await LicenseStorage.getLocal();
  if (!local) return { ok: false, reason: 'No license saved' };
  try {
    const deviceId = await ensureDeviceId();
    const data = await fetchLicense(local.vendorPhone);
    if (!data) return { ok: false, reason: 'License not found' };
    if (data.revoked) return { ok: false, reason: 'License revoked' };
    if (isExpired(data.expires_at)) return { ok: false, reason: 'License expired' };
    if (!data.license_key || data.license_key !== local.licenseKey)
      return { ok: false, reason: 'License key mismatch' };
    if (data.device_id && data.device_id !== deviceId)
      return { ok: false, reason: 'Device mismatch' };
    return { ok: true };
  } catch (e) {
    const msg = (e as any)?.message ? String((e as any).message) : 'Network or permission error';
    return { ok: false, reason: msg };
  }
}
