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
  shift_pin?: string;
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
    const initialize = async () => {
      const savedUser = localStorage.getItem('pos_user');
      const savedStores = localStorage.getItem('pos_stores');
      const savedCurrentStore = localStorage.getItem('pos_current_store');
      const savedToken = localStorage.getItem('pos_token');

      if (savedToken && savedUser && savedUser !== 'undefined') {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          if (savedStores) setStores(JSON.parse(savedStores));
          if (savedCurrentStore) setCurrentStore(JSON.parse(savedCurrentStore));

          // Verify with server and update info
          const [storesRes, profileRes] = await Promise.all([
            api.get('/stores'),
            api.get('/auth/profile')
          ]);
          
          const freshUser = profileRes.data;
          const freshStores = storesRes.data;
          
          setUser(freshUser);
          setStores(freshStores);
          localStorage.setItem('pos_user', JSON.stringify(freshUser));
          localStorage.setItem('pos_stores', JSON.stringify(freshStores));

          // Auto-selection logic if none saved
          if (!savedCurrentStore && freshStores.length > 0) {
            if (freshUser.role === 'cashier' || freshStores.length === 1) {
              const preferred = freshStores[0];
              setCurrentStore(preferred);
              localStorage.setItem('pos_current_store', JSON.stringify(preferred));
              localStorage.setItem('pos_store_id', preferred.id);
            }
          }
        } catch (e: any) {
          console.error('Auth sync failed', e);
          // If the error is 401 (Unauthorized) or 404 (Not Found - User deleted), session is dead.
          if (e.response?.status === 401 || e.response?.status === 404) {
            console.warn('Invalid session detected during sync, logging out...');
            localStorage.removeItem('pos_token');
            localStorage.removeItem('pos_user');
            localStorage.removeItem('pos_stores');
            localStorage.removeItem('pos_current_store');
            localStorage.removeItem('pos_store_id');
            setUser(null);
            setStores([]);
            setCurrentStore(null);
            navigate('/login');
          }
        }
      }
      setIsLoading(false);
    };

    initialize();
  }, []);

  const login = React.useCallback((token: string, user: User, userStores: Store[]) => {
    localStorage.setItem('pos_token', token);
    localStorage.setItem('pos_user', JSON.stringify(user));
    localStorage.setItem('pos_stores', JSON.stringify(userStores));
    
    setUser(user);
    setStores(userStores);
    
    if (user.role === 'cashier' && userStores.length > 0) {
      const preferred = userStores[0];
      localStorage.setItem('pos_current_store', JSON.stringify(preferred));
      localStorage.setItem('pos_store_id', preferred.id);
      setCurrentStore(preferred);
      navigate('/pos'); // Lead cashiers directly to POS
    } else if (userStores.length === 1) {
      const preferred = userStores[0];
      localStorage.setItem('pos_current_store', JSON.stringify(preferred));
      localStorage.setItem('pos_store_id', preferred.id);
      setCurrentStore(preferred);
      navigate('/');
    } else if (userStores.length > 1) {
      navigate('/select-store');
    } else {
      if (user.role === 'admin') {
        navigate('/create-store');
      } else {
        navigate('/');
      }
    }
  }, [navigate]);

  const setStore = React.useCallback((store: Store) => {
    localStorage.setItem('pos_current_store', JSON.stringify(store));
    localStorage.setItem('pos_store_id', store.id);
    setCurrentStore(store);
    navigate('/');
  }, [navigate]);

  const logout = React.useCallback(() => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    localStorage.removeItem('pos_stores');
    localStorage.removeItem('pos_current_store');
    localStorage.removeItem('pos_store_id');
    setUser(null);
    setStores([]);
    setCurrentStore(null);
    navigate('/login');
  }, [navigate]);

  const refreshStores = React.useCallback(async () => {
    try {
      const [storesRes, profileRes] = await Promise.all([
        api.get('/stores'),
        api.get('/auth/profile')
      ]);
      setStores(storesRes.data);
      setUser(profileRes.data);
      localStorage.setItem('pos_stores', JSON.stringify(storesRes.data));
      localStorage.setItem('pos_user', JSON.stringify(profileRes.data));

      if (!currentStore && storesRes.data.length > 0 && (profileRes.data.role === 'cashier' || storesRes.data.length === 1)) {
        setStore(storesRes.data[0]);
      }
    } catch (e) {
      console.error('Failed to refresh data', e);
    }
  }, [currentStore, setStore]);

  const value = React.useMemo(() => ({ 
    user, stores, currentStore, login, logout, setStore, isLoading, refreshStores 
  }), [user, stores, currentStore, isLoading, login, logout, setStore, refreshStores]);

  return (
    <AuthContext.Provider value={value}>
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
