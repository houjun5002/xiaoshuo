import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 清理重复的维护模式记录，只保留最新的一条
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

    // 获取所有记录
    const { data: allRecords, error: fetchError } = await supabase
      .from('maintenance_settings')
      .select('id, updated_at')
      .order('updated_at', { ascending: false });

    if (fetchError) {
      if (fetchError.code === '42P01' || fetchError.message.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          message: '表不存在，无需清理',
          deletedCount: 0,
        });
      }
      return NextResponse.json(
        { error: '获取记录失败', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!allRecords || allRecords.length <= 1) {
      return NextResponse.json({
        success: true,
        message: '没有需要清理的重复记录',
        deletedCount: 0,
      });
    }

    // 保留最新的记录，删除其他记录
    const latestRecord = allRecords[0];
    const recordsToDelete = allRecords.slice(1);
    const idsToDelete = recordsToDelete.map(r => r.id);

    const { error: deleteError } = await supabase
      .from('maintenance_settings')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      return NextResponse.json(
        { error: '删除重复记录失败', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `已清理 ${idsToDelete.length} 条重复记录`,
      deletedCount: idsToDelete.length,
      retainedId: latestRecord.id,
      retainedDate: latestRecord.updated_at,
    });
  } catch (error) {
    console.error('Cleanup database error:', error);
    return NextResponse.json(
      { error: '清理失败', details: String(error) },
      { status: 500 }
    );
  }
}
