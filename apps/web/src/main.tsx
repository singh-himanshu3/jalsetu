import React from 'react';
import { createRoot } from 'react-dom/client';
import Startup from './Startup';
import './styles.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><Startup /></React.StrictMode>);
