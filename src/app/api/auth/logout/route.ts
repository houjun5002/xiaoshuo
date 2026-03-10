import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    // 从 Cookie 获取 token
    const token = request.cookies.get('auth_token')?.value;

    if (token) {
      // 初始化 Supabase 客户端
      const supabase = getSupabaseClient(token);

      // 登出用户
      const { error } = await supabase.auth.signOut();

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    // 清除 Cookie
    const response = NextResponse.json({ message: '登出成功' });
    response.cookies.delete('auth_token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: '登出失败，请稍后重试' },
      { status: 500 }
    );
  }
}
