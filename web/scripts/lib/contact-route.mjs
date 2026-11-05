// Intercepts the live contact endpoint for the browser checks. Nothing here ever reaches api.runwitharia.com, so a check can
// never send real email. The CORS preflight is answered the way the real endpoint answers an allowed origin.
// respond(post, n) returns the HTTP status to answer with, or 'abort' to drop the connection; n counts the posts, from 1.
import { CONTACT_ENDPOINT, MIN_FILL_MS, optionalKeys, requiredKeys } from './contact-contract.mjs';

export async function interceptContact(page, origin, respond) {
  const posts = [];
  const cors = { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'Origin' };
  await page.route(CONTACT_ENDPOINT, (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    let body = null;
    try {
      body = request.postDataJSON();
    } catch {
      body = null;
    }
    const post = { body, at: Date.now() };
    posts.push(post);
    const outcome = respond(post, posts.length);
    if (outcome === 'abort') return route.abort('failed');
    const ok = outcome === 202;
    return route.fulfill({ status: outcome, headers: cors, contentType: 'application/json', body: JSON.stringify(ok ? { ok: true } : { ok: false, error: outcome === 429 ? 'rate_limited' : outcome === 400 ? 'invalid' : 'unavailable' }) });
  });
  return posts;
}

// What is wrong with one captured post, judged against the endpoint's contract. Empty when it is fine.
export function postProblems(post, expected = {}) {
  const b = post.body;
  if (!b || typeof b !== 'object') return ['the body is not a JSON object'];
  const problems = [];
  for (const key of requiredKeys) if (!(key in b)) problems.push(`${key} is missing`);
  for (const key of Object.keys(b)) if (![...requiredKeys, ...optionalKeys].includes(key)) problems.push(`unexpected field ${key}`);
  if (b.website !== '') problems.push(`the honeypot "website" must be sent and empty, got ${JSON.stringify(b.website)}`);
  if (!Number.isInteger(b.startedAt) || b.startedAt <= 0) problems.push(`startedAt must be sent as a positive integer, got ${JSON.stringify(b.startedAt)}`);
  else if (post.at - b.startedAt < MIN_FILL_MS) problems.push(`posted ${post.at - b.startedAt} ms after startedAt; the endpoint rejects anything under ${MIN_FILL_MS} ms`);
  for (const [key, value] of Object.entries(expected)) if (b[key] !== value) problems.push(`${key} must be ${JSON.stringify(value)}, got ${JSON.stringify(b[key])}`);
  return problems;
}
