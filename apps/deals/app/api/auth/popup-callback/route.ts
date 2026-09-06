import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Authenticating...</title>
  <style>
    body {
      margin: 0;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #334155;
    }
    .loader {
      width: 28px;
      height: 28px;
      border: 3px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin: 0 auto 10px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div style="text-align: center;">
    <div class="loader"></div>
    <div style="font-size: 13px; font-weight: 500;">Completing sign-in...</div>
  </div>
  <script>
    (function() {
      try {
        var params = new URLSearchParams(window.location.search);
        var err = params.get('error');
        var msg = err 
          ? { type: 'OAUTH_ERROR', error: err, t: Date.now() } 
          : { type: 'OAUTH_SUCCESS', t: Date.now() };

        // 1. BroadcastChannel (primary instant cross-context messaging)
        try {
          var bc = new BroadcastChannel('deals_google_auth');
          bc.postMessage(msg);
          setTimeout(function() {
            try { bc.postMessage(msg); bc.close(); } catch (e) {}
          }, 40);
        } catch (e) {}

        // 2. localStorage fallback
        try {
          localStorage.setItem('deals_oauth_result', JSON.stringify({ msg: msg, t: Date.now() }));
        } catch (e) {}

        // 3. window.opener postMessage fallback
        try {
          if (window.opener && window.opener !== window) {
            window.opener.postMessage(msg, window.location.origin);
            window.opener.postMessage(msg, '*');
          }
        } catch (e) {}

        // 4. Close popup immediately
        try { window.close(); } catch (e) {}
        setTimeout(function() { try { window.close(); } catch (e) {} }, 50);
        setTimeout(function() { try { window.close(); } catch (e) {} }, 250);
      } catch (fatal) {
        try { window.close(); } catch (e) {}
      }
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}
