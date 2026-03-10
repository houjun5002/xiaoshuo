import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const { token, ipAddress, usageType } = await request.json();

    // 验证输入
    if (!usageType) {
      return NextResponse.json(
        { error: '使用类型不能为空' },
        { status: 400 }
      );
    }

    // 初始化 Supabase 客户端
    const supabase = token ? getSupabaseClient(token) : getSupabaseClient();

    let userId: string | null = null;

    // 如果有 token，获取用户 ID
    if (token) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (!userError && user) {
        userId = user.id;
      }
    }

    // 记录使用
    const { error: insertError } = await supabase
      .from('usage_logs')
      .insert({
        user_id: userId,
        ip_address: ipAddress,
        usage_type: usageType,
      });

    if (insertError) {
      console.error('Record usage error:', insertError);
      return NextResponse.json(
        { error: '记录使用失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Record usage error:', error);
    return NextResponse.json(
      { error: '记录使用失败' },
      { status: 500 }
    );
  }
}
