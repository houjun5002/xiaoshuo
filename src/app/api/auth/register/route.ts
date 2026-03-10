import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json();

    // 验证输入
    if (!email || !password || !username) {
      return NextResponse.json(
        { error: '邮箱、密码和用户名不能为空' },
        { status: 400 }
      );
    }

    // 初始化 Supabase 客户端
    const supabase = getSupabaseClient();

    // 注册用户
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    // 创建用户资料
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          username,
          daily_quota: 10, // 登录用户默认 10 次/天
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
    }

    return NextResponse.json({
      message: '注册成功',
      user: authData.user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
