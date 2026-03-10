import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    // 优先从 Cookie 获取 token，其次从 Authorization header 获取
    let token = request.cookies.get('auth_token')?.value;

    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.replace('Bearer ', '');
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    // 初始化 Supabase 客户端
    const supabase = getSupabaseClient(token);

    // 获取用户信息
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: '用户信息无效' },
        { status: 401 }
      );
    }

    // 获取用户资料
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // 如果 profile 不存在，说明用户已被删除，返回401强制登出
    if (!profile || profileError) {
      return NextResponse.json(
        { error: '用户不存在或已被删除' },
        { status: 401 }
      );
    }

    // 获取今日使用次数
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count, error: countError } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString());

    return NextResponse.json({
      user,
      profile,
      todayUsage: count || 0,
      dailyQuota: profile.daily_quota || 10,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    );
  }
}
