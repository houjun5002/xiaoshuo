'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  user_metadata?: {
    username?: string;
    avatar_url?: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (account: string, password: string) => Promise<void>;
  register: (account: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  todayUsage: number;
  dailyQuota: number;
  fetchUser: () => Promise<void>;
  refreshQuota: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [todayUsage, setTodayUsage] = useState(0);
  const [dailyQuota, setDailyQuota] = useState(3);

  // 初始化时检查用户登录状态（通过 Cookie）
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setTodayUsage(data.todayUsage);
          setDailyQuota(data.dailyQuota);
          setToken('cookie-based'); // 标记为基于 Cookie 的认证
        } else {
          setUser(null);
          setTodayUsage(0);
          setDailyQuota(3);
        }
      } catch (error) {
        console.error('Failed to check auth:', error);
        setUser(null);
        setTodayUsage(0);
        setDailyQuota(3);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 获取用户信息（通过 Cookie）
  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setTodayUsage(data.todayUsage);
        setDailyQuota(data.dailyQuota);
      } else {
        // 如果返回 401，说明用户不存在或已登出
        const errorData = await response.json().catch(() => ({ error: '未授权' }));
        setUser(null);
        setTodayUsage(0);
        setDailyQuota(3);
        throw new Error(errorData.error || '未授权');
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
      setTodayUsage(0);
      setDailyQuota(3);
      throw error;
    }
  };

  // 刷新配额（适用于登录和未登录用户）
  const refreshQuota = async () => {
    if (user) {
      // 登录用户：使用 /api/auth/me
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setTodayUsage(data.todayUsage);
          setDailyQuota(data.dailyQuota);
        }
      } catch (error) {
        console.error('Failed to refresh quota:', error);
      }
    } else {
      // 未登录用户：使用 /api/quota/check
      try {
        const response = await fetch('/api/quota/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({}),
        });

        if (response.ok) {
          const data = await response.json();
          setTodayUsage(data.todayUsage);
          setDailyQuota(data.dailyQuota);
        }
      } catch (error) {
        console.error('Failed to refresh quota:', error);
      }
    }
  };

  const login = async (account: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ account, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '登录失败');
    }

    // Cookie 由后端自动设置，前端只需要获取用户信息
    await fetchUser();
  };

  const register = async (account: string, password: string, username: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ account, password, username }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '注册失败');
    }

    // Cookie 由后端自动设置（如果有 session），前端只需要获取用户信息
    await fetchUser();
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    setUser(null);
    setToken(null);
    setTodayUsage(0);
    setDailyQuota(3);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isLoading,
        todayUsage,
        dailyQuota,
        fetchUser,
        refreshQuota,
      }}
    >
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
