import "./styles/tailwind.css";   // 👈 REQUIRED

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import PowerProvider from './PowerProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PowerProvider>
      <RouterProvider router={router} />
    </PowerProvider>
  </StrictMode>
);