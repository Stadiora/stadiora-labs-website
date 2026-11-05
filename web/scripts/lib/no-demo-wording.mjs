// No demo or preview wording anywhere in the shipped site (owner rule, R57). Walks every file in dist/ after the build and
// fails, naming the file and the match, when it finds (case-insensitive) `demo`, `demostraci`, `preview`, `vista previa` or
// `[preview]` in: the <title>, meta/OG/Twitter tags, visible text, sr-only text, any attribute value (aria-label, alt, title,
// href, src, id, class, data-*), JSON-LD, sitemap/robots/XML/txt, CSS, client JS, or any FILE NAME. The raw text of each
// file is scanned, so nothing a reader, a crawler or someone viewing the page source can see is skipped.
// Only these whole unrelated words are tolerated: `demonstrated` (legal text), `demostrar`, `demostrado`, `demostró`.
// `demonstration`, `demonstrate` and `demostración` are NOT tolerated.
// NOT COVERED: exemptions match one exact contiguous block, not proven data flow; runtime composition such as String.fromCharCode is unseen.
// Run alone: `node scripts/lib/no-demo-wording.mjs [distDir]`.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanTags } from './html-scan.mjs';

const BANNED = /\[preview\]|vista previa|preview|demostraci|demo/gi;
const LEGAL_WORDS = /(?<![\p{L}\p{N}_])(?:demonstrated|demostrar|demostrado|demostró)(?![\p{L}\p{N}_])/giu;

// Pin contiguous wire/request blocks, not detached statements. Compiler changes must deliberately update these expectations.
// The contact serializer precedes its caller, so its block spans both; the legacy alias entry stays unchanged.
const contactSites = [
  { name: 'contact legacy alias', statement: 'var e={demo:`call`},t=/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/,n=15e3;', request: 'b=e[y]??y,x=p.find(e=>e.value===b)' },
  {
    name: 'contact POST body',
    statement: 'async function r(e,t){let r=new AbortController,i=window.setTimeout(()=>r.abort(),n);try{let n=await fetch(e,{method:`POST`,headers:{"Content-Type":`application/json`},credentials:`omit`,body:JSON.stringify(t),signal:r.signal});return n.status===202?`ok`:n.status===400?`invalid`:n.status===429?`limited`:`unavailable`}catch{return`unavailable`}finally{window.clearTimeout(i)}}function i(n){let i=JSON.parse(n.dataset.send??`{}`),a=n.dataset.endpoint??``,o=n.dataset.locale===`es`?`es`:`en`,s=n.querySelector(`button[type="submit"]`),c=n.querySelector(`template[data-fallback]`),l=n.querySelector(`[data-status]`),u=Date.now(),d=!1,f=n.querySelector(`[data-call-only]`),p=Array.from(n.querySelectorAll(`input[name="topic"]`)),m=e=>n.elements.namedItem(e),h=()=>p.find(e=>e.checked)?.value===`question`?`question`:`call`;n.noValidate=!0;let g=()=>{l&&(l.removeAttribute(`data-state`),l.textContent=``)},_=(e,t,n=!1)=>{if(!l)return;let r=document.createElement(`span`);r.className=`form__msg`,r.textContent=t,n&&c&&r.append(` `,c.content.cloneNode(!0)),l.dataset.state=e,l.replaceChildren(r)},v=()=>{let e=h()===`call`;f&&(f.hidden=!e,m(`athletes`).disabled=!e)},y=new URLSearchParams(window.location.search).get(`topic`)??``,b=e[y]??y,x=p.find(e=>e.value===b);x&&(x.checked=!0),v(),p.forEach(e=>e.addEventListener(`change`,()=>{v();let e=new URL(window.location.href);e.searchParams.set(`topic`,h()),window.history.replaceState(null,``,e),g()}));let S=(e,t)=>{let r=m(e),i=n.querySelector(`#e-${e}`);i&&(i.hidden=!t,i.textContent=t??``,t?r.setAttribute(`aria-invalid`,`true`):r.removeAttribute(`aria-invalid`))};[`name`,`email`,`role`].forEach(e=>{m(e).addEventListener(`input`,()=>S(e,null)),m(e).addEventListener(`change`,()=>S(e,null))});let C=()=>{let e=[[`name`,m(`name`).value.trim().length>0,n.dataset.errName],[`email`,t.test(m(`email`).value.trim()),n.dataset.errEmail],[`role`,m(`role`).value!==``,n.dataset.errRole]],r=null;for(let[t,n,i]of e)S(t,n?null:i??``),!n&&!r&&(r=t);return r};n.addEventListener(`submit`,async e=>{if(e.preventDefault(),d)return;g();let t=C();if(t){m(t).focus();return}let c=e=>m(e).value.trim(),l=h()===`call`;d=!0,s&&(s.disabled=!0),n.setAttribute(`aria-busy`,`true`),_(`busy`,i.busy);let f=3250-(Date.now()-u);f>0&&await new Promise(e=>window.setTimeout(e,f));let y={topic:l?`demo`:`question`,name:c(`name`),email:c(`email`),role:c(`role`),message:c(`message`),locale:o,page:window.location.pathname,website:m(`website`).value,startedAt:u};c(`organization`)&&(y.organization=c(`organization`)),l&&c(`athletes`)&&(y.athletes=c(`athletes`));let b=await r(a,y);',
    request: 'let b=await r(a,y);',
  },
];
const leadSite = (locale) => ({
  name: 'lead POST body',
  statement: `const body = {
    topic: 'demo',
    name: 'Early access request',
    email: email,
    role: path.startsWith('coach') ? 'coach' : 'athlete',
    organization: label,
    message: ${locale === 'en' ? '`Early access request from the readiness check.\\nProduct interest: ${label}`' : '`Solicitud de acceso anticipado desde la evaluación.\\nProducto de interés: ${label}`'},
    locale: LOCALE,
    page: window.location.pathname,
    website: honeypot.value,
    startedAt: OPENED_AT
  };

  // A post less than 3 s after the page opened would be rejected as too fast, so wait out the rest.
  const wait = MIN_FILL_MS + 250 - (Date.now() - OPENED_AT);
  let timer;
  new Promise(resolve => setTimeout(resolve, Math.max(0, wait)))
    .then(() => {
      const abort = new AbortController();
      timer = setTimeout(() => abort.abort(), 15000);
      return fetch(CONTACT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify(body)`,
  request: "fetch(CONTACT_API, {\n        method: 'POST',",
});
const expectedSites = new Map([
  ['contact/index.html', contactSites],
  ['es/contact/index.html', contactSites],
  ['lead-magnet.html', [leadSite('en')]],
  ['lead-magnet-es.html', [leadSite('es')]],
]);

