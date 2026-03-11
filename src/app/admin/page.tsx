'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Users, Activity, TrendingUp, BarChart3, Home, LogOut, Loader2, Trash2, AlertCircle, Settings } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface StatsData {
  userStats: {
    totalUsers: number;
    todayNewUsers: number;
    activeUsers: number;
  };
  visitStats: {
    totalVisits: number;
    todayVisits: number;
    todayByType: Record<string, number>;
  };
  trend: Array<{ date: string; count: number }>;
  usersList: Array<{
    id: string;
    username: string | null;
    created_at: string;
    daily_quota: number;
  }>;
}

const ADMIN_EMAIL = 'houjun5002@163.com';

export default function AdminPage() {
  const { user, token, logout } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteUserName, setDeleteUserName] = useState<string>('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // 维护模式状态
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('当前功能维护中，请稍后再试');
  const [isTogglingMaintenance, setIsTogglingMaintenance] = useState(false);

  // 检查用户邮箱是否为管理员
  const isAdminUser = user?.email === ADMIN_EMAIL;

  // 从 localStorage 加载管理员 token
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      setIsAuthenticated(true);
      fetchStats();
    }
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ password: adminPassword }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('adminToken', data.adminToken);
        setIsAuthenticated(true);
        fetchStats();
      } else {
        alert(data.error || '管理员验证失败');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      alert('管理员验证失败');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        const errorData = await response.json();
        alert(errorData.error || '获取统计数据失败');
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
      alert('获取统计数据失败');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId || !deletePassword) {
      alert('请输入管理员密码');
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch('/api/admin/user/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: deleteUserId,
          password: deletePassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`用户 ${deleteUserName} 删除成功`);
        setDeleteUserId(null);
        setDeleteUserName('');
        setDeletePassword('');
        fetchStats(); // 刷新列表
      } else {
        alert(data.error || '删除用户失败');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      alert('删除用户失败');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setStats(null);
  };

  // 加载维护模式状态
  useEffect(() => {
    if (isAuthenticated) {
      fetchMaintenanceMode();
    }
  }, [isAuthenticated]);

  const fetchMaintenanceMode = async () => {
    try {
      const response = await fetch('/api/admin/maintenance', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setMaintenanceMode(data.maintenance_mode);
        setMaintenanceMessage(data.maintenance_message || '当前功能维护中，请稍后再试');
      }
    } catch (error) {
      console.error('Fetch maintenance mode error:', error);
    }
  };

  const toggleMaintenanceMode = async () => {
    setIsTogglingMaintenance(true);

    try {
      const response = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          maintenance_mode: !maintenanceMode,
          maintenance_message: maintenanceMessage,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMaintenanceMode(data.maintenance_mode);
        setMaintenanceMessage(data.maintenance_message);
        alert(data.message);
      } else {
        alert(data.error || '切换维护模式失败');
      }
    } catch (error) {
      console.error('Toggle maintenance mode error:', error);
      alert('切换维护模式失败');
    } finally {
      setIsTogglingMaintenance(false);
    }
  };

  // 未登录或不是管理员用户
  if (!user || !isAdminUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Shield className="w-6 h-6" />
              访问被拒绝
            </CardTitle>
            <CardDescription>
              只有管理员才能访问此页面
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              <Home className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 未输入管理员密码
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-6 h-6" />
              管理员验证
            </CardTitle>
            <CardDescription>
              请输入管理员密码以访问管理后台
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-password">管理员密码</Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="请输入管理员密码"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  maxLength={16}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? '验证中...' : '验证'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                >
                  <Home className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 管理员仪表盘
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* 顶部导航 */}
      <div className="border-b bg-white/50 dark:bg-gray-800/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold">管理后台</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {user.user_metadata?.username || user.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              退出管理
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/'}>
              <Home className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {stats ? (
          <>
            {/* 统计卡片 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">总用户数</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.userStats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    今日新增：{stats.userStats.todayNewUsers}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.userStats.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    今日有使用记录的用户
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">总访问次数</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.visitStats.totalVisits}</div>
                  <p className="text-xs text-muted-foreground">
                    今日：{stats.visitStats.todayVisits}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">今日使用类型</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Object.keys(stats.visitStats.todayByType).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {Object.entries(stats.visitStats.todayByType)
                      .map(([type, count]) => `${type}: ${count}`)
                      .join(', ')}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 维护模式设置 */}
            <Card className="mb-8 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <Settings className="w-5 h-5" />
                  维护模式设置
                </CardTitle>
                <CardDescription>
                  开启维护模式后，普通用户无法使用"开始制作"功能，管理员可以正常使用
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">维护模式状态</div>
                    <div className="text-sm text-muted-foreground">
                      {maintenanceMode ? '🔴 已开启' : '🟢 已关闭'}
                    </div>
                  </div>
                  <Button
                    onClick={toggleMaintenanceMode}
                    disabled={isTogglingMaintenance}
                    variant={maintenanceMode ? 'destructive' : 'default'}
                  >
                    {isTogglingMaintenance ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        切换中...
                      </>
                    ) : (
                      <>
                        {maintenanceMode ? '关闭维护模式' : '开启维护模式'}
                      </>
                    )}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenance-message">维护提示信息</Label>
                  <Input
                    id="maintenance-message"
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    placeholder="请输入维护提示信息"
                    maxLength={100}
                  />
                  <div className="text-xs text-muted-foreground">
                    用户在维护模式下看到的提示信息
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 访问趋势 */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>最近 7 天访问趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.trend.map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-24 text-sm text-muted-foreground">
                        {item.date}
                      </div>
                      <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-lg transition-all"
                          style={{
                            width: `${Math.max(0, (item.count / Math.max(...stats.trend.map(t => t.count))) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="w-16 text-right font-semibold">
                        {item.count} 次
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 最新用户列表 */}
            <Card>
              <CardHeader>
                <CardTitle>最新用户（前 10 个）</CardTitle>
                <CardDescription>
                  最近注册的用户列表
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.usersList.map((userItem, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {userItem.username || '未设置用户名'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ID: {userItem.id}
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <div className="text-sm">
                            每日配额：{userItem.daily_quota} 次
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(userItem.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setDeleteUserId(userItem.id);
                            setDeleteUserName(userItem.username || '未设置用户名');
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">加载统计数据中...</p>
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => {
        if (!open) {
          setDeleteUserId(null);
          setDeleteUserName('');
          setDeletePassword('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              确认删除用户
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                您确定要删除用户 <strong>{deleteUserName}</strong> 吗？
              </p>

              <div className="space-y-2">
                <Label htmlFor="delete-password">管理员密码</Label>
                <Input
                  id="delete-password"
                  type="password"
                  placeholder="请输入管理员密码"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  maxLength={16}
                />
              </div>

              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>警告</AlertTitle>
                <AlertDescription>
                  此操作不可撤销！删除后，该用户的所有数据（包括使用记录）将被永久删除。
                </AlertDescription>
              </Alert>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  删除中...
                </>
              ) : (
                '确认删除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
