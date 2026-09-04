import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MMF 配置台',
  description: '基于收益、期限与银行敞口约束的货币市场基金配置规划器',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