const wordingMatches = (text) => {
  const legalAt = new Set([...text.matchAll(LEGAL_WORDS)].map((m) => m.index));
  return [...text.matchAll(BANNED)].filter((m) => !legalAt.has(m.index));
};

const isBinary = (buf) => buf.subarray(0, 4096).includes(0);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;
const snippet = (text, index, length) => {
  const from = Math.max(0, index - 30);
  return text.slice(from, index + length + 30).replace(/\s+/g, ' ').trim();
};

/** Every problem in a dist/ tree as `{ file, where, match, context }`, and how many allowlisted matches were used. */
export function scanDist(dist) {
  const root = resolve(dist);
  const problems = [];
  const seenFiles = new Set();
  let allowedUsed = 0;
  for (const path of walk(root)) {
    const rel = relative(root, path).split(sep).join('/');
    for (const m of wordingMatches(rel)) problems.push({ file: rel, where: 'file name', match: m[0], context: rel });
    const buf = readFileSync(path);
    if (isBinary(buf)) continue;
    const text = buf.toString('utf8');
    const allowedAt = new Set();
    const sites = expectedSites.get(rel);
    if (sites) {
      seenFiles.add(rel);
      const scripts = scanTags(text).filter((tag) => tag.name === 'script' && !('src' in tag.attrs));
      for (const site of sites) {
        const hits = [];
        for (const tag of scripts) {
          const script = text.slice(tag.contentStart, tag.contentEnd);
          const contact = rel.endsWith('contact/index.html');
          const requestSite = contact
            ? tag.attrs.type === 'module' && script.includes('a=n.dataset.endpoint??``') && script.includes('fetch(e,{method:`POST`') && script.includes('document.querySelectorAll(`[data-contact-form]`)') && text.includes('data-endpoint="https://api.runwitharia.com/api/public/website-contact"')
            : script.includes("const CONTACT_API = 'https://api.runwitharia.com/api/public/website-contact';") && script.includes('body: JSON.stringify(body)');
          if (!requestSite || !script.includes(site.request)) continue;
          for (let at = script.indexOf(site.statement); at !== -1; at = script.indexOf(site.statement, at + site.statement.length)) {
            hits.push(tag.contentStart + at + site.statement.indexOf('demo'));
          }
        }
        const occurrences = text.split(site.statement).length - 1;
        if (hits.length === 1 && occurrences === 1) allowedAt.add(hits[0]);
        else problems.push({ file: rel, where: site.name, match: site.name, context: `expected exactly 1 designated block, found ${occurrences} in file / ${hits.length} in request script` });
      }
    }
    for (const m of wordingMatches(text)) {
      if (allowedAt.has(m.index)) {
        allowedUsed++;
        continue;
      }
      problems.push({ file: rel, where: `line ${lineOf(text, m.index)}`, match: m[0], context: snippet(text, m.index, m[0].length) });
    }
  }
  for (const [file, sites] of expectedSites) {
    if (!seenFiles.has(file)) for (const site of sites) problems.push({ file, where: site.name, match: site.name, context: 'missing expected file/site' });
  }
  return { problems, allowedUsed };
}

export function verifyNoDemoWording({ dist, fail }) {
  const { problems } = scanDist(dist);
  for (const p of problems) fail(`no-demo-wording: ${p.file} (${p.where}): "${p.match}" in "${p.context}"`);
  return problems.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dist = process.argv[2] ?? fileURLToPath(new URL('../../dist/', import.meta.url));
  const { problems, allowedUsed } = scanDist(dist);
  for (const p of problems) console.error(`no-demo-wording: ${p.file} (${p.where}): "${p.match}" in "${p.context}"`);
  if (problems.length) {
    console.error(`no-demo-wording: ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
    process.exit(1);
  }
  console.log(`no-demo-wording: ok (${allowedUsed} allowlisted match${allowedUsed === 1 ? '' : 'es'})`);
}
