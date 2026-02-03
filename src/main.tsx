import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import './style.css';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
