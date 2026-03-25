import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthRoute, AdminRoute } from './components/AuthRoute';
import { Login } from './pages/Login';
import { Admin } from './pages/Admin';
import { Judge } from './pages/Judge';
import { Leaderboard } from './pages/Leaderboard';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
          <Route
            path="/judge"
            element={
              <AuthRoute>
                <Judge />
              </AuthRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <AuthRoute>
                <Leaderboard />
              </AuthRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
