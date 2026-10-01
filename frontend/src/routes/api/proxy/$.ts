import { createFileRoute } from '@tanstack/react-router';

const TARGET_BASE_URL = 'https://reto-02-galvis-production.up.railway.app';

async function forward(request: Request, splat: string): Promise<Response> {
  const url = new URL(request.url);
  const target = `${TARGET_BASE_URL}/api/${splat.replace(/^api\//, '')}${url.search}`;
  const init: RequestInit = { method: request.method, headers: { 'Content-Type': 'application/json' } };
  if (request.method !== 'GET' && request.method !== 'HEAD') init.body = await request.text();
  try {
    const upstream = await fetch(target, init);
    const body = await upstream.text();
    return new Response(body, { status: upstream.status, headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' } });
  } catch {
    return Response.json({ error: 'No se pudo conectar con el servicio contractual.' }, { status: 502 });
  }
}

export const Route = createFileRoute('/api/proxy/$')({
  server: {
    handlers: {
      GET: ({ request, params }) => forward(request, params._splat ?? ''),
      POST: ({ request, params }) => forward(request, params._splat ?? ''),
    },
  },
});