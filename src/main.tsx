import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import PowerProvider from './PowerProvider';
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PowerProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PowerProvider>
  </StrictMode>
);
