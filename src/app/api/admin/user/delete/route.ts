import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const { userId, adminToken } = await request.json();

    // 验证参数
    if (!userId || !adminToken) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 管理员密码 hash（与环境变量保持一致）
    const ADMIN_PASSWORD_HASH = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'; // SHA256 of "Admin123!"

    // 验证管理员 token（简单验证，实际生产环境应使用更安全的方式）
    const crypto = require('crypto');
    const computedHash = crypto.createHash('sha256').update(adminToken).digest('hex');

    if (computedHash !== ADMIN_PASSWORD_HASH) {
      return NextResponse.json(
        { error: '管理员验证失败' },
        { status: 401 }
      );
    }

    // 初始化 Supabase 客户端（使用服务端密钥）
    const supabase = getSupabaseClient();

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

    // 删除认证用户（注意：需要服务端权限，可能需要使用 service_role key）
    // 这里暂时只删除 profiles 和 usage_logs，认证用户保留但无法登录
    // 在生产环境中，应该使用 Supabase Admin API 删除认证用户

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
