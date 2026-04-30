import { createBrowserRouter } from 'react-router';
import App from './App';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '*',
    element: (
      <div className="min-h-screen bg-[#0D0F1A] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">404</h1>
          <p className="text-slate-400">Trang không tồn tại</p>
        </div>
      </div>
    ),
  },
]);
