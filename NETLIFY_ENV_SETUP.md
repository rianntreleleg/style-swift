# 🔧 Configuração das Variáveis de Ambiente no Netlify

## ❌ **Problema Identificado:**
```
Configurações do Firebase faltando: apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId
```

## 🔍 **Causa:**
As variáveis de ambiente do Firebase não estão configuradas no painel do Netlify.

## ✅ **Solução:**

### **1. Configurar Variáveis no Netlify:**

1. **Acesse o painel do Netlify:**
   - Vá para [netlify.com](https://netlify.com)
   - Faça login na sua conta
   - Selecione o projeto `styleswift`

2. **Vá para "Site settings" > "Environment variables"**

3. **Adicione as seguintes variáveis:**
   ```
   VITE_FIREBASE_API_KEY=AIzaSyD5vmKj4pIeKN__GVwzZT1d58C3HQJ2xlE
   VITE_FIREBASE_AUTH_DOMAIN=styleswift-94ff8.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=styleswift-94ff8
   VITE_FIREBASE_STORAGE_BUCKET=styleswift-94ff8.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=32104028466
   VITE_FIREBASE_APP_ID=1:32104028466:web:8a3580328193df8bdf1f2b
   VITE_FIREBASE_VAPID_KEY=SUA_CHAVE_VAPID_AQUI
   ```

4. **Clique em "Save"**

5. **Redeploy o site:**
   - Vá para "Deploys"
   - Clique em "Trigger deploy" > "Deploy site"

### **2. Verificar Configuração:**

Após o redeploy, verifique se as variáveis estão carregadas:
```javascript
// No console do navegador
console.log('Firebase Config:', {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
});
```

### **3. Solução Alternativa (Já Implementada):**

O service worker já tem a configuração hardcoded, então o Firebase deve funcionar mesmo sem as variáveis de ambiente no frontend.

## 🚀 **Próximos Passos:**

1. Configure as variáveis no Netlify
2. Faça redeploy
3. Teste novamente o PWA

## 📱 **Status:**
- ✅ Service worker com configuração hardcoded
- ⏳ Aguardando configuração das variáveis no Netlify
- ⏳ Aguardando redeploy

**Configure as variáveis no Netlify e faça redeploy! 🔄**
