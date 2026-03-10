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

// 错误消息映射（英文 -> 中文）
function translateAuthError(message: string): string {
  const errorMap: Record<string, string> = {
    'User already registered': '该手机号/邮箱已注册',
    'Email not confirmed': '请先确认邮箱',
    'Invalid email': '邮箱格式不正确',
    'Password should be at least 6 characters': '密码至少需要6个字符',
    'Signups not allowed': '不允许注册新用户',
  };

  return errorMap[message] || message;
}

export async function POST(request: NextRequest) {
  try {
    const { account, password, username } = await request.json();

    // 验证输入
    if (!account || !password || !username) {
      return NextResponse.json(
        { error: '手机号、密码和用户名不能为空' },
        { status: 400 }
      );
    }

    // 判断是手机号还是邮箱
    const isPhone = isPhoneNumber(account);

    // 如果是手机号，转换为邮箱格式
    const authEmail = isPhone ? phoneToEmail(account) : account;

    // 初始化 Supabase 客户端
    const supabase = getSupabaseClient();

    // 注册用户
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: authEmail,
      password,
      options: {
        data: {
          username,
          phone: isPhone ? account : undefined, // 存储原始手机号
        },
      },
    });

    if (authError) {
      return NextResponse.json(
        { error: translateAuthError(authError.message) },
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
          phone: isPhone ? account : null, // 存储手机号（如果有）
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
    }

    // 设置 httpOnly Cookie（如果 session 存在）
    const response = NextResponse.json({
      message: '注册成功',
      user: authData.user,
    });

    if (authData.session) {
      response.cookies.set('auth_token', authData.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 天
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
