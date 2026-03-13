import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI 小说创作助手 - WAP版',
  description: '一键生成小说情节、人物、大纲，AI 辅助创作更高效（WAP版）',
};

export default function WapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      <meta name="renderer" content="webkit" />
      <meta name="HandheldFriendly" content="true" />
      <meta name="MobileOptimized" content="320" />
      <link rel="stylesheet" href="/wap.css" />
      {children}
    </>
  );
}
