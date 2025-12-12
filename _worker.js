/**
 * Cloudflare Worker CORS Proxy for CDN Detector
 * 使用方法: https://your-worker.workers.dev/?url=https://target.com
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 1. 获取目标 URL (从 query 参数中)
    // 例如: ?url=https://www.google.com
    const targetUrl = url.searchParams.get("url");

    // 定义通用的 CORS 头
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      // 关键：允许前端 JS 读取所有响应头（包括自定义的 x-eo-id 等）
      "Access-Control-Expose-Headers": "*", 
    };

    // 2. 处理 OPTIONS 预检请求 (Preflight)
    // 浏览器在跨域请求前会先发一个 OPTIONS，必须直接返回 200/204
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
        status: 204
      });
    }

    // 如果没有 url 参数，提示用法
    if (!targetUrl) {
      return new Response("Missing 'url' parameter. Usage: ?url=https://example.com", {
        status: 400,
        headers: corsHeaders
      });
    }

    try {
      // 3. 发起请求获取目标内容
      // 我们创建一个新的 Request 对象，以避免带上原请求中不必要的 Cloudflare 自身 Header
      // 同时也伪造 User-Agent，防止部分网站拦截空 UA
      const originalRequest = new Request(targetUrl, {
        method: request.method,
        headers: {
          "User-Agent": "Mozilla/5.0 (CDN-Detector-Bot/1.0)",
          "Accept": "*/*"
        },
        redirect: "follow" // 跟随重定向，获取最终页面的 Header
      });

      const response = await fetch(originalRequest);

      // 4. 重组响应头
      // fetch 返回的 response.headers 是只读的，我们需要创建一个新的 Headers 对象
      // 把目标网站的 Header 复制过来，然后覆盖 CORS 设置
      const newHeaders = new Headers(response.headers);
      
      Object.keys(corsHeaders).forEach(key => {
        newHeaders.set(key, corsHeaders[key]);
      });

      // 5. 返回结果
      // 注意：直接透传 body，这样即使是图片或 HTML 也能正常通过代理
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });

    } catch (e) {
      // 错误处理
      return new Response(`Proxy Error: ${e.message}`, {
        status: 500,
        headers: corsHeaders
      });
    }
  },
};