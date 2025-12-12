export const config = {
  runtime: 'edge',
};

export default async function (request) {
  const url = new URL(request.url);

  // ================= 配置区域 =================
  const GITHUB_DOMAIN = 'zinc23333.github.io';
  const REPO_NAME = '/what-cdn'; // 你的 GitHub 仓库名 (带斜杠)
  // ===========================================

  // 1. 路径重写逻辑
  // 目标：把用户访问的 /xxx 映射到 GitHub 的 /what-cdn/xxx
  let targetPath = url.pathname;

  // 如果路径不是以 /what-cdn 开头，我们就手动补上
  // 这样无论用户访问 "/" 还是 "/style.css"，都会正确指向仓库内的文件
  if (!targetPath.startsWith(REPO_NAME)) {
    // 确保拼接时处理好斜杠
    if (targetPath === '/') {
       targetPath = REPO_NAME + '/';
    } else {
       targetPath = REPO_NAME + targetPath;
    }
  }

  // 构造最终的 GitHub 目标 URL
  const targetUrl = `https://${GITHUB_DOMAIN}${targetPath}${url.search}`;

  try {
    const githubResponse = await fetch(targetUrl, {
      headers: {
        'User-Agent': request.headers.get('user-agent') || 'Mozilla/5.0',
      },
    });

    // 2. 处理响应头 (Header 搬运)
    const newHeaders = new Headers(githubResponse.headers);
    
    const server = newHeaders.get('server');
    if (server) newHeaders.set('x-origin-server', server);

    const via = newHeaders.get('via');
    if (via) newHeaders.set('x-origin-via', via);
    
    newHeaders.set('Access-Control-Allow-Origin', '*');

    // 3. 返回响应
    return new Response(githubResponse.body, {
      status: githubResponse.status,
      statusText: githubResponse.statusText,
      headers: newHeaders,
    });

  } catch (error) {
    return new Response(`Proxy Error: ${error.message}`, { status: 500 });
  }
}