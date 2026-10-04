import React from 'react';
import ReactDOM from 'react-dom/client';
import { IconContext } from '@phosphor-icons/react';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <IconContext.Provider value={{ size: 16, weight: 'bold' }}>
      <App />
    </IconContext.Provider>
  </React.StrictMode>
);
