import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Apply saved theme before render (default: dark) to avoid a flash
const saved = localStorage.getItem('theme');
const theme = saved === 'light' ? 'light' : 'dark';
document.documentElement.classList.add(theme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
