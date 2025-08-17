// Configuração centralizada do Firebase
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD5vmKj4pIeKN__GVwzZT1d58C3HQJ2xlE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "styleswift-94ff8.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "styleswift-94ff8",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "styleswift-94ff8.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "32104028466",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:32104028466:web:8a3580328193df8bdf1f2b"
};

// Chave VAPID (você deve substituir pela sua chave real)
export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || null;

// Verificar se a configuração está completa
export const isFirebaseConfigValid = () => {
  return Object.values(firebaseConfig).every(value => !!value);
};

// Log da configuração (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  console.log('Firebase Config:', {
    ...firebaseConfig,
    vapidKey: vapidKey ? '✅ Configurado' : '❌ Não configurado'
  });
}
