// Entry point for the Worker. Routes the API + admin pages, everything else is the static site.
import { onRequestPost as feedbackPost } from './feedback.js';
import { onRequestPost as downloadsPost } from './downloads.js';
import { onRequestGet as adminGet, onRequestPost as adminPost } from './admin.js';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const ctx = { request, env };
    if (pathname === '/api/feedback' && request.method === 'POST') return feedbackPost(ctx);
    if (pathname === '/api/downloads' && request.method === 'POST') return downloadsPost(ctx);
    if (pathname === '/admin' || pathname === '/admin/') {
      if (request.method === 'GET') return adminGet(ctx);
      if (request.method === 'POST') return adminPost(ctx);
      return new Response('Method not allowed', { status: 405 });
    }
    return env.ASSETS.fetch(request);
  }
};
