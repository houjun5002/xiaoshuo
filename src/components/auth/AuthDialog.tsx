'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Lock, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'login' | 'register';
}

export function AuthDialog({ open, onOpenChange, defaultTab = 'login' }: AuthDialogProps) {
  const { login, register } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(defaultTab);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 登录表单
  const [loginAccount, setLoginAccount] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // 注册表单
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(loginAccount, loginPassword);
      onOpenChange(false);
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : '登录失败';
      // 将"用户不存在或已被删除"替换为更友好的提示
      if (errorMessage === '用户不存在或已被删除') {
        errorMessage = '账号或密码错误';
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await register(registerPhone, registerPassword, registerUsername);
      onOpenChange(false);
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : '注册失败';
      // 将"用户不存在或已被删除"替换为更友好的提示
      if (errorMessage === '用户不存在或已被删除') {
        errorMessage = '账号或密码错误';
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">账户</DialogTitle>
          <DialogDescription>
            {activeTab === 'login' ? '登录以享受更多使用次数' : '注册新账户'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'register')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-account">手机号</Label>
                <Input
                  id="login-account"
                  type="text"
                  placeholder="请输入手机号"
                  value={loginAccount}
                  onChange={(e) => setLoginAccount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">密码</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <div className="text-sm text-red-500">{error}</div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登录中...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    登录
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-phone">手机号</Label>
                <Input
                  id="register-phone"
                  type="tel"
                  placeholder="请输入手机号"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  required
                  pattern="^1[3-9]\d{9}$"
                  title="请输入正确的手机号"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-username">用户名</Label>
                <Input
                  id="register-username"
                  type="text"
                  placeholder="yourname"
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">密码</Label>
                <Input
                  id="register-password"
                  type="password"
                  placeholder="••••••••"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {error && (
                <div className="text-sm text-red-500">{error}</div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    注册中...
                  </>
                ) : (
                  <>
                    <User className="mr-2 h-4 w-4" />
                    注册
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                注册后每日可使用 10 次（免费用户 3 次）
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
