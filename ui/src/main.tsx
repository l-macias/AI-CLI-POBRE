import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// Importa el archivo base de Tailwind (reemplazando el viejo styles.css)
import './styles.css';

const root = document.querySelector('#root');

if (!root) {
  throw new Error('Root element not found.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
