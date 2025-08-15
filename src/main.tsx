import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/themes.css'

// Registrar service worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW: Service Worker registered successfully:', registration);
        
        // Verificar se há uma atualização disponível
        registration.addEventListener('updatefound', () => {
          console.log('SW: New service worker update found');
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('SW: New content is available; please refresh');
                // Aqui você pode mostrar uma notificação para o usuário
              }
            });
          }
        });
      })
      .catch((registrationError) => {
        console.error('SW: Service Worker registration failed:', registrationError);
      });
  });
  
  // Escutar mensagens do service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('SW: Message from service worker:', event.data);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
