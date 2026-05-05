import { createBrowserRouter } from 'react-router';
import { Landing } from './pages/Landing';
import { RootError } from './pages/RootError';
import { ConsentGate } from './features/test/components/ConsentGate';
import { TypeSelector } from './features/test/components/TypeSelector';
import { TestFlow } from './features/test/components/TestFlow';
import { TestSubmit } from './features/test/components/TestSubmit';
import { ResultPage } from './features/result/components/ResultPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Landing />,
    errorElement: <RootError />,
  },
  {
    path: '/consent',
    element: <ConsentGate />,
    errorElement: <RootError />,
  },
  {
    path: '/declare',
    element: <TypeSelector />,
    errorElement: <RootError />,
  },
  {
    path: '/test',
    element: <TestFlow />,
    errorElement: <RootError />,
  },
  {
    path: '/test/submit',
    element: <TestSubmit />,
    errorElement: <RootError />,
  },
  {
    path: '/result/:resultId',
    element: <ResultPage />,
    errorElement: <RootError />,
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
