import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取维护模式状态
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();

    // 获取维护模式配置
    const { data: maintenanceSetting, error } = await supabase
      .from('maintenance_settings')
      .select('maintenance_mode, maintenance_message, updated_at')
      .eq('id', 1)
      .single();

    if (error || !maintenanceSetting) {
      return NextResponse.json(
        { error: '获取维护模式状态失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      maintenance_mode: maintenanceSetting.maintenance_mode,
      maintenance_message: maintenanceSetting.maintenance_message,
      updated_at: maintenanceSetting.updated_at,
    });
  } catch (error) {
    console.error('Get maintenance mode error:', error);
    return NextResponse.json(
      { error: '获取维护模式状态失败' },
      { status: 500 }
    );
  }
}

// 切换维护模式状态（需要管理员权限）
export async function POST(request: NextRequest) {
  try {
    const { maintenance_mode, maintenance_message } = await request.json();

    // 验证输入
    if (typeof maintenance_mode !== 'boolean') {
      return NextResponse.json(
        { error: 'maintenance_mode 必须是布尔值' },
        { status: 400 }
      );
    }

    // 获取用户信息
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

    // 更新维护模式配置
    const { data: updatedSetting, error: updateError } = await supabase
      .from('maintenance_settings')
      .update({
        maintenance_mode,
        maintenance_message: maintenance_message || '当前功能维护中，请稍后再试',
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
      .select()
      .single();

    if (updateError || !updatedSetting) {
      return NextResponse.json(
        { error: '更新维护模式失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: maintenance_mode ? '维护模式已开启' : '维护模式已关闭',
      maintenance_mode: updatedSetting.maintenance_mode,
      maintenance_message: updatedSetting.maintenance_message,
      updated_at: updatedSetting.updated_at,
    });
  } catch (error) {
    console.error('Update maintenance mode error:', error);
    return NextResponse.json(
      { error: '更新维护模式失败' },
      { status: 500 }
    );
  }
}
