import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface GenerateRequest {
  type: 'plot' | 'character' | 'polish' | 'outline';
  input: string;
  token?: string;
}

const systemPrompts: Record<string, string> = {
  plot: '你是专业的小说创作助手，擅长各类题材小说的情节设计。请根据用户的需求，生成逻辑完整、有吸引力的小说情节，字数控制在800字以内，语言生动，符合网文创作习惯。',
  character: '你是专业的小说创作助手，擅长塑造丰满的小说人物。请根据用户的需求，生成包含「姓名、性格、背景、核心能力、人物弧光」的完整人物设定，字数控制在500字以内。',
  polish: '你是专业的小说创作助手，擅长小说文案润色。请保留原文核心意思，优化语言表达，增强画面感、情感张力和阅读流畅度，字数尽量与原文相当。',
  outline: '你是专业的小说创作助手，擅长搭建小说大纲。请根据用户的需求，生成包含「核心主题、故事线、关键情节节点、人物关系、结局走向」的完整小说大纲，结构清晰，逻辑连贯。',
};

const FREE_DAILY_QUOTA = 3; // 免费用户每日 3 次

// 敏感词列表
const SENSITIVE_KEYWORDS = [
  // ====== 国家分裂 / 颠覆 / 领导人攻击 / 历史虚无 ======
  '中国分裂', '独立国家', '省份独立', '建国过程', '国家领导人腐败', '权钱交易',
  '出卖国家机密', '外国势力', '革命阴谋论', '历史真相颠覆', '台湾独立',
  '国际承认主权', '军事封锁', '刺杀领袖', '开国领袖', '改变政治格局', '君主立宪',
  '国家分裂', '颠覆政权', '领土问题', '历史虚无主义', '政治阴谋',

  // ====== 原有政治敏感词 ======
  '台湾', '湾湾', '蛙蛙', '台独', '统一', '拒绝统一', '独立', '一国两制',
  '大陆', '台湾问题', '两岸', '统一中国', '台湾独立', '分裂国家', '中国统一',
  '台湾海峡', '台海', '中华民国', '民选政府', '政治体制', '政党', '选举',
  '政治', '政府', '领导人', '政策', '意识形态', '政治改革', '香港', '新疆',
  '西藏', '钓鱼岛', '南海', '分裂', '分裂主义', '国家主权', '领土完整',
  '现任领导人', '负面评价',

  // ====== 非法活动 ======
  '非法集会', '游行', '示威', '上访',

  // ====== 色情低俗 / 性暴力 ======
  '性关系过程', '露骨描写', '身体反应', '性对话', '药物迷晕', '无意识侵犯',
  '性侵犯', '乱伦', '亲兄妹恋', '青楼', '妓女', '性服务', '挑逗语言',
  '性虐待', '强奸', '性暴力', '成人描写', '性行为细节', '性暗示', '淫秽',

  // ====== 暴力恐怖 / 极端主义 ======
  '恐怖分子', '简易炸弹', '炸弹制造', '化学配比', '爆炸袭击', '活剥皮',
  '挖心掏肺', '血液喷溅', '内脏', '邪教', '洗脑', '集体自杀', '毒药',
  '屠杀', '幼儿园杀害', '杀害儿童', '捕捉保护动物', '残忍杀害', '逃避警察',
  '血腥暴力', '恐怖袭击', '极端组织', '暴力犯罪',

  // ====== 危险物品 ======
  '枪支', '弹药', '管制刀具', '爆炸物',

  // ====== 毒品 / 赌博 / 犯罪 ======
  '毒品', '管制物质', '海洛因', '冰毒', '大麻', '罂粟', '贩毒网络', '跨国贩毒',
  '地下赌场', '出千', '赌博作弊', '高利贷', '电信诈骗', '诈骗话术', '老年人诈骗',
  '伪基站', '黑客病毒', '勒索病毒', '医院系统攻击', '伪造货币', '纸币伪造',
  '油墨配方', '防伪标记', '毒品制造', '赌博犯罪', '金融犯罪', '网络犯罪',

  // ====== 歧视 / 仇恨言论 ======
  '地域歧视', '河南人小偷', '民族歧视', '种族', '低种族', '高种族', '种族歧视',
  '驱逐某群体', '男尊女卑', '女性附属品', '剥夺教育权', '嘲笑残疾人', '聋哑人',
  '盲人', '艾滋病歧视', '向人群喷血', '读书无用论', '拜金主义', '出卖肉体',
  '坑蒙拐骗', '仇恨言论', '社会歧视', '公序良俗',

  // ====== 隐私 / 造谣 / 深度伪造 ======
  '企业家丑闻', '挪用公款', '包养情人', '明星住址', '电话号码泄露',
  '子女学校信息', '隐私曝光', '核泄漏谣言', '政府掩盖真相', '偷拍',
  '私密视频', '偷拍设备', '造谣上市公司', '财务造假', '做空获利',
  '虚假新闻', '诽谤', '隐私侵犯', '社会恐慌',
];

