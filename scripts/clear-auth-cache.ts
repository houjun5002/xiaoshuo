import { createClient } from '@supabase/supabase-js';

// 使用服务端密钥来清理 Supabase Auth 缓存
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function clearAuthCache() {
  console.log('🧹 开始清理 Supabase Auth 缓存...');

  try {
    // 1. 获取所有用户
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('❌ 获取用户列表失败:', usersError);
      return;
    }

    console.log(`📊 找到 ${users.users.length} 个用户`);

    // 2. 找到所有非管理员用户
    const adminEmail = 'houjun5002@163.com';
    const usersToDelete = users.users.filter(
      user => user.email !== adminEmail
    );

    console.log(`🗑️ 需要删除 ${usersToDelete.length} 个非管理员用户`);

    // 3. 删除每个非管理员用户
    for (const user of usersToDelete) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

      if (deleteError) {
        console.error(`❌ 删除用户 ${user.email} 失败:`, deleteError);
      } else {
        console.log(`✅ 已删除用户: ${user.email} (${user.id})`);
      }
    }

    // 4. 清理数据库中的相关记录
    console.log('🧹 清理数据库记录...');

    // 获取要删除的用户 ID 列表
    const userIds = usersToDelete.map(u => u.id).filter(Boolean);
    const emails = usersToDelete.map(u => u.email).filter(Boolean);

    if (userIds.length > 0) {
      // 清理 profiles 表
      const { error: profilesError } = await supabase
        .from('profiles')
        .delete()
        .in('user_id', userIds);

      if (profilesError) {
        console.error('❌ 清理 profiles 表失败:', profilesError);
      } else {
        console.log('✅ 已清理 profiles 表');
      }

      // 清理 usage_logs 表
      const { error: logsError } = await supabase
        .from('usage_logs')
        .delete()
        .in('user_id', userIds);

      if (logsError) {
        console.error('❌ 清理 usage_logs 表失败:', logsError);
      } else {
        console.log('✅ 已清理 usage_logs 表');
      }
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

        const { error: phoneError } = await supabase
          .from('profiles')
          .delete()
          .in('phone', phoneNumbers);

        if (phoneError) {
          console.error('❌ 清理手机号记录失败:', phoneError);
        } else {
          console.log('✅ 已清理手机号记录');
        }
      }
    }

    console.log('✅ 清理完成！');

  } catch (error) {
    console.error('❌ 清理过程中出错:', error);
  }
}

// 运行清理脚本
clearAuthCache();
