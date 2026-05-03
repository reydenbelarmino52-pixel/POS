import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

function PendingApproval() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-2xl shadow-pink-500/5 text-center border border-slate-100">
        <div className="w-20 h-20 bg-pink-50 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-pink-100">
          <div className="animate-pulse flex space-x-2">
            <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
            <div className="w-2 h-2 bg-pink-600 rounded-full"></div>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight">Approval Pending</h1>
        <p className="text-slate-500 mb-8 leading-relaxed text-sm">
          Your account has been created successfully. An administrator needs to verify and approve your access before you can start your shift.
        </p>
        <button 
          onClick={logout}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
        >
          Logout & Wait
        </button>
      </div>
    </div>
  );
}

function PrivateRoute({ children, role }: { children: React.ReactNode, role?: string }) {
  const { user, currentStore, isLoading } = useAuth();
  
  if (isLoading) return <div className="flex items-center justify-center min-h-screen font-bold text-slate-500 uppercase tracking-[0.5em]">Initializing Cathtea Terminal...</div>;
  if (!user) return <Navigate to="/login" />;
  
  // If user is pending and not an admin, show approval screen
  if (user.status === 'pending' && user.role !== 'admin') {
    return <PendingApproval />;
  }

  if (!currentStore) return <Navigate to="/select-store" />;
  if (role && user.role !== role && user.role !== 'admin') return <Navigate to="/pos" />;
  
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

