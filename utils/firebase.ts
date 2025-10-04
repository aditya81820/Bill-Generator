import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Minimal Firebase web SDK initialization for Expo React Native
// Uses the provided google-services.json values (Android) mapped to Web config
// Only required fields for Firestore/Auth are included

const firebaseConfig = {
  apiKey: 'AIzaSyA-teXxYmsOvSebpTJg5k6MwpNqPwCoU6U',
  projectId: 'bill-generator-c34a0',
  appId: '1:89147062421:android:3ad19326b2fe4fe53a839c',
  messagingSenderId: '89147062421',
  // storageBucket is optional for our current usage; if you plan to use Storage, set it explicitly
  // storageBucket: 'bill-generator-c34a0.appspot.com',
};

let app: FirebaseApp;

export function getFirebaseApp() {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0]!;
  }
  return app;
}

export const firestore = getFirestore(getFirebaseApp());
