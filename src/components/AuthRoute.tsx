import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <AppLoader />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <AppLoader />;
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== 'admin') return <Navigate to="/judge" replace />;
  return <>{children}</>;
}

function AppLoader() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-divider border-t-primary rounded-full animate-spin" />
        <p className="text-text-secondary text-sm font-body">Loading...</p>
      </div>
    </div>
  );
}
