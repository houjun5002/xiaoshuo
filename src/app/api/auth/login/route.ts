import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 判断是否为手机号
function isPhoneNumber(input: string): boolean {
  // 中国大陆手机号：1开头，11位数字
  const chinaPhoneRegex = /^1[3-9]\d{9}$/;
  return chinaPhoneRegex.test(input);
}

// 将手机号转换为邮箱格式用于 Supabase Auth
function phoneToEmail(phone: string): string {
  return `${phone}@phone.local`;
}

export async function POST(request: NextRequest) {
  try {
    const { account, password } = await request.json();

    // 验证输入
    if (!account || !password) {
      return NextResponse.json(
        { error: '账号和密码不能为空' },
        { status: 400 }
      );
    }

    // 判断是手机号还是邮箱
    const isPhone = isPhoneNumber(account);

    // 如果是手机号，转换为邮箱格式
    const authEmail = isPhone ? phoneToEmail(account) : account;

    // 初始化 Supabase 客户端
    const supabase = getSupabaseClient();

    // 登录用户
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    });

    if (error) {
      // 将英文错误提示转为中文
      let errorMessage = error.message;
      if (errorMessage === 'Invalid login credentials') {
        errorMessage = '账号或密码错误';
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: 401 }
      );
    }

    // 获取用户资料
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    // 设置 httpOnly Cookie 用于认证
    const response = NextResponse.json({
      message: '登录成功',
      user: data.user,
      profile: profile || null,
    });

    // 设置认证 Cookie
    response.cookies.set('auth_token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 天
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
