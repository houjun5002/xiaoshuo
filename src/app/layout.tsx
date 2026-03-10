import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'AI 小说创作助手 | 扣子编程',
    template: '%s | AI 小说创作助手',
  },
  description: '一键生成小说情节、人物、大纲，AI 辅助创作更高效。基于扣子豆包大模型。',
  keywords: [
    'AI小说创作',
    '小说生成器',
    '情节生成',
    '人物设定',
    '大纲创作',
    '文案润色',
    '扣子编程',
    'Coze Code',
  ],
  openGraph: {
    title: 'AI 小说创作助手 - 让创作更简单',
    description: '一键生成小说情节、人物、大纲，AI 辅助创作更高效',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>
        <AuthProvider>
          {isDev && <Inspector />}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
