import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Registra el service worker perquè Android/Chrome puguin oferir
// "Instal·lar app" automàticament. A iPhone/Safari no cal (ja funciona
// "Afegir a la pantalla d'inici" sense això). Es fa després de l'arrencada
// ("load") perquè mai bloquegi ni endarrereixi la primera càrrega de l'app.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[GolfSana] No s'ha pogut registrar el service worker:", err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
