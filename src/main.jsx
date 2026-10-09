import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/noto-nastaliq-urdu/400.css';
import '@fontsource/noto-nastaliq-urdu/700.css';
import './index.css';
import { ensureUrduFontsLoaded } from './utils/printUtils.js';

// Guarantee Nastaleeq fonts are loaded before opening print preview / PDF
if (typeof window !== 'undefined') {
  const originalPrint = window.print.bind(window);
  window.print = async function () {
    await ensureUrduFontsLoaded();
    originalPrint();
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
