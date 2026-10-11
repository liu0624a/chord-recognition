import ReactDOM from 'react-dom/client';
import App from './App';
import { SettingsProvider } from './state/SettingsContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <SettingsProvider>
    <App />
  </SettingsProvider>,
);
