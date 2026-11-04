// Contact form. It posts to the live endpoint (data-endpoint). The page shows its "sent" state only when the endpoint
// answers 202. A 400, a 429, a 503, any other status and a network failure each keep the form as it was and show a
// message with the direct email and WhatsApp details. Nothing here opens the visitor's email app.
interface Messages {
  busy: string;
  ok: string;
  invalid: string;
  limited: string;
  unavailable: string;
}

type Topic = 'demo' | 'question';
type Outcome = 'ok' | 'invalid' | 'limited' | 'unavailable';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// The endpoint rejects a post that arrives less than 3 s after startedAt (the moment the form opened).
const MIN_FILL_MS = 3000;
const SLACK_MS = 250;
const TIMEOUT_MS = 15000;

async function post(endpoint: string, body: Record<string, unknown>): Promise<Outcome> {
  const abort = new AbortController();
  const timer = window.setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify(body),
      signal: abort.signal,
    });
    if (res.status === 202) return 'ok';
    if (res.status === 400) return 'invalid';
    if (res.status === 429) return 'limited';
    return 'unavailable';
  } catch {
    return 'unavailable';
  } finally {
    window.clearTimeout(timer);
  }
}

function init(form: HTMLFormElement) {
  const messages = JSON.parse(form.dataset.send ?? '{}') as Messages;
  const endpoint = form.dataset.endpoint ?? '';
  const locale = form.dataset.locale === 'es' ? 'es' : 'en';
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const fallback = form.querySelector<HTMLTemplateElement>('template[data-fallback]');
  const status = form.querySelector<HTMLElement>('[data-status]');
  let openedAt = Date.now();
  let inflight = false;
  const demoOnly = form.querySelector<HTMLElement>('[data-demo-only]');
  const radios = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="topic"]'));
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  const topic = (): Topic => (radios.find((r) => r.checked)?.value === 'question' ? 'question' : 'demo');

  // Our own messages replace the browser's, so they can be tied to each field with aria-describedby.
  form.noValidate = true;

  const clearStatus = () => {
    if (!status) return;
    status.removeAttribute('data-state');
    status.textContent = '';
  };

  // A failure message carries the direct email and WhatsApp links, cloned from the template in the page.
  const show = (state: 'busy' | 'ok' | 'fail', text: string, withFallback = false) => {
    if (!status) return;
    const msg = document.createElement('span');
    msg.className = 'form__msg';
    msg.textContent = text;
    if (withFallback && fallback) msg.append(' ', fallback.content.cloneNode(true));
    status.dataset.state = state;
    status.replaceChildren(msg);
  };

  const applyTopic = () => {
    const isDemo = topic() === 'demo';
    if (demoOnly) {
      demoOnly.hidden = !isDemo;
      field('athletes').disabled = !isDemo;
    }
  };

  const requested = new URLSearchParams(window.location.search).get('topic');
  const initial = radios.find((r) => r.value === requested);
  if (initial) initial.checked = true;
  applyTopic();

  radios.forEach((radio) =>
    radio.addEventListener('change', () => {
      applyTopic();
      const url = new URL(window.location.href);
      url.searchParams.set('topic', topic());
      window.history.replaceState(null, '', url);
      clearStatus();
    }),
  );

  const setError = (name: string, message: string | null) => {
    const input = field(name);
    const error = form.querySelector<HTMLElement>(`#e-${name}`);
    if (!error) return;
    error.hidden = !message;
    error.textContent = message ?? '';
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  };

  ['name', 'email', 'role'].forEach((name) => {
    field(name).addEventListener('input', () => setError(name, null));
    field(name).addEventListener('change', () => setError(name, null));
  });

  const validate = (): string | null => {
    const checks: [string, boolean, string | undefined][] = [
      ['name', field('name').value.trim().length > 0, form.dataset.errName],
      ['email', EMAIL.test(field('email').value.trim()), form.dataset.errEmail],
      ['role', field('role').value !== '', form.dataset.errRole],
    ];
    let first: string | null = null;
    for (const [name, ok, message] of checks) {
      setError(name, ok ? null : (message ?? ''));
      if (!ok && !first) first = name;
    }
    return first;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (inflight) return;
    clearStatus();
    const invalid = validate();
    if (invalid) {
      field(invalid).focus();
      return;
    }

    const value = (name: string) => field(name).value.trim();
    const isDemo = topic() === 'demo';
    inflight = true;
    if (submit) submit.disabled = true;
    form.setAttribute('aria-busy', 'true');
    show('busy', messages.busy);

    // Submitting within 3 s of opening the form would be rejected as too fast, so wait out the rest.
    const wait = MIN_FILL_MS + SLACK_MS - (Date.now() - openedAt);
    if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait));

    const body: Record<string, unknown> = {
      topic: topic(),
      name: value('name'),
      email: value('email'),
      role: value('role'),
      message: value('message'),
      locale,
      page: window.location.pathname,
      website: field('website').value,
      startedAt: openedAt,
    };
    if (value('organization')) body.organization = value('organization');
    if (isDemo && value('athletes')) body.athletes = value('athletes');

    const outcome = await post(endpoint, body);
    inflight = false;
    if (submit) submit.disabled = false;
    form.removeAttribute('aria-busy');

    if (outcome === 'ok') {
      const chosen = topic();
      form.reset();
      const radio = radios.find((r) => r.value === chosen);
      if (radio) radio.checked = true;
      applyTopic();
      openedAt = Date.now();
      show('ok', messages.ok);
      return;
    }
    show('fail', messages[outcome], true);
  });

  if (submit) submit.disabled = false;
}

document.querySelectorAll<HTMLFormElement>('[data-contact-form]').forEach(init);

export {};
