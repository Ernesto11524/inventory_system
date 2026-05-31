import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { OfflineStatusBar } from './components/ui/OfflineStatusBar';
import { initTheme } from './store/settingsStore';
import './index.css';
// Apply persisted theme class before first paint
initTheme();
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 2, // 2 minutes
            gcTime: 1000 * 60 * 10, // 10 minutes
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <OfflineStatusBar />
      <App />
        <Toaster position="top-right" toastOptions={{
        duration: 4000,
        style: {
            background: '#fff',
            color: '#111827',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
        },
    }}/>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false}/>
    </QueryClientProvider>
  </React.StrictMode>);
//# sourceMappingURL=main.js.map