import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 管理员邮箱和密码 hash
const ADMIN_EMAIL = 'houjun5002@163.com';
const ADMIN_PASSWORD_HASH = '2637a5c30af69a7b'; // 对应密码：Admin123!

export async function POST(request: NextRequest) {
  try {
    const { userId, password } = await request.json();

    // 验证参数
    if (!userId || !password) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 从 Cookie 获取用户 token
    const userToken = request.cookies.get('auth_token')?.value;

    if (!userToken) {
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      );
    }

    // 验证用户身份
    const supabase = getSupabaseClient(userToken);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: '用户信息无效' },
        { status: 401 }
      );
    }

    // 验证是否为管理员邮箱
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: '无管理员权限' },
        { status: 403 }
      );
    }

    // 验证密码 hash
    const crypto = require('crypto');
    const inputHash = crypto.createHash('md5').update(password).digest('hex').substring(0, 16);

    if (inputHash !== ADMIN_PASSWORD_HASH) {
      return NextResponse.json(
        { error: '管理员密码错误' },
        { status: 401 }
      );
    }

    // 获取用户信息
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 防止删除管理员自己
    if (profile.is_admin) {
      return NextResponse.json(
        { error: '不能删除管理员账户' },
        { status: 403 }
      );
    }

    // 删除用户的使用记录
    const { error: deleteLogsError } = await supabase
      .from('usage_logs')
      .delete()
      .eq('user_id', userId);

    if (deleteLogsError) {
      console.error('Delete usage logs error:', deleteLogsError);
    }

    // 删除用户资料
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (deleteProfileError) {
      console.error('Delete profile error:', deleteProfileError);
      return NextResponse.json(
        { error: '删除用户资料失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '用户删除成功',
      userId,
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: '删除用户失败' },
      { status: 500 }
    );
  }
}
