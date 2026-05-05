import { isRouteErrorResponse, useRouteError } from 'react-router';

export function RootError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Đã xảy ra lỗi không mong muốn';

  return (
    <div className="min-h-screen bg-surface-deep flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Lỗi</h1>
        <p className="text-slate-400">{message}</p>
      </div>
    </div>
  );
}
