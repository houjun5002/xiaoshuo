import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// 管理员清理接口 - 清理 Supabase Auth 缓存
export async function POST(request: NextRequest) {
  try {
    // 验证是否为管理员
    const { searchParams } = new URL(request.url);
    const adminPassword = searchParams.get('admin_password');

    if (adminPassword !== 'Admin123!') {
      return NextResponse.json(
        { error: '管理员验证失败' },
        { status: 401 }
      );
    }

    // 使用服务端密钥
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: '缺少 Supabase 配置' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. 获取所有用户
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      return NextResponse.json(
        { error: '获取用户列表失败', details: usersError },
        { status: 500 }
      );
    }

    // 2. 找到所有非管理员用户
    const adminEmail = 'houjun5002@163.com';
    const usersToDelete = users.users.filter(
      user => user.email !== adminEmail
    );

    // 3. 删除每个非管理员用户
    const deletedUsers = [];
    const failedUsers = [];

    for (const user of usersToDelete) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

      if (deleteError) {
        failedUsers.push({
          email: user.email,
          error: deleteError.message
        });
      } else {
        deletedUsers.push({
          email: user.email,
          id: user.id
        });
      }
    }

    // 4. 清理数据库中的相关记录
    const userIds = usersToDelete.map(u => u.id).filter(Boolean);
    const emails = usersToDelete.map(u => u.email).filter(Boolean);

    if (userIds.length > 0) {
      // 清理 profiles 表
      await supabase.from('profiles').delete().in('user_id', userIds);

      // 清理 usage_logs 表
      await supabase.from('usage_logs').delete().in('user_id', userIds);
    }

    // 5. 清理手机号相关的记录
    if (emails.length > 0) {
      const phoneEmails = emails.filter(email =>
        email && email.includes('@phone.local')
      );

      if (phoneEmails.length > 0) {
        const phoneNumbers = phoneEmails.map(email =>
          email.replace('@phone.local', '')
        );

        await supabase.from('profiles').delete().in('phone', phoneNumbers);
      }
    }

    return NextResponse.json({
      success: true,
      message: '清理完成',
      deleted: deletedUsers,
      failed: failedUsers
    });

  } catch (error) {
    console.error('清理失败:', error);
    return NextResponse.json(
      { error: '清理失败', details: error },
      { status: 500 }
    );
  }
}
