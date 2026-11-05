// Contact form. There is no form endpoint yet, so a valid submit builds a mailto: link and opens the visitor's
// email app. It never shows a "sent" state, because nothing is sent from the page.
interface MailPayload {
  to: string;
  callSubject: string;
  questionSubject: string;
  labels: { name: string; email: string; role: string; org: string; athletes: string };
  opening: string;
}

type Topic = 'call' | 'question';
// Links shared before the rename carry ?topic=demo; they still open the same form.
const LEGACY_TOPICS: Record<string, Topic> = { demo: 'call' };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function init(form: HTMLFormElement) {
  const mail = JSON.parse(form.dataset.mail ?? '{}') as MailPayload;
  const status = form.querySelector<HTMLElement>('[data-status]');
  const callOnly = form.querySelector<HTMLElement>('[data-call-only]');
  const radios = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="topic"]'));
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  const topic = (): Topic => (radios.find((r) => r.checked)?.value === 'question' ? 'question' : 'call');

  // Our own messages replace the browser's, so they can be tied to each field with aria-describedby.
  form.noValidate = true;

  const applyTopic = () => {
    const isCall = topic() === 'call';
    if (callOnly) {
      callOnly.hidden = !isCall;
      field('athletes').disabled = !isCall;
    }
  };

  const asked = new URLSearchParams(window.location.search).get('topic') ?? '';
  const requested = LEGACY_TOPICS[asked] ?? asked;
  const initial = radios.find((r) => r.value === requested);
  if (initial) initial.checked = true;
  applyTopic();

  radios.forEach((radio) =>
    radio.addEventListener('change', () => {
      applyTopic();
      const url = new URL(window.location.href);
      url.searchParams.set('topic', topic());
      window.history.replaceState(null, '', url);
      if (status) status.textContent = '';
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

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (status) status.textContent = '';
    const invalid = validate();
    if (invalid) {
      field(invalid).focus();
      return;
    }

    const value = (name: string) => field(name).value.trim();
    const isCall = topic() === 'call';
    const subject = (isCall ? mail.callSubject : mail.questionSubject).replace('{name}', value('name'));
    const lines = [
      `${mail.labels.name}: ${value('name')}`,
      `${mail.labels.email}: ${value('email')}`,
      `${mail.labels.role}: ${value('role')}`,
    ];
    if (value('organization')) lines.push(`${mail.labels.org}: ${value('organization')}`);
    if (isCall && value('athletes')) lines.push(`${mail.labels.athletes}: ${value('athletes')}`);
    if (value('message')) lines.push('', value('message'));

    const href = `mailto:${mail.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\r\n'))}`;
    if (status) status.textContent = mail.opening.replace('{email}', mail.to);
    window.location.href = href;
  });
}

document.querySelectorAll<HTMLFormElement>('[data-contact-form]').forEach(init);

export {};
