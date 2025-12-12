import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ApiRateLimitToast from './components/ApiRateLimitToast';
import { RateLimitProvider } from './contexts/RateLimitContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RateLimitProvider>
      <App />
      <ApiRateLimitToast />
    </RateLimitProvider>
  </StrictMode>,
)
