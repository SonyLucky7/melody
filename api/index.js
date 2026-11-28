const https = require('https');

let expressApp = null;
let loadError = null;

function getExpressApp() {
  if (expressApp) return expressApp;
  if (loadError) return null;
  try {
    const mod = require('../server/dist/index.js');
    expressApp = mod.default || mod.app || mod;
    return expressApp;
  } catch (err) {
    loadError = err;
    console.error('[Vercel Serverless] Failed to load server/dist/index.js:', err);
    return null;
  }
}

function proxyToRenderFallback(req, res) {
  const targetUrl = `https://melody-mzsm.onrender.com${req.url || '/'}`;
  const headers = { ...req.headers, host: 'melody-mzsm.onrender.com' };
  delete headers['content-length'];

  const proxyReq = https.request(
    targetUrl,
    { method: req.method, headers, timeout: 15000 },
    (proxyRes) => {
      if (proxyRes.statusCode === 503) {
        proxyRes.resume();
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(
          JSON.stringify({
            error: 'BACKEND_ENV_REQUIRED',
            message:
              'Add DATABASE_URL and TELEGRAM_BOT_TOKENS in Vercel Project Settings -> Environment Variables (or resume Render) to enable 24/7 serverless playback.',
          })
        );
        return;
      }
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(
        JSON.stringify({
          error: 'UPSTREAM_UNAVAILABLE',
          message: err.message,
        })
      );
    }
  });

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
}

module.exports = (req, res) => {
  // Always handle CORS preflight cleanly
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type,Authorization,x-device-id,x-device-token,x-admin-secret,Range'
    );
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range,Content-Length,Accept-Ranges,Content-Type');
    res.statusCode = 204;
    res.end();
    return;
  }

  // If Vercel has DATABASE_URL configured, run our full Express API natively on Vercel Serverless (zero Render dependency!)
  if (process.env.DATABASE_URL) {
    const app = getExpressApp();
    if (app) {
      return app(req, res);
    }
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'SERVERLESS_INIT_ERROR',
        message: loadError ? loadError.message : 'Server bundle missing',
      })
    );
    return;
  }

  // Otherwise fall back seamlessly to Render (or return setup guidance if Render is suspended)
  return proxyToRenderFallback(req, res);
};
