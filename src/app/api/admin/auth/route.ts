import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 管理员邮箱和密码 hash
const ADMIN_EMAIL = 'houjun5002@163.com';
const ADMIN_PASSWORD_HASH = '2637a5c30af69a7b'; // 对应密码：Admin123!

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // 验证输入
    if (!password) {
      return NextResponse.json(
        { error: '密码不能为空' },
        { status: 400 }
      );
    }

    // 从请求头获取认证令牌
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // 验证用户身份
    const supabase = getSupabaseClient(token);
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

    // 更新用户的 is_admin 状态（确保是管理员）
    await supabase
      .from('profiles')
      .update({ is_admin: 1 })
      .eq('id', user.id);

    // 生成管理员会话 token
    const adminToken = crypto.randomBytes(32).toString('hex');

    return NextResponse.json({
      success: true,
      adminToken,
      isAdmin: true,
    });
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { error: '管理员验证失败' },
      { status: 500 }
    );
  }
}