// 检查内容是否包含敏感词
function containsSensitiveContent(text: string): boolean {
  for (const keyword of SENSITIVE_KEYWORDS) {
    if (text.includes(keyword)) {
      return true;
    }
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const { type, input, token }: GenerateRequest = await request.json();

    // 验证请求参数
    if (!type || !input) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 检查内容是否包含敏感词
    if (containsSensitiveContent(input)) {
      return new Response(
        JSON.stringify({ error: '您的创作需求涉及敏感内容，请换一个需求' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 获取系统提示词
    const systemPrompt = systemPrompts[type];
    if (!systemPrompt) {
      return new Response(
        JSON.stringify({ error: '不支持的创作类型' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 获取客户端 IP
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                       request.headers.get('x-real-ip') ||
                       '127.0.0.1';

    // 优先从 Cookie 获取 token，其次从请求体获取
    let authToken = request.cookies.get('auth_token')?.value;
    if (!authToken && token) {
      authToken = token;
    }

    // 检查使用配额
    const supabase = authToken ? getSupabaseClient(authToken) : getSupabaseClient();

    // 检查维护模式 - 获取最新的记录
    const { data: maintenanceSetting } = await supabase
      .from('maintenance_settings')
      .select('maintenance_mode, maintenance_message')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    // 如果开启维护模式，检查用户是否为管理员
    if (maintenanceSetting?.maintenance_mode) {
      let isAdmin = false;

      if (authToken) {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

          isAdmin = profile?.is_admin === 1;
        }
      }

      // 如果不是管理员，返回维护提示
      if (!isAdmin) {
        return new Response(
          JSON.stringify({
            error: 'MAINTENANCE_MODE',
            message: maintenanceSetting.maintenance_message || '当前功能维护中，请稍后再试'
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    let userId: string | null = null;
    let dailyQuota = FREE_DAILY_QUOTA;

    // 如果有 token，获取用户 ID 和配额
    if (authToken) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (!userError && user) {
        userId = user.id;

        // 获取用户资料
        const { data: profile } = await supabase
          .from('profiles')
          .select('daily_quota')
          .eq('id', user.id)
          .single();

        if (profile) {
          dailyQuota = profile.daily_quota;
        }
      }
    }

    // 检查今日使用次数
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let query = supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('ip_address', ipAddress).is('user_id', null);
    }

    const { count } = await query;
    const todayUsage = count || 0;

    // 检查是否超出配额
    if (todayUsage >= dailyQuota) {
      const errorData = {
        error: '今日配额已用尽',
        requireLogin: !userId,
        todayUsage,
        dailyQuota,
        remaining: 0,
      };

      return new Response(
        JSON.stringify(errorData),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 记录使用
    await supabase
      .from('usage_logs')
      .insert({
        user_id: userId,
        ip_address: ipAddress,
        usage_type: type,
      });

    // 提取请求头并初始化客户端
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 构建消息
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `用户需求：${input}` },
    ];

    // 创建流式响应
    const stream = client.stream(messages, {
      temperature: 0.7, // 平衡创造性和连贯性
    });

    // 创建 ReadableStream
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              controller.enqueue(encoder.encode(chunk.content.toString()));
            }
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    // 返回 SSE 流式响应
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ error: '服务器内部错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
