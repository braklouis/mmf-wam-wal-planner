import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MMF 配置台',
  description: '基于收益、期限与机构敞口约束的货币市场基金配置规划器',
};

const preferenceBootstrap =
  "(function(){try{var r=document.documentElement,t=localStorage.getItem('mmf-planner.theme.v1'),l=localStorage.getItem('mmf-planner.locale.v1');if(t==='dark'){r.classList.add('dark')}r.style.colorScheme=t==='dark'?'dark':'light';if(l==='zh-CN'||l==='zh-HK'||l==='en'){r.lang=l}}catch(e){}})()";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: preferenceBootstrap }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
