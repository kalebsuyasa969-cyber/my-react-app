import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyD63B33JSCVH4BmF4aopFVoeBIWc9LXGZ0',
  authDomain: 'my-react-app-d1cf5.firebaseapp.com',
  projectId: 'my-react-app-d1cf5',
  storageBucket: 'my-react-app-d1cf5.firebasestorage.app',
  messagingSenderId: '733168340622',
  appId: '1:733168340622:web:67f5358a5c8d63af9a83df',
  measurementId: 'G-XNPJ86HDGS',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
