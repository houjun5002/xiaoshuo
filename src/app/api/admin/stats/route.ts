import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    // 从请求头获取认证令牌
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // 验证用户身份和管理员权限
    const supabase = getSupabaseClient(token);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: '用户信息无效' },
        { status: 401 }
      );
    }

    // 检查是否为管理员
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile || profile.is_admin !== 1) {
      return NextResponse.json(
        { error: '无管理员权限' },
        { status: 403 }
      );
    }

    // 获取用户统计
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 总用户数
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // 今日新增用户
    const { count: todayNewUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // 活跃用户（今日有使用记录的用户）
    const { data: activeUsersData } = await supabase
      .from('usage_logs')
      .select('user_id')
      .gte('created_at', today.toISOString())
      .not('user_id', 'is', null);

    const activeUsers = activeUsersData ? new Set(activeUsersData.map(u => u.user_id)).size : 0;

    // 获取访问统计
    // 总访问次数
    const { count: totalVisits } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true });

    // 今日访问次数
    const { count: todayVisits } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // 按类型统计
    const { data: typeStats } = await supabase
      .from('usage_logs')
      .select('usage_type')
      .gte('created_at', today.toISOString());

    const todayByType: Record<string, number> = {};
    if (typeStats) {
      typeStats.forEach((item) => {
        todayByType[item.usage_type] = (todayByType[item.usage_type] || 0) + 1;
      });
    }

    // 最近 7 天访问趋势
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const { count } = await supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDate.toISOString());

      last7Days.push({
        date: date.toISOString().split('T')[0],
        count: count || 0,
      });
    }

    // 获取用户列表（最新 10 个）
    const { data: usersList } = await supabase
      .from('profiles')
      .select('id, username, created_at, daily_quota')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      userStats: {
        totalUsers: totalUsers || 0,
        todayNewUsers: todayNewUsers || 0,
        activeUsers,
      },
      visitStats: {
        totalVisits: totalVisits || 0,
        todayVisits: todayVisits || 0,
        todayByType,
      },
      trend: last7Days,
      usersList: usersList || [],
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}
