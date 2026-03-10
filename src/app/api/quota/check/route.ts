import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const FREE_DAILY_QUOTA = 3; // 免费用户每日 3 次

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    // 从请求头获取真实 IP 地址
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                       request.headers.get('x-real-ip') ||
                       '127.0.0.1';

    // 初始化 Supabase 客户端
    const supabase = token ? getSupabaseClient(token) : getSupabaseClient();

    let userId: string | null = null;
    let dailyQuota = FREE_DAILY_QUOTA;

    // 如果有 token，检查用户信息
    if (token) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (!userError && user) {
        userId = user.id;

        // 获取用户资料
        const { data: profile } = await supabase
          .from('profiles')
          .select('daily_quota')
          .eq('id', user.id)
          .single();

        if (profile) {
          dailyQuota = profile.daily_quota;
        }
      }
    }

    // 检查今日使用次数
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let query = supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('ip_address', ipAddress).is('user_id', null);
    }

    const { count, error: countError } = await query;

    if (countError) {
      console.error('Count error:', countError);
      return NextResponse.json(
        { error: '检查配额失败' },
        { status: 500 }
      );
    }

    const todayUsage = count || 0;
    const remaining = Math.max(0, dailyQuota - todayUsage);
    const canUse = remaining > 0;

    return NextResponse.json({
      canUse,
      todayUsage,
      dailyQuota,
      remaining,
      userId,
    });
  } catch (error) {
    console.error('Check quota error:', error);
    return NextResponse.json(
      { error: '检查配额失败' },
      { status: 500 }
    );
  }
}
