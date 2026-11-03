// Contact form. There is no form endpoint yet, so a valid submit builds a mailto: link and opens the visitor's
// email app. It never shows a "sent" state, because nothing is sent from the page.
interface MailPayload {
  to: string;
  demoSubject: string;
  questionSubject: string;
  labels: { name: string; email: string; role: string; org: string; athletes: string };
  opening: string;
}

type Topic = 'demo' | 'question';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function init(form: HTMLFormElement) {
  const mail = JSON.parse(form.dataset.mail ?? '{}') as MailPayload;
  const status = form.querySelector<HTMLElement>('[data-status]');
  const demoOnly = form.querySelector<HTMLElement>('[data-demo-only]');
  const radios = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="topic"]'));
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  const topic = (): Topic => (radios.find((r) => r.checked)?.value === 'question' ? 'question' : 'demo');

  // Our own messages replace the browser's, so they can be tied to each field with aria-describedby.
  form.noValidate = true;

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
    const isDemo = topic() === 'demo';
    const subject = (isDemo ? mail.demoSubject : mail.questionSubject).replace('{name}', value('name'));
    const lines = [
      `${mail.labels.name}: ${value('name')}`,
      `${mail.labels.email}: ${value('email')}`,
      `${mail.labels.role}: ${value('role')}`,
    ];
    if (value('organization')) lines.push(`${mail.labels.org}: ${value('organization')}`);
    if (isDemo && value('athletes')) lines.push(`${mail.labels.athletes}: ${value('athletes')}`);
    if (value('message')) lines.push('', value('message'));

    const href = `mailto:${mail.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\r\n'))}`;
    if (status) status.textContent = mail.opening.replace('{email}', mail.to);
    window.location.href = href;
  });
}

document.querySelectorAll<HTMLFormElement>('[data-contact-form]').forEach(init);

export {};
