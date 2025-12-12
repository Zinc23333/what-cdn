import { NextResponse } from 'next/server';

export const config = {
  // 匹配所有路径
  matcher: '/:path*',
};

export default async function middleware(request) {
  const url = request.nextUrl;
  
  // 1. 定义源站地址 (你的 GitHub Pages)
  // 注意：不需要把 request.nextUrl.pathname 再次拼接到 target，
  // 因为我们是直接 fetch 完整的原始路径对应的 GitHub URL
  const targetUrl = `https://zinc23333.github.io${url.pathname}${url.search}`;

  try {
    // 2. 向 GitHub Pages 发起请求
    const response = await fetch(targetUrl, {
      headers: {
        // 可以选择性透传请求头，或者保持默认
        'User-Agent': request.headers.get('user-agent'),
      },
    });

    // 3. 创建一个新的响应，使用 GitHub 的 Body 和 Status
    const newResponse = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
    });

    // 4. 【关键步骤】手动复制 GitHub 的 Header 到 Vercel 的响应中
    response.headers.forEach((value, key) => {
      // ⚠️ 注意：Vercel 可能会强制覆盖 'server' 和 'via'，
      // 所以我们把源站的敏感 Header 备份一份到 'x-origin-...'
      newResponse.headers.set(key, value);
      
      // 特殊处理：因为 Server 头通常会被 Vercel 覆盖掉，
      // 我们把它另存为 x-origin-server，这样你的检测工具就能读取到了
      if (key.toLowerCase() === 'server') {
        newResponse.headers.set('x-origin-server', value);
      }
      if (key.toLowerCase() === 'via') {
        newResponse.headers.set('x-origin-via', value);
      }
      if (key.toLowerCase() === 'x-cache') {
        newResponse.headers.set('x-origin-cache', value);
      }
    });

    return newResponse;

  } catch (error) {
    return new NextResponse(`Error fetching source: ${error.message}`, { status: 500 });
  }
}
