import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

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

    // 初始化 maintenance_settings 表
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS maintenance_settings (
        id SERIAL PRIMARY KEY,
        maintenance_mode BOOLEAN DEFAULT FALSE,
        maintenance_message TEXT DEFAULT '当前功能维护中，请稍后再试',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO maintenance_settings (maintenance_mode, maintenance_message)
      VALUES (FALSE, '当前功能维护中，请稍后再试')
      ON CONFLICT (id) DO NOTHING;
    `;

    // 直接使用 pg 执行 SQL（绕过 Supabase Client）
    const { Client } = await import('pg');
    const client = new Client({
      connectionString: process.env.COZE_SUPABASE_URL?.replace('postgresql://', 'postgres://'),
    });

    await client.connect();

    try {
      await client.query(createTableSQL);

      return NextResponse.json({
        success: true,
        message: '数据库表初始化成功',
        tables: ['maintenance_settings'],
      });
    } finally {
      await client.end();
    }
  } catch (error) {
    console.error('Initialize database error:', error);
    return NextResponse.json(
      { error: '初始化失败', details: String(error) },
      { status: 500 }
    );
  }
}
