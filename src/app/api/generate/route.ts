import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

interface GenerateRequest {
  type: 'plot' | 'character' | 'polish' | 'outline';
  input: string;
}

const systemPrompts: Record<string, string> = {
  plot: '你是专业的小说创作助手，擅长各类题材小说的情节设计。请根据用户的需求，生成逻辑完整、有吸引力的小说情节，字数控制在800字以内，语言生动，符合网文创作习惯。',
  character: '你是专业的小说创作助手，擅长塑造丰满的小说人物。请根据用户的需求，生成包含「姓名、性格、背景、核心能力、人物弧光」的完整人物设定，字数控制在500字以内。',
  polish: '你是专业的小说创作助手，擅长小说文案润色。请保留原文核心意思，优化语言表达，增强画面感、情感张力和阅读流畅度，字数尽量与原文相当。',
  outline: '你是专业的小说创作助手，擅长搭建小说大纲。请根据用户的需求，生成包含「核心主题、故事线、关键情节节点、人物关系、结局走向」的完整小说大纲，结构清晰，逻辑连贯。',
};

export async function POST(request: NextRequest) {
  try {
    const { type, input }: GenerateRequest = await request.json();

    // 验证请求参数
    if (!type || !input) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数' }),
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
