// Browser checks for the Contact page forms (EN and ES), with the live endpoint intercepted: nothing here sends real email.
// Called from evidence.mjs after the solutions checks, and alone with `node scripts/evidence.mjs --contact-only`.
// The rules these checks protect:
//   - success is shown only when the endpoint answers exactly 202; every other answer is a failure with the direct contacts;
//   - the honeypot ("website") and startedAt are always sent, and startedAt is at least 3 s older than the post;
//   - an invalid form posts nothing; ?topic=question preselects and posts the question topic;
//   - the burst is decoration and fires only after a 202; the sent text is exactly the approved one.
import { approvedSuccess, contactHrefs, findDeliveryClaims, roles } from './contact-contract.mjs';
import { interceptContact, postProblems } from './contact-route.mjs';

const localized = (locale, path) => (locale === 'es' ? `/es${path}` : path);

export async function contactChecks({ open, settle: settleRaw, check, sleep, shotsDir }) {
  // settle() ends with a smooth scrollTo(0, 0); finish at the top before measuring.
  const settle = async (page) => {
    await settleRaw(page);
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
    await page.waitForFunction(() => window.scrollY === 0);
  };

  // ---------------------------------------------------------- contact: topic, validation, the endpoint, no fake success
  for (const locale of ['en', 'es']) {
    const base = localized(locale, '/contact/');
    const submitButton = '#contact-form button[type="submit"]';
    const statusOf = (page) => page.evaluate(() => ({ state: document.querySelector('[data-status]').dataset.state ?? '', text: document.querySelector('[data-status]').textContent.trim(), links: [...document.querySelectorAll('[data-status] a')].map((a) => a.getAttribute('href')) }));

    const topic = await open({ width: 1440, height: 900, reduced: true }, `${base}?topic=question`);
    const qState = await topic.evaluate(() => ({
      question: document.querySelector('#topic-question').checked,
      athletesDisabled: document.querySelector('#f-athletes').disabled,
      demoOnlyHidden: document.querySelector('[data-demo-only]').hidden,
    }));
    await topic.locator('#topic-demo').check();
    const dState = await topic.evaluate(() => ({ demo: document.querySelector('#topic-demo').checked, athletesDisabled: document.querySelector('#f-athletes').disabled, url: location.search }));
    check('solutions-contact', `${locale} contact: ?topic=question preselects the question topic and hides the athletes field; switching back restores it`, qState.question && qState.athletesDisabled && qState.demoOnlyHidden && dState.demo && !dState.athletesDisabled && /topic=demo/.test(dState.url), JSON.stringify({ qState, dState }));
    await topic.context().close();

    // Validation: nothing is posted for an invalid form.
    const page = await open({ width: 1440, height: 900, reduced: true }, base);
    await settle(page);
    const posts = await interceptContact(page, new URL(page.url()).origin, (_, n) => [400, 429, 503, 500, 200, 'abort', 202][n - 1] ?? 202);
    await page.locator(submitButton).click();
    const errors = await page.evaluate(() => ({
      shown: ['e-name', 'e-email', 'e-role'].map((id) => {
        const e = document.getElementById(id);
        return !e.hidden && e.textContent.trim().length > 3;
      }),
      focused: document.activeElement?.id,
      invalid: ['f-name', 'f-email', 'f-role'].map((id) => document.getElementById(id).getAttribute('aria-invalid')),
      status: document.querySelector('[data-status]').textContent.trim(),
    }));
    await sleep(400);
    check('solutions-contact', `${locale} contact: empty submit shows three field errors tied by aria-describedby, focuses the first, posts nothing and shows no status`, errors.shown.every(Boolean) && errors.focused === 'f-name' && errors.invalid.every((v) => v === 'true') && posts.length === 0 && errors.status === '', JSON.stringify({ errors, posts: posts.length }));
    await page.screenshot({ path: `${shotsDir}interaction-contact-errors-${locale}.jpg`, type: 'jpeg', quality: 82 });

    await page.fill('#f-name', 'Ana López');
    await page.fill('#f-email', 'not-an-email');
    await page.selectOption('#f-role', { index: 1 });
    await page.locator(submitButton).click();
    await sleep(400);
    const badEmail = await page.evaluate(() => ({ email: !document.getElementById('e-email').hidden, name: document.getElementById('e-name').hidden, focused: document.activeElement?.id, status: document.querySelector('[data-status]').textContent.trim() }));
    check('solutions-contact', `${locale} contact: an invalid email is rejected on its own, posts nothing and shows no status`, badEmail.email && badEmail.name && badEmail.focused === 'f-email' && posts.length === 0 && badEmail.status === '', JSON.stringify({ badEmail, posts: posts.length }));

    // Every outcome that is not a 202, on this one page: the first post waits out the 3 s fill time, the rest go at once.
    await page.fill('#f-email', 'ana@escuela.example');
    await page.fill('#f-org', 'Colegio Norte');
    await page.fill('#f-message', 'Quiero una demo para 3 equipos.');
    const outcomes = [['HTTP 400', 400], ['HTTP 429', 429], ['HTTP 503', 503], ['HTTP 500', 500], ['HTTP 200', 200], ['a dropped connection', 'abort']];
    const seen = {};
    for (const [label, outcome] of outcomes) {
      await page.locator(submitButton).click();
      await page.locator(`${submitButton}:enabled`).waitFor({ timeout: 8000 }).catch(() => {});
      await page.locator('[data-status][data-state="fail"]').waitFor({ timeout: 2000 }).catch(() => {});
      const st = await statusOf(page);
      seen[outcome] = st.text;
      const kept = await page.evaluate(() => ({ name: document.getElementById('f-name').value, message: document.getElementById('f-message').value }));
      check(
        'solutions-contact',
        `${locale} contact: ${label} is a failure, never a success: a plain message, the direct contacts, the form kept`,
        st.state === 'fail' && st.text.length > 20 && findDeliveryClaims(st.text, locale).length === 0 && st.text !== approvedSuccess[locale] && contactHrefs.filter((h) => !h.startsWith('tel:')).every((h) => st.links.includes(h)) && kept.name === 'Ana López' && /3 equipos/.test(kept.message),
        JSON.stringify({ st, kept }),
      );
      if (label === 'HTTP 503') await page.screenshot({ path: `${shotsDir}interaction-contact-error-${locale}.jpg`, type: 'jpeg', quality: 82 });
    }
    check('solutions-contact', `${locale} contact: a 400, a 429 and a 503 each get their own message`, new Set([seen[400], seen[429], seen[503]]).size === 3, JSON.stringify([seen[400], seen[429], seen[503]]));
    check('solutions-contact', `${locale} contact: a 500, a 200 and a dropped connection read as "unavailable", like the 503`, [500, 200, 'abort'].every((o) => seen[o] === seen[503]));

    // The 202 comes last: only now does the page say the message was sent, in exactly the approved words.
    await page.locator(submitButton).click();
    await page.locator('[data-status][data-state="ok"]').waitFor({ timeout: 4000 }).catch(() => {});
    const ok = await statusOf(page);
    check('solutions-contact', `${locale} contact: HTTP 202 shows exactly the approved sent message, and that message appears nowhere before it`, posts.length === 7 && ok.state === 'ok' && ok.text === approvedSuccess[locale] && Object.values(seen).every((t) => !t.includes(approvedSuccess[locale])), JSON.stringify({ ok, posts: posts.length }));
    check(
      'solutions-contact',
      `${locale} contact: every post carries the honeypot, a startedAt at least 3 s old and only contract fields; role is an endpoint role; athletes is left out when unset`,
      posts.length === 7 && posts.every((p) => postProblems(p, { topic: 'demo', locale, email: 'ana@escuela.example', organization: 'Colegio Norte', name: 'Ana López', page: new URL(page.url()).pathname }).length === 0 && roles.includes(p.body.role) && !('athletes' in p.body)),
      posts.map((p) => postProblems(p).join('; ')).find(Boolean) ?? JSON.stringify(posts[0]?.body),
    );
    await page.screenshot({ path: `${shotsDir}interaction-contact-success-${locale}.jpg`, type: 'jpeg', quality: 82 });
    const claims = findDeliveryClaims(await page.evaluate(() => document.body.innerText), locale);
    check('solutions-contact', `${locale} contact: after the 202 the page claims no receipt or reply time beyond the approved sentence`, claims.length === 0, JSON.stringify({ claims }));
    await page.context().close();

    // The question topic posts as a question, and the athletes range travels when the demo form has one.
    const q = await open({ width: 1440, height: 900, reduced: true }, `${base}?topic=question`);
    const qPosts = await interceptContact(q, new URL(q.url()).origin, () => 202);
    await q.fill('#f-name', 'Ana López');
    await q.fill('#f-email', 'ana@escuela.example');
    await q.selectOption('#f-role', { index: 1 });
    await q.locator(submitButton).click();
    await q.locator('[data-status][data-state="ok"]').waitFor({ timeout: 6000 }).catch(() => {});
    check('solutions-contact', `${locale} contact: ?topic=question posts topic "question" with no athletes range`, qPosts.length === 1 && postProblems(qPosts[0], { topic: 'question', locale }).length === 0 && !('athletes' in qPosts[0].body), JSON.stringify(qPosts[0]?.body));
    await q.context().close();

    const d = await open({ width: 1440, height: 900, reduced: true }, base);
    const dPosts = await interceptContact(d, new URL(d.url()).origin, () => 202);
    await d.fill('#f-name', 'Ana López');
    await d.fill('#f-email', 'ana@escuela.example');
    await d.selectOption('#f-role', 'school-admin');
    await d.selectOption('#f-athletes', '26-100');
    await d.locator(submitButton).click();
    await d.locator('[data-status][data-state="ok"]').waitFor({ timeout: 6000 }).catch(() => {});
    check('solutions-contact', `${locale} contact: the demo form posts the chosen role and athletes range as endpoint values`, dPosts.length === 1 && postProblems(dPosts[0], { topic: 'demo', locale, role: 'school-admin', athletes: '26-100' }).length === 0, JSON.stringify(dPosts[0]?.body));
    await d.context().close();
  }

  // ---------------------------------------------------------- contact: spring thumb, burst, honest status
  for (const locale of ['en', 'es']) {
    const path = localized(locale, '/contact/');
    const thumb = (page) => page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.seg'), '::after').transform).m41);
    const fill = async (page) => {
      await page.fill('#f-name', 'Ana López');
      await page.fill('#f-email', 'ana@escuela.example');
      await page.selectOption('#f-role', { index: 1 });
      await page.locator('#contact-form button[type="submit"]').click();
    };
    const burstState = (page) =>
      page.evaluate(() => {
        const b = document.querySelector('.sx-burst');
        const dot = b?.querySelector('i');
        return {
          go: b?.classList.contains('go'),
          anim: dot ? getComputedStyle(dot).animationName : '',
          text: b?.textContent.trim(),
          hidden: b?.getAttribute('aria-hidden') === 'true',
          state: document.querySelector('[data-status]').dataset.state ?? '',
          status: document.querySelector('[data-status]').textContent.trim(),
        };
      });
    const answer = (code) => async (page) => {
      await interceptContact(page, new URL(page.url()).origin, () => code);
    };

    const mo = await open({ width: 1440, height: 900 }, path);
    await settle(mo);
    await answer(202)(mo);
    const t0 = await thumb(mo);
    await mo.locator('#topic-question').check();
    await sleep(900);
    const t1 = await thumb(mo);
    await mo.locator('#topic-demo').check();
    await sleep(900);
    const t2 = await thumb(mo);
    check('solutions-floodlight', `${locale} contact: the topic thumb glides to the second option and back`, Math.abs(t0) < 1 && t1 > 40 && Math.abs(t2) < 1, JSON.stringify({ t0, t1, t2 }));

    await fill(mo);
    await mo.locator('[data-status][data-state="ok"]').waitFor({ timeout: 6000 }).catch(() => {});
    await sleep(250);
    const burst = await burstState(mo);
    check(
      'solutions-floodlight',
      `${locale} contact: a 202 bursts the dots, the burst carries no words and the status is exactly the approved text`,
      burst.go && burst.anim === 'sxBurst' && burst.text === '' && burst.hidden && burst.status === approvedSuccess[locale],
      JSON.stringify({ burst, expected: approvedSuccess[locale] }),
    );
    await mo.context().close();

    // A failed send is not a celebration: no burst for a 503, a 429 or a dropped connection.
    const failed = await open({ width: 1440, height: 900 }, path);
    await settle(failed);
    let n = 0;
    await interceptContact(failed, new URL(failed.url()).origin, () => [503, 429, 'abort'][n++]);
    await fill(failed);
    const sawBurst = [];
    for (let i = 0; i < 3; i++) {
      if (i) await failed.locator('#contact-form button[type="submit"]').click();
      await failed.locator('#contact-form button[type="submit"]:enabled').waitFor({ timeout: 8000 }).catch(() => {});
      await failed.locator('[data-status][data-state="fail"]').waitFor({ timeout: 2000 }).catch(() => {});
      await sleep(250);
      sawBurst.push(await burstState(failed));
    }
    check('solutions-floodlight', `${locale} contact: a 503, a 429 and a dropped connection never burst and never show the approved sent text`, sawBurst.every((b) => !b.go && b.state === 'fail' && b.status !== approvedSuccess[locale]), JSON.stringify(sawBurst));
    await failed.context().close();

    const rm = await open({ width: 1440, height: 900, reduced: true }, path);
    await settle(rm);
    await answer(202)(rm);
    await fill(rm);
    await rm.locator('[data-status][data-state="ok"]').waitFor({ timeout: 6000 }).catch(() => {});
    await sleep(250);
    const rmBurst = await burstState(rm);
    check('solutions-floodlight', `${locale} contact: under reduced motion there is no burst and the status still shows`, !rmBurst.go && rmBurst.status === approvedSuccess[locale], JSON.stringify(rmBurst));
    await rm.context().close();

    // An invalid submit must not burst: nothing was sent.
    const bad = await open({ width: 1440, height: 900 }, path);
    await settle(bad);
    const badPosts = await interceptContact(bad, new URL(bad.url()).origin, () => 202);
    await bad.locator('#contact-form button[type="submit"]').click();
    await sleep(400);
    const badBurst = await bad.evaluate(() => ({ go: document.querySelector('.sx-burst').classList.contains('go'), status: document.querySelector('[data-status]').textContent.trim() }));
    check('solutions-floodlight', `${locale} contact: an invalid submit does not burst, posts nothing and shows no status`, !badBurst.go && badBurst.status === '' && badPosts.length === 0, JSON.stringify({ badBurst, posts: badPosts.length }));
    await bad.context().close();
  }

}
