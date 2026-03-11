import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getSupabaseCredentials } from '@/storage/database/supabase-client';

// 初始化数据库表
export async function POST(request: NextRequest) {
  try {
    // 验证是否为管理员
    const authToken = request.cookies.get('auth_token')?.value;
    if (!authToken) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient(authToken);
    const { data: { user }, error: userError } = await supabase.auth.getUser(authToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: '用户验证失败' },
        { status: 401 }
      );
    }

    // 检查是否为管理员
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.is_admin !== 1) {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 403 }
      );
    }

    // 尝试插入默认配置（如果表不存在会报错）
    const { data: insertData, error: insertError } = await supabase
      .from('maintenance_settings')
      .upsert({
        id: 1,  // 显式指定 id 为 1
        maintenance_mode: false,
        maintenance_message: '当前功能维护中，请稍后再试',
      }, {
        onConflict: 'id',  // 如果 id 冲突，则更新现有记录
      })
      .select()
      .single();

    if (insertError) {
      // 表不存在，需要手动创建
      if (insertError.code === '42P01' || insertError.message.includes('does not exist')) {
        // 尝试使用 pg 客户端创建表
        try {
          const { Client } = await import('pg');

          // 从 Supabase URL 中提取连接信息
          const supabaseUrl = getSupabaseCredentials().url;
          let connectionString = supabaseUrl;

          // 如果 URL 不包含密码，尝试从环境变量中获取
          if (!connectionString.includes('@') && process.env.COZE_SUPABASE_DB_PASSWORD) {
            // 提取主机和数据库名
            const urlMatch = supabaseUrl.match(/https?:\/\/(.+)\.supabase\.co\/?/);
            if (urlMatch) {
              const projectRef = urlMatch[1];
              connectionString = `postgresql://postgres.${projectRef}:${process.env.COZE_SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
            }
          }

          // 替换 postgresql:// 为 postgres://
          connectionString = connectionString.replace('postgresql://', 'postgres://');

          const client = new Client({
            connectionString: connectionString,
          });

          await client.connect();

          try {
            await client.query(`
              CREATE TABLE IF NOT EXISTS maintenance_settings (
                id SERIAL PRIMARY KEY,
                maintenance_mode BOOLEAN DEFAULT FALSE,
                maintenance_message TEXT DEFAULT '当前功能维护中，请稍后再试',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              );
            `);

            await client.query(`
              INSERT INTO maintenance_settings (id, maintenance_mode, maintenance_message)
              VALUES (1, FALSE, '当前功能维护中，请稍后再试')
              ON CONFLICT (id) DO NOTHING;
            `);

            return NextResponse.json({
              success: true,
              message: '数据库表初始化成功',
              tables: ['maintenance_settings'],
            });
          } finally {
            await client.end();
          }
        } catch (pgError) {
          console.error('PG client error:', pgError);
          return NextResponse.json(
            {
              error: '配置表不存在，需要手动创建',
              details: '请在 Supabase SQL Editor 中执行以下 SQL：\n\n' +
                'CREATE TABLE IF NOT EXISTS maintenance_settings (\n' +
                '  id SERIAL PRIMARY KEY,\n' +
                '  maintenance_mode BOOLEAN DEFAULT FALSE,\n' +
                '  maintenance_message TEXT DEFAULT \'当前功能维护中，请稍后再试\',\n' +
                '  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n' +
                ');\n\n' +
                'INSERT INTO maintenance_settings (id, maintenance_mode, maintenance_message)\n' +
                'VALUES (1, FALSE, \'当前功能维护中，请稍后再试\')\n' +
                'ON CONFLICT (id) DO NOTHING;',
              requiresManualSetup: true,
            },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        { error: '初始化失败', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '数据库表初始化成功',
      tables: ['maintenance_settings'],
      data: insertData,
    });
  } catch (error) {
    console.error('Initialize database error:', error);
    return NextResponse.json(
      { error: '初始化失败', details: String(error) },
      { status: 500 }
    );
  }
}
