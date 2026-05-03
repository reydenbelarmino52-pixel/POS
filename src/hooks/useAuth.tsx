import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'cashier';
  status: 'pending' | 'active';
}

interface Store {
  id: string;
  name: string;
  ownerId: string;
}

interface AuthContextType {
  user: User | null;
  stores: Store[];
  currentStore: Store | null;
  login: (token: string, user: User, stores: Store[]) => void;
  logout: () => void;
  setStore: (store: Store) => void;
  isLoading: boolean;
  refreshStores: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('pos_user');
    const savedStores = localStorage.getItem('pos_stores');
    const savedCurrentStore = localStorage.getItem('pos_current_store');

    if (savedUser && savedUser !== 'undefined') {
      try {
        setUser(JSON.parse(savedUser));
        if (savedStores) setStores(JSON.parse(savedStores));
        if (savedCurrentStore) setCurrentStore(JSON.parse(savedCurrentStore));
      } catch (e) {
        console.error('Failed to parse saved auth data', e);
        localStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  const login = (token: string, user: User, userStores: Store[]) => {
    localStorage.setItem('pos_token', token);
    localStorage.setItem('pos_user', JSON.stringify(user));
    localStorage.setItem('pos_stores', JSON.stringify(userStores));
    
    setUser(user);
    setStores(userStores);
    
    if (userStores.length === 1) {
      setStore(userStores[0]);
      navigate('/');
    } else if (userStores.length > 1) {
      navigate('/select-store');
    } else {
      // No stores, maybe admin needs to create one
      navigate('/create-store');
    }
  };

  const setStore = (store: Store) => {
    localStorage.setItem('pos_current_store', JSON.stringify(store));
    localStorage.setItem('pos_store_id', store.id);
    setCurrentStore(store);
    navigate('/');
  };

  const logout = () => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    localStorage.removeItem('pos_stores');
    localStorage.removeItem('pos_current_store');
    localStorage.removeItem('pos_store_id');
    setUser(null);
    setStores([]);
    setCurrentStore(null);
    navigate('/login');
  };

  const refreshStores = async () => {
    try {
      const [storesRes, profileRes] = await Promise.all([
        api.get('/stores'),
        api.get('/auth/profile')
      ]);
      setStores(storesRes.data);
      setUser(profileRes.data);
      localStorage.setItem('pos_stores', JSON.stringify(storesRes.data));
      localStorage.setItem('pos_user', JSON.stringify(profileRes.data));
    } catch (e) {
      console.error('Failed to refresh data', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, stores, currentStore, login, logout, setStore, isLoading, refreshStores }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
