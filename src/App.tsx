import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './components/Login';
import SelectStore from './components/SelectStore';
import CreateStore from './components/CreateStore';
import Shell from './components/layout/Shell';
import Cashier from './components/pos/Cashier';
import Inventory from './components/admin/Inventory';
import Dashboard from './components/admin/Dashboard';
import OrderHistory from './components/admin/OrderHistory';
import Shifts from './components/admin/Shifts';
import StaffManagement from './components/admin/StaffManagement';
import AIAssistant from './components/ai/AIAssistant';

function PrivateRoute({ children, role }: { children: React.ReactNode, role?: string }) {
  const { user, currentStore, isLoading } = useAuth();
  
  if (isLoading) return <div className="flex items-center justify-center min-h-screen font-bold text-slate-500 uppercase tracking-[0.5em]">Initializing Cathtea POS...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!currentStore) return <Navigate to="/select-store" replace />;
  
  if (role && user.role !== role && user.role !== 'admin') {
    return <Navigate to="/pos" replace />;
  }
  
  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/select-store" element={<SelectStore />} />
          <Route path="/create-store" element={<CreateStore />} />
          
          <Route path="/" element={
            <PrivateRoute role="admin">
              <Dashboard />
            </PrivateRoute>
          } />

          <Route path="/reports" element={
            <PrivateRoute role="admin">
              <Dashboard />
            </PrivateRoute>
          } />

          <Route path="/pos" element={
            <PrivateRoute>
              <Cashier />
            </PrivateRoute>
          } />

          <Route path="/inventory" element={
            <PrivateRoute role="admin">
              <Inventory />
            </PrivateRoute>
          } />

          <Route path="/orders" element={
            <PrivateRoute role="admin">
              <OrderHistory />
            </PrivateRoute>
          } />

          <Route path="/staff" element={
            <PrivateRoute role="admin">
              <StaffManagement />
            </PrivateRoute>
          } />

          <Route path="/shifts" element={
            <PrivateRoute>
              <Shifts />
            </PrivateRoute>
          } />

          <Route path="/ai-assistant" element={
            <PrivateRoute>
              <AIAssistant />
            </PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

