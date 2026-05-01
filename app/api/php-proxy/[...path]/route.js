import { NextResponse } from 'next/server';

/**
 * Server-side proxy to the PHP API. Browser calls same-origin /api/php-proxy/...
 * so production (e.g. Vercel) avoids cross-origin CORS to Hostinger.
 *
 * Set NEXT_PUBLIC_API_BASE_URL or API_BACKEND_URL to the PHP site root that
 * makes URLs like: {base}api/login.php (e.g. https://your-host/restuarent/)
 */
function getBackendBase() {
  const raw = process.env.API_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '';
  if (!raw.trim()) return '';
  return raw.replace(/\/*$/, '/');
}

async function forward(request, context) {
  const params = await context.params;
  const segments = params.path;
  const pathStr = Array.isArray(segments) ? segments.join('/') : '';
  if (!pathStr) {
    return NextResponse.json({ success: false, message: 'Missing API path' }, { status: 400 });
  }

  const base = getBackendBase();
  if (!base) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Server misconfiguration: set NEXT_PUBLIC_API_BASE_URL (or API_BACKEND_URL) to your PHP base URL, e.g. https://host/restuarent/',
      },
      { status: 500 }
    );
  }

  const target = new URL(`${pathStr}${request.nextUrl.search}`, base);

  const headers = new Headers();
  const passHeaders = ['authorization', 'content-type', 'accept'];
  request.headers.forEach((value, key) => {
    if (passHeaders.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const init = {
    method: request.method,
    headers,
    redirect: 'follow',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  let res;
  try {
    res = await fetch(target, init);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, message: 'Proxy could not reach PHP server', error: msg },
      { status: 502 }
    );
  }

  const text = await res.text();
  const out = new NextResponse(text, { status: res.status });
  const ct = res.headers.get('content-type');
  if (ct) out.headers.set('content-type', ct);
  return out;
}

export async function GET(request, context) {
  return forward(request, context);
}

export async function POST(request, context) {
  return forward(request, context);
}

export async function PUT(request, context) {
  return forward(request, context);
}

export async function DELETE(request, context) {
  return forward(request, context);
}

export async function HEAD(request, context) {
  return forward(request, context);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
