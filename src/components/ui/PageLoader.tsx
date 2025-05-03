import { Loader2 } from 'lucide-react';

export default function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center glass-card p-8">
        <Loader2 className="h-12 w-12 text-primary-500 animate-spin-slow mx-auto" />
        <h2 className="mt-4 text-xl font-semibold text-gray-900">Loading...</h2>
        <p className="mt-2 text-gray-600">Please wait while we set things up for you.</p>
        <div className="mt-4 w-48 h-1 bg-gray-200 rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-primary-500 animate-pulse-slow rounded-full"></div>
        </div>
      </div>
    </div>
  );
}