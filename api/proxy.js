// 告诉 Vercel 这是一个 Edge Function (运行在边缘节点，速度极快)
export const config = {
  runtime: 'edge',
};

export default async function (request) {
  // 1. 解析当前请求的 URL
  const url = new URL(request.url);

  // 2. 构造目标 GitHub Pages 的 URL
  // 逻辑：将当前请求的路径 (pathname) 和参数 (search) 拼接到 GitHub 域名后
  const targetUrl = `https://zinc23333.github.io${url.pathname}${url.search}`;

  try {
    // 3. 向 GitHub Pages 发起请求
    const githubResponse = await fetch(targetUrl, {
      headers: {
        // 透传 User-Agent，防止被 GitHub 认为是爬虫
        'User-Agent': request.headers.get('user-agent') || 'Mozilla/5.0',
      },
    });

    // 4. 处理响应头
    // 创建一个新的 Headers 对象，基于 GitHub 的返回头
    const newHeaders = new Headers(githubResponse.headers);

    // 【核心逻辑】手动备份敏感 Header 到 x-origin- 前缀
    // 因为 Vercel 会强制覆盖 Server 和 Via，我们必须另存一份才能被探测到
    const server = newHeaders.get('server');
    if (server) {
      newHeaders.set('x-origin-server', server);
    }

    const via = newHeaders.get('via');
    if (via) {
      newHeaders.set('x-origin-via', via);
    }
    
    // 允许跨域（可选，方便你的检测工具）
    newHeaders.set('Access-Control-Allow-Origin', '*');

    // 5. 返回修改后的响应
    return new Response(githubResponse.body, {
      status: githubResponse.status,
      statusText: githubResponse.statusText,
      headers: newHeaders,
    });

  } catch (error) {
    return new Response(`Proxy Error: ${error.message}`, { status: 500 });
  }
}