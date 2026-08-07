import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyD63B33JSCVH4BmF4aopFVoeBIWc9LXGZ0',
  authDomain: 'my-react-app-d1cf5.firebaseapp.com',
  projectId: 'my-react-app-d1cf5',
  messagingSenderId: '733168340622',
  appId: '1:733168340622:web:67f5358a5c8d63af9a83df',
  measurementId: 'G-XNPJ86HDGS',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();
// Note: Firebase Storage is intentionally not used. Since Feb 2026, Storage
// requires the paid Blaze plan even for free-tier usage. The uploaded file
// is only needed long enough to extract its questions (done client-side in
// utils/parseDocument.js) — the parsed questions are what get saved to
// Firestore, so the raw file itself never needs to be stored anywhere.
