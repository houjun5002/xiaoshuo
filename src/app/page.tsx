'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PenLine, Loader2, Sparkles, User, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthDialog } from '@/components/auth/AuthDialog';

type CreationType = 'plot' | 'character' | 'polish' | 'outline';

interface CreationTypeConfig {
  value: CreationType;
  label: string;
  placeholder: string;
  systemPrompt: string;
}

const creationTypes: CreationTypeConfig[] = [
  {
    value: 'plot',
    label: '情节生成',
    placeholder: '例如：生成一个玄幻小说的高潮情节，主角是剑修，对手是魔族少主',
    systemPrompt: '你是专业的小说创作助手，擅长各类题材小说的情节设计。请根据用户的需求，生成逻辑完整、有吸引力的小说情节，字数控制在800字以内，语言生动，符合网文创作习惯。',
  },
  {
    value: 'character',
    label: '人物设定',
    placeholder: '例如：创建一个冷酷无情的魔教护法，有悲惨的过去',
    systemPrompt: '你是专业的小说创作助手，擅长塑造丰满的小说人物。请根据用户的需求，生成包含「姓名、性格、背景、核心能力、人物弧光」的完整人物设定，字数控制在500字以内。',
  },
  {
    value: 'polish',
    label: '文案润色',
    placeholder: '例如：润色这段文字：他看到了光，那是一道刺眼的光芒...',
    systemPrompt: '你是专业的小说创作助手，擅长小说文案润色。请保留原文核心意思，优化语言表达，增强画面感、情感张力和阅读流畅度，字数尽量与原文相当。',
  },
  {
    value: 'outline',
    label: '大纲创作',
    placeholder: '例如：创作一个关于时空穿越的修仙小说大纲',
    systemPrompt: '你是专业的小说创作助手，擅长搭建小说大纲。请根据用户的需求，生成包含「核心主题、故事线、关键情节节点、人物关系、结局走向」的完整小说大纲，结构清晰，逻辑连贯。',
  },
];

export default function Home() {
  const { user, token, logout, todayUsage, dailyQuota, refreshQuota } = useAuth();
  const [selectedType, setSelectedType] = useState<CreationType | ''>('');
  const [userInput, setUserInput] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const handleGenerate = async () => {
    if (!selectedType || !userInput.trim()) {
      return;
    }

    setIsLoading(true);
    setResult('');
    setQuotaExceeded(false);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: selectedType,
          input: userInput,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          setQuotaExceeded(true);
          setResult(errorData.error || '今日配额已用尽');
        } else {
          throw new Error('生成失败');
        }
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          setResult((prev) => prev + chunk);
        }
      }

      // 生成完成后刷新使用次数
      await refreshQuota();
    } catch (error) {
      console.error('Error:', error);
      setResult('生成失败，请稍后重试。');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedConfig = creationTypes.find((t) => t.value === selectedType);
  const remaining = dailyQuota - todayUsage;
  const isNearLimit = remaining <= 3 && remaining > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 头部 + 用户信息 */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                AI 小说创作助手
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              一键生成小说情节、人物、大纲，AI 辅助创作更高效
            </p>
          </div>

          {/* 用户操作区 */}
          <div className="flex flex-col items-end gap-2">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{user.user_metadata?.username || user.email}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  登出
                </Button>
              </>
            ) : (
              <Button onClick={() => setShowAuthDialog(true)} className="gap-2">
                <User className="w-4 h-4" />
                登录 / 注册
              </Button>
            )}
          </div>
        </div>

        {/* 配额提示卡片 */}
        <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm font-medium">
                    今日配额使用
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user ? '登录用户' : '免费用户'}：{todayUsage} / {dailyQuota} 次
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${isNearLimit ? 'text-orange-500' : 'text-blue-600 dark:text-blue-400'}`}>
                  {remaining}
                </p>
                <p className="text-xs text-muted-foreground">剩余次数</p>
              </div>
            </div>
            {quotaExceeded && (
              <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  今日配额已用尽！{user ? '请联系管理员增加配额' : '登录后可获得更多使用次数（10次/天）'}
                </p>
                {!user && (
                  <Button
                    variant="link"
                    className="p-0 h-auto mt-2"
                    onClick={() => setShowAuthDialog(true)}
                  >
                    立即登录 →
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 主内容区 */}
        <div className="grid gap-6">
          {/* 输入表单 */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenLine className="w-5 h-5" />
                创作配置
              </CardTitle>
              <CardDescription>
                选择创作类型并输入您的需求，AI 将为您生成内容
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 创作类型选择 */}
              <div className="space-y-2">
                <Label htmlFor="creation-type">创作类型</Label>
                <Select value={selectedType} onValueChange={(value) => setSelectedType(value as CreationType)}>
                  <SelectTrigger id="creation-type">
                    <SelectValue placeholder="请选择创作类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {creationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 创作需求输入 */}
              <div className="space-y-2">
                <Label htmlFor="user-input">创作需求</Label>
                <Textarea
                  id="user-input"
                  placeholder={selectedConfig?.placeholder || '请先选择创作类型'}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  disabled={!selectedType}
                  className="min-h-[120px] resize-none"
                  maxLength={1000}
                />
                <div className="text-right text-xs text-muted-foreground">
                  {userInput.length}/1000
                </div>
              </div>

              {/* 生成按钮 */}
              <Button
                onClick={handleGenerate}
                disabled={!selectedType || !userInput.trim() || isLoading || remaining <= 0}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    正在生成...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    开始创作
                  </>
                )}
              </Button>
              {remaining <= 0 && !quotaExceeded && (
                <p className="text-sm text-center text-orange-500">
                  今日配额已用完，请明天再试或登录获取更多次数
                </p>
              )}
            </CardContent>
          </Card>

          {/* 结果展示区 */}
          {(result || isLoading) && (
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenLine className="w-5 h-5" />
                  创作结果
                </CardTitle>
                <CardDescription>
                  {selectedConfig?.label}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="min-h-[200px] p-4 bg-muted/50 rounded-lg border">
                  {isLoading && !result ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin mr-2" />
                      正在思考中...
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                      {result}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 页脚 */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>基于扣子豆包大模型 | 专为小说创作打造</p>
        </div>

        {/* 认证对话框 */}
        <AuthDialog
          open={showAuthDialog}
          onOpenChange={setShowAuthDialog}
          defaultTab="login"
        />
      </div>
    </div>
  );
}
