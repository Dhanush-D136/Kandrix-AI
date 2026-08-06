import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { getDeviceFingerprint } from '../services/fingerprint';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  mustChangePasswordTempToken: string | null;
  login: (username: string, pass: string, role: string) => Promise<any>;
  loginAdmin: (email: string, pass: string) => Promise<any>;
  loginStudent: (rollNumber: string, pass: string) => Promise<any>;
  loginFaculty: (identifier: string, pass: string) => Promise<any>;
  submitFirstPasswordChange: (newPassword: string, confirmPassword?: string) => Promise<any>;
  updateUser: (newUser: User) => void;
  logout: () => void;
  deviceFingerprint: string;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize Token & User immediately from localStorage to prevent redirect flicker on startup/refresh
  const [token, setToken] = useState<string | null>(() => {
    const t = localStorage.getItem('smartattend_token');
    console.log('[AUTH INIT] Initializing Token from localStorage:', t ? 'EXISTS' : 'NULL');
    return t;
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const u = localStorage.getItem('smartattend_user');
      const parsed = u ? JSON.parse(u) : null;
      console.log('[AUTH INIT] Initializing User from localStorage:', parsed ? `${parsed.name} (${parsed.role})` : 'NULL');
      return parsed;
    } catch (e) {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mustChangePasswordTempToken, setMustChangePasswordTempToken] = useState<string | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');

  useEffect(() => {
    getDeviceFingerprint().then((fp) => setDeviceFingerprint(fp));

    const handleAuthError = () => {
      console.warn('[AUTH EVENT] Auth error received. Clearing stale session...');
      logout();
    };
    window.addEventListener('smartattend_auth_error', handleAuthError);

    const currentToken = localStorage.getItem('smartattend_token');
    if (currentToken) {
      console.log('[AUTH CHECK] Validating Token with /api/auth/me...');
      api.get('/auth/me')
        .then((res) => {
          const freshUser = res.data.user;
          console.log('[AUTH CHECK SUCCESS] User verified via API:', freshUser.name, freshUser.role);
          setUser(freshUser);
          localStorage.setItem('smartattend_user', JSON.stringify(freshUser));
        })
        .catch((err) => {
          console.warn('[AUTH CHECK FAILED] Token invalid or expired. Logging out...', err.message);
          logout();
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }

    return () => {
      window.removeEventListener('smartattend_auth_error', handleAuthError);
    };
  }, []);

  const login = async (username: string, pass: string, role: string) => {
    console.log('[UNIFIED LOGIN REQUEST] Sending credentials to /api/auth/login...', { username, role });
    const res = await api.post('/auth/login', { username, password: pass, role });
    const { token, user } = res.data;

    localStorage.setItem('smartattend_token', token);
    localStorage.setItem('smartattend_user', JSON.stringify(user));

    setToken(token);
    setUser(user);
    setIsLoading(false);
    return res.data;
  };

  const loginAdmin = async (email: string, pass: string) => {
    console.log('[LOGIN ADMIN REQUEST] Sending credentials to /api/auth/admin/login...', { email });
    const res = await api.post('/auth/admin/login', { email, password: pass });
    const { token, user } = res.data;

    console.log('[LOGIN ADMIN SUCCESS] Token & User received:', { role: user.role, name: user.name });

    localStorage.setItem('smartattend_token', token);
    localStorage.setItem('smartattend_user', JSON.stringify(user));
    
    setToken(token);
    setUser(user);
    setIsLoading(false);

    console.log('[AUTH STATE UPDATED] Admin login complete. State set.');
    return res.data;
  };

  const loginStudent = async (rollNumber: string, pass: string) => {
    const fp = deviceFingerprint || (await getDeviceFingerprint());
    console.log('[LOGIN STUDENT REQUEST] Sending credentials to /api/auth/student/login...', { rollNumber });

    const res = await api.post('/auth/student/login', {
      roll_number: rollNumber,
      password: pass,
      device_fingerprint: fp
    });

    if (res.data.must_change_password) {
      console.log('[LOGIN STUDENT] First-time login password change required');
      setMustChangePasswordTempToken(res.data.tempToken);
      localStorage.setItem('smartattend_token', res.data.tempToken);
      return res.data;
    }

    const { token, user } = res.data;
    console.log('[LOGIN STUDENT SUCCESS] Token & User received:', { role: user.role, rollNumber: user.roll_number });

    localStorage.setItem('smartattend_token', token);
    localStorage.setItem('smartattend_user', JSON.stringify(user));

    setToken(token);
    setUser(user);
    setIsLoading(false);

    console.log('[AUTH STATE UPDATED] Student login complete. State set.');
    return res.data;
  };

  const loginFaculty = async (identifier: string, pass: string) => {
    console.log('[LOGIN FACULTY REQUEST] Sending credentials to /api/auth/faculty/login...', { identifier });
    const res = await api.post('/auth/faculty/login', { identifier, password: pass });
    const { token, user } = res.data;

    localStorage.setItem('smartattend_token', token);
    localStorage.setItem('smartattend_user', JSON.stringify(user));

    setToken(token);
    setUser(user);
    setIsLoading(false);
    return res.data;
  };

  const submitFirstPasswordChange = async (newPassword: string, confirmPassword?: string) => {
    const fp = deviceFingerprint || (await getDeviceFingerprint());
    const isFacultyRole = user && user.role === 'faculty';
    const endpoint = isFacultyRole ? '/auth/faculty/change-password' : '/auth/student/first-login-change-password';

    const res = await api.post(endpoint, {
      faculty_id: user?.id,
      current_password: '1234',
      new_password: newPassword,
      confirm_password: confirmPassword || newPassword,
      device_fingerprint: fp
    });

    const { token, user: updatedUser } = res.data;
    if (token) {
      localStorage.setItem('smartattend_token', token);
      setToken(token);
    }
    if (updatedUser) {
      localStorage.setItem('smartattend_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }

    setMustChangePasswordTempToken(null);
    setIsLoading(false);
    return res.data;
  };

  const updateUser = (newUser: User) => {
    setUser((prev) => {
      const updated = prev ? { ...prev, ...newUser } : newUser;
      localStorage.setItem('smartattend_user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    console.log('[LOGOUT] Clearing token & user from localStorage');
    localStorage.removeItem('smartattend_token');
    localStorage.removeItem('smartattend_user');
    setToken(null);
    setUser(null);
    setMustChangePasswordTempToken(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        mustChangePasswordTempToken,
        login,
        loginAdmin,
        loginStudent,
        loginFaculty,
        submitFirstPasswordChange,
        updateUser,
        logout,
        deviceFingerprint
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
