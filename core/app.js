/* Общая логика обоих вариантов: шапка и подвал, блоки страниц, конструктор заказа, чат, подбор пакета. */
(() => {
  const D = window.SITE, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rub = n => n.toLocaleString('ru-RU').replace(/\s/g, ' ') + ' ₽';
  const page = document.body.dataset.page || 'index';
  const tgLink = (nick, text) => `https://t.me/${nick}` + (text ? `?text=${encodeURIComponent(text)}` : '');
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  /* если страницу открыли как файл с диска, 3D не запустится: подсказываем правильный адрес */
  if (location.protocol === 'file:') {
    const m = location.pathname.match(/\/(a|b)\/([\w-]+\.html)?$/), url = 'http://localhost:4195/' + (m ? m[1] + '/' + (m[2] || '') : '');
    const b = el('a', '', 'Страница открыта как файл, поэтому часть функций не работает. Нажмите, чтобы открыть правильно: ' + url);
    b.href = url; b.style.cssText = 'position:fixed;inset:0 0 auto 0;z-index:999;padding:14px 18px;background:#FFD84D;color:#111;font:600 15px/1.4 system-ui,sans-serif;text-align:center';
    document.body.appendChild(b);
  }

  /* ── отправка заявки: в обработчик, а если его нет — в Telegram с готовым текстом ── */
  async function send(kind, text) {
    if (D.cfg.endpoint) {
      try { const r = await fetch(D.cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, text, page: location.pathname }) }); if (r.ok) return 'sent'; } catch (e) {}
    }
    window.open(tgLink(D.cfg.tg, text), '_blank', 'noopener');
    return 'tg';
  }
  const sentNote = how => how === 'sent' ? 'Заявка у нас. Ответим в течение дня.' : 'Открылся Telegram с готовым текстом — нажмите там «Отправить». Если не открылся, напишите нам: @' + D.cfg.tg;

  /* ── шапка, меню, подвал ── */
  const NAV = [['works', 'Работы'], ['price', 'Цены'], ['bots', 'Боты'], ['about', 'О нас']];
  function shell() {
    const links = NAV.map(([p, t]) => `<a href="${p}.html"${p === page ? ' aria-current="page"' : ''}>${t}</a>`).join('');
    const top = el('header', 'top', `<a class="name" href="index.html" aria-label="Кирилл и Даня — на главную"><b class="g">К&amp;Д</b><span>Кирилл и Даня</span></a>
      <nav aria-label="Разделы">${links}</nav>
      <a class="btn btn-main" href="order.html">Собрать заказ</a>
      <button class="burger" type="button" aria-label="Открыть меню" aria-expanded="false"><i></i><i></i></button>`);
    const menu = el('div', 'menu', `<nav aria-label="Меню"><a href="index.html">Главная</a>${links}<a href="order.html">Собрать заказ</a></nav>
      <p><a href="${tgLink(D.cfg.tg)}" target="_blank" rel="noopener">Telegram: @${D.cfg.tg}</a></p>`);
    menu.hidden = true;
    document.body.prepend(menu); document.body.prepend(top);
    const burger = $('.burger', top);
    burger.addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; burger.setAttribute('aria-expanded', open); document.body.classList.toggle('menu-open', open); });

    const foot = el('footer', 'foot', `<div class="wrap">
      <div class="foot-top">
        <div><a class="name" href="index.html"><b class="g">К&amp;Д</b><span>Кирилл и Даня</span></a><p>Сайты и Telegram-боты для бизнеса. Самозанятые, работаем с чеком.</p></div>
        <nav aria-label="Страницы">${links}<a href="order.html">Собрать заказ</a></nav>
        <nav aria-label="Контакты"><a href="${tgLink(D.cfg.tg)}" target="_blank" rel="noopener">Telegram Кирилла</a><a href="${tgLink(D.cfg.tg2)}" target="_blank" rel="noopener">Telegram Дани</a><a href="mailto:${D.cfg.mail}">${D.cfg.mail}</a></nav>
      </div>
      <p class="fine">Работы с пометкой «Концепт» сделаны по нашей инициативе; права на названия и фотографии принадлежат их владельцам. Отправляя заявку, вы соглашаетесь на то, что мы используем ваш контакт только для ответа на неё.</p>
    </div>`);
    document.body.appendChild(foot);

    /* чат */
    const fab = el('button', 'chat-fab', '<i></i>Написать'); fab.type = 'button'; fab.setAttribute('aria-expanded', 'false');
    const chat = el('section', 'chat', `<div class="chat-head"><div><b>Кирилл и Даня</b><span>отвечаем в течение дня</span></div><button type="button" class="chat-x" aria-label="Закрыть чат">×</button></div>
      <div class="chat-body"><p class="bub">Здравствуйте! Напишите, что вам нужно, — ответим в Telegram или по телефону.</p>
        <div class="quick"><button type="button">Хочу сайт, с чего начать?</button><button type="button">Сколько стоит?</button><button type="button">Нужен бот</button></div></div>
      <form class="chat-form" novalidate>
        <label><span>Сообщение</span><textarea name="msg" rows="3" required></textarea></label>
        <label><span>Ваш Telegram или телефон</span><input name="contact" type="text" autocomplete="tel" required></label>
        <button class="btn btn-main" type="submit">Отправить</button>
        <p class="note" role="status"></p>
        <a class="direct" href="${tgLink(D.cfg.tg)}" target="_blank" rel="noopener">Или сразу в Telegram</a>
      </form>`);
    chat.hidden = true; chat.setAttribute('aria-label', 'Чат с нами');
    document.body.append(fab, chat);
    const toggle = open => { chat.hidden = !open; fab.setAttribute('aria-expanded', open); if (open) $('textarea', chat).focus(); };
    fab.addEventListener('click', () => toggle(chat.hidden)); $('.chat-x', chat).addEventListener('click', () => toggle(false));
    $$('.quick button', chat).forEach(b => b.addEventListener('click', () => { const t = $('textarea', chat); t.value = b.textContent; t.focus(); }));
    $('form', chat).addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target, note = $('.note', f), msg = f.msg.value.trim(), c = f.contact.value.trim();
      if (!msg || !c) { note.textContent = !msg ? 'Напишите сообщение.' : 'Оставьте Telegram или телефон, чтобы мы могли ответить.'; (!msg ? f.msg : f.contact).focus(); return; }
      note.textContent = 'Отправляем…';
      note.textContent = sentNote(await send('chat', `Сообщение с сайта\n${msg}\nКонтакт: ${c}`));
      if (D.cfg.endpoint) f.reset();
    });
    document.querySelectorAll('[data-chat]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); toggle(true); }));
  }

  /* ── блоки страниц ── */
  const kindLabel = k => k === 'client' ? 'Клиент' : 'Концепт';
  const head = (h, p) => `<div class="head rise"><h2>${h}</h2>${p ? `<p class="lead">${p}</p>` : ''}</div>`;
  const B = {};

  B.plans = box => {
    box.innerHTML = `<div class="plans">${D.plans.map(p => `<article class="plan glass card rise spot${p.hit ? ' hit' : ''}">
      <p class="tagline${p.hit ? ' g' : ''}">${p.hit ? 'Берут чаще всего' : ''}</p><h3>${p.name}</h3><p class="for">${p.for}</p>
      <p class="sum"><small>от</small>${rub(p.price)}</p><p class="days">${p.days}</p>
      <ul>${p.list.map(l => `<li>${l}</li>`).join('')}</ul>
      <p class="eg">Пример: <a href="${p.eg[1]}" target="_blank" rel="noopener">${p.eg[0]}</a></p>
      <a class="btn${p.hit ? ' btn-main' : ''}" href="order.html?p=${p.id}">Собрать заказ</a></article>`).join('')}</div>`;
  };
  B.compare = box => {
    const cell = v => v === 1 ? '<td class="y">Да</td>' : v === 0 ? '<td class="n">—</td>' : `<td>${v}</td>`;
    box.innerHTML = `<div class="cmp-open"><button class="btn" type="button" aria-expanded="false">Сравнить пакеты подробно</button></div>
      <div class="cmp glass card" hidden><div class="cmp-scroll"><table><thead><tr><th scope="col"></th>${D.plans.map(p => `<th scope="col">${p.name}</th>`).join('')}</tr></thead>
      <tbody>${D.compare.map(r => `<tr><th scope="row">${r[0]}</th>${r.slice(1).map(cell).join('')}</tr>`).join('')}</tbody></table></div></div>`;
    const btn = $('button', box), t = $('.cmp', box);
    btn.addEventListener('click', () => { const o = t.hidden; t.hidden = !o; btn.setAttribute('aria-expanded', o); btn.textContent = o ? 'Свернуть сравнение' : 'Сравнить пакеты подробно'; });
  };
  B.services = box => { box.innerHTML = `<div class="svc">${D.services.map(([h, rows]) => `<div class="svc-box glass card rise spot"><h3>${h}</h3><dl>${rows.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl></div>`).join('')}</div>`; };
  B.bots = box => { box.innerHTML = `<div class="bots">${D.bots.map(([h, p, l], i) => `<article class="bot glass card rise spot"><div class="ico" aria-hidden="true">${i + 1}</div><h3>${h}</h3><p>${p}</p><ul>${l.map(x => `<li>${x}</li>`).join('')}</ul></article>`).join('')}</div>`; };
  B.cases = box => {
    box.innerHTML = `<div class="cases">${D.cases.map(c => `<article class="case glass card rise spot"><div class="pic"><img src="../assets/shots/${c.img}.jpg" alt="Сайт «${c.name}»" loading="lazy" width="1000" height="500"></div>
      <div class="txt"><h3>${c.name} <span class="kind client">${c.kind}</span></h3><p>${c.say}</p><dl>${c.rows.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl>
      <a class="more" href="${c.url}" target="_blank" rel="noopener">${c.link || 'Открыть сайт'}</a></div></article>`).join('')}</div>`;
  };
  B.steps = box => {
    box.innerHTML = `<div class="track" aria-hidden="true"><i></i></div><ol class="steps">${D.steps.map(([h, p, t]) => `<li class="glass card"><h3>${h}</h3><p>${p}</p><time>${t}</time></li>`).join('')}</ol>
      <div class="need glass card rise"><h3>Что нужно от вас</h3><ul>${D.need.map(n => `<li>${n}</li>`).join('')}</ul></div>`;
    const ol = $('.steps', box), track = $('.track', box), li = [...ol.children];
    const tick = () => { const s = ol.getBoundingClientRect(), vh = innerHeight, sp = reduce ? 1 : Math.min(1, Math.max(0, (vh * .82 - s.top) / (vh * .5 + s.height * .4)));
      track.style.setProperty('--sp', sp.toFixed(3)); li.forEach((x, i) => x.classList.toggle('on', sp >= (i + .35) / li.length)); };
    addEventListener('scroll', tick, { passive: true }); tick();
  };
  B.ways = box => {
    const w = D.ways, me = i => i === w.me ? ' class="me"' : '';
    box.innerHTML = `<div class="cmp glass card ways rise"><div class="cmp-scroll"><table><thead><tr><th scope="col"></th>${w.head.map((h, i) => `<th scope="col"${me(i)}>${h}</th>`).join('')}</tr></thead>
      <tbody>${w.rows.map(r => `<tr><th scope="row">${r[0]}</th>${r.slice(1).map((c, i) => `<td${me(i)}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  };
  B.open = box => {
    box.innerHTML = `<div class="bento">${D.open.map(t => `<article class="tile t${t.w} glass card rise spot"><p class="big${t.g ? ' g' : ''}">${t.big}</p><h3>${t.h}</h3><p>${t.p}</p></article>`).join('')}
      <article class="tile t6 ai glass card rise spot"><h3 class="h">Да, мы работаем с ИИ. Поэтому быстро и недорого.</h3>
      <div><h4>Делает ИИ</h4><ul><li>Пишет код страниц по нашему макету</li><li>Собирает черновики текстов из ваших соцсетей</li><li>Проверяет вёрстку на десятках экранов</li></ul></div>
      <div><h4>Делаем мы</h4><ul><li>Придумываем идею и стиль под ваше дело</li><li>Проверяем каждый факт, цену и фото</li><li>Листаем сайт руками на телефоне перед показом</li></ul></div></article></div>`;
  };
  B.hood = box => { box.innerHTML = `<div class="hood">${D.hood.map(([h, p]) => `<article class="tile glass card rise spot"><h3>${h}</h3><p>${p}</p></article>`).join('')}</div>`; };
  B.faq = box => {
    const n = +box.dataset.limit || D.faq.length, list = D.faq.slice(0, n), half = Math.ceil(list.length / 2);
    const col = a => `<div>${a.map(([q, t], i) => `<details${a === list.slice(0, half) && i === 0 ? ' open' : ''}><summary>${q}</summary><p>${t}</p></details>`).join('')}</div>`;
    const a1 = list.slice(0, half), a2 = list.slice(half);
    box.innerHTML = `<div class="acc rise"><div>${a1.map(([q, t], i) => `<details${i === 0 ? ' open' : ''}><summary>${q}</summary><p>${t}</p></details>`).join('')}</div><div>${a2.map(([q, t]) => `<details><summary>${q}</summary><p>${t}</p></details>`).join('')}</div></div>`;
  };
  B.stats = box => {
    const S = [[700, '+', 'сайтов и концептов собрали'], [24, ' ч', 'до первого экрана вашего сайта'], [0, ' ₽', 'пока не увидели демо'], [2, '', 'человека, без менеджеров']];
    box.innerHTML = `<dl class="stats">${S.map(([n, u, t]) => `<div class="rise"><dt><b data-n="${n}">${reduce ? n : 0}</b>${u}</dt><dd>${t}</dd></div>`).join('')}</dl>`;
    if (reduce) return;
    const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; io.unobserve(e.target);
      const b = e.target, to = +b.dataset.n, t0 = performance.now(); (function f(now) { const k = Math.min(1, (now - t0) / 1100), v = Math.round(to * (1 - Math.pow(1 - k, 3))); b.textContent = v; if (k < 1) requestAnimationFrame(f); })(t0); }));
    $$('b[data-n]', box).forEach(b => io.observe(b));
  };

  /* мы вдвоём */
  B.duo = box => {
    box.innerHTML = `<div class="duo glass card rise">
      <div class="duo-faces" aria-hidden="true"><span class="ring"></span>
        <img src="../assets/team/kirill.jpg" alt="" width="320" height="320"><img src="../assets/team/danya.jpg" alt="" width="320" height="320"></div>
      <div class="duo-txt">
        <h3>Кирилл и Даня</h3>
        <p>Мы делаем одно и то же: оба придумываем, оба пишем код, оба отвечаем клиентам. На каждом проекте один ведёт, второй проверяет — на следующем меняемся.</p>
        <ul class="skills">${['идея и дизайн', 'вёрстка', '3D и анимации', 'каталоги и кабинеты', 'Telegram-боты', 'оплата и доставка', 'тексты'].map(s => `<li>${s}</li>`).join('')}</ul>
        <div class="duo-btns"><a class="btn btn-main" href="${tgLink(D.cfg.tg)}" target="_blank" rel="noopener">Написать Кириллу</a><a class="btn" href="${tgLink(D.cfg.tg2)}" target="_blank" rel="noopener">Написать Дане</a></div>
        <p class="duo-note">Пишите любому — ответит тот, кто первым увидит.</p>
      </div></div>
      <div class="why">${[['Второй взгляд', 'Один собирает сайт, другой ищет в нём ошибки. Вы получаете работу, которую уже проверили.'], ['Всегда на связи', 'Если один занят или заболел, проект ведёт второй. Заказ не зависнет.'], ['Без передачи по цепочке', 'Вы говорите с тем, кто делает. Ничего не теряется по дороге от менеджера к исполнителю.']]
        .map(([h, p]) => `<article class="tile glass card rise spot"><h3>${h}</h3><p>${p}</p></article>`).join('')}</div>`;
    $$('.duo-faces img', box).forEach(i => i.addEventListener('error', () => i.remove()));
  };

  /* работы: сетка с фильтром, при наведении играет запись прокрутки */
  B.wgrid = box => {
    const limit = +box.dataset.limit || 0, sets = [['all', 'Все'], ['клиенты', 'Клиенты'], ['3d', 'С 3D'], ['услуги', 'Услуги'], ['мир', 'Европа и США']];
    const list = limit ? D.best.slice(0, limit).map(id => D.works.find(w => w.id === id)) : D.works;
    box.innerHTML = (limit ? '' : `<div class="seg" role="group" aria-label="Раздел работ">${sets.map(([f, t], i) => `<button type="button" aria-pressed="${i === 0}" data-f="${f}">${t}</button>`).join('')}</div>`) +
      `<div class="wgrid">${list.map(w => `<a class="wcard rise" href="${w.url}" target="_blank" rel="noopener" data-d="${w.dir}">
        <div class="pic"><img src="../assets/shots/${w.id}.jpg" alt="Первый экран сайта «${w.name}»" loading="lazy" width="1000" height="500">${w.video ? `<video muted loop playsinline preload="none" data-src="../assets/video/${w.video}.mp4"></video>` : ''}</div>
        <div class="txt"><h3>${w.name}</h3><span class="kind ${w.kind}">${kindLabel(w.kind)}</span><p>${w.what}</p></div></a>`).join('')}</div>`;
    $$('.wcard', box).forEach(c => { const v = $('video', c); if (!v) return;
      c.addEventListener('pointerenter', () => { if (!v.src) v.src = v.dataset.src; v.play().then(() => c.classList.add('playing')).catch(() => {}); });
      c.addEventListener('pointerleave', () => { v.pause(); c.classList.remove('playing'); }); });
    $$('.seg button', box).forEach(b => b.addEventListener('click', () => { $$('.seg button', box).forEach(x => x.setAttribute('aria-pressed', x === b));
      $$('.wcard', box).forEach(c => { c.hidden = !(b.dataset.f === 'all' || c.dataset.d === b.dataset.f); c.classList.add('in'); }); }));
  };

  /* работы: стопка в глубину, листается прокруткой */
  B.wstack = box => {
    box.innerHTML = `<div class="wk-pin"><div class="wk-info"><h2>Работы.</h2>
      <div class="seg" role="group" aria-label="Какие работы показать">${[['best', 'Лучшие'], ['клиенты', 'Клиенты'], ['3d', 'С 3D'], ['услуги', 'Услуги'], ['мир', 'Европа и США']].map(([f, t], i) => `<button type="button" aria-pressed="${i === 0}" data-f="${f}">${t}</button>`).join('')}</div>
      <div class="wk-now" aria-live="polite"><p class="wk-count"><button type="button" class="p" aria-label="Предыдущая работа">‹</button><span><b class="n">01</b> / <span class="t">08</span></span><button type="button" class="x" aria-label="Следующая работа">›</button><span class="kind"></span></p>
      <h3></h3><p class="what"></p><a class="btn btn-main" href="#" target="_blank" rel="noopener">Открыть сайт</a></div>
      <p class="note"><a class="more" href="works.html">Все работы и разборы</a></p></div><div class="wk-stack" aria-hidden="true"></div></div>`;
    const stack = $('.wk-stack', box), now = $('.wk-now', box), q = s => $(s, now);
    let list = [], cards = [], pos = 0, posS = 0, act = -1, run = false;
    const span = () => box.offsetHeight - innerHeight, top = () => box.getBoundingClientRect().top + scrollY;
    const go = i => scrollTo({ top: top() + span() * Math.max(0, Math.min(list.length - 1, i)) / Math.max(1, list.length - 1), behavior: reduce ? 'auto' : 'smooth' });
    function setList(f) {
      list = f === 'best' ? D.best.map(id => D.works.find(w => w.id === id)) : D.works.filter(w => w.dir === f);
      stack.innerHTML = ''; act = -1;
      cards = list.map((w, i) => { const b = el('button', 'wc', `<img src="../assets/shots/${w.id}.jpg" alt="" ${i > 2 ? 'loading="lazy"' : ''} width="1000" height="500">`); b.type = 'button'; b.tabIndex = -1;
        b.addEventListener('click', () => { if (Math.round(posS) === i) window.open(w.url, '_blank', 'noopener'); else go(i); }); stack.appendChild(b); return b; });
      box.style.setProperty('--n', list.length); q('.t').textContent = String(list.length).padStart(2, '0'); tick(true);
    }
    function info(i) { if (i === act) return; act = i; const w = list[i];
      q('.n').textContent = String(i + 1).padStart(2, '0'); q('h3').textContent = w.name; q('.what').textContent = w.what; q('.kind').textContent = kindLabel(w.kind); q('.kind').className = 'kind ' + w.kind; q('a').href = w.url;
      q('.p').disabled = i === 0; q('.x').disabled = i === list.length - 1; now.classList.remove('swap'); void now.offsetWidth; now.classList.add('swap'); }
    function tick(force) {
      const sp = span(), small = innerWidth < 860;
      pos = (sp > 0 ? Math.min(1, Math.max(0, (scrollY - top()) / sp)) : 0) * (list.length - 1);
      posS = force || reduce ? pos : posS + (pos - posS) * .13; info(Math.round(posS));
      const fl = Math.floor(posS), fr = Math.min(1, Math.max(0, (posS - fl - .25) / .5)), pe = fl + fr * fr * (3 - 2 * fr), kx = small ? 16 : 56, ky = small ? 24 : 64, kz = small ? 170 : 260;
      cards.forEach((c, i) => { const d = i - pe; let x, y, z, o, br;
        if (d >= 0) { x = d * kx; y = -d * ky; z = -d * kz; o = d > 5 ? 0 : Math.min(1, 1.25 - d * .2); br = 1 - Math.min(.62, d * .15); } else { const t = -d; x = -t * (small ? 60 : 170); y = t * (small ? 60 : 110); z = t * 460; o = Math.max(0, 1 - t * 2.1); br = 1; }
        c.style.transform = `translate3d(${x.toFixed(1)}px, calc(-50% + ${y.toFixed(1)}px), ${z.toFixed(1)}px) rotateY(${small ? -6 : -11}deg) rotateX(3deg)`;
        c.style.opacity = o.toFixed(3); c.style.filter = `brightness(${br.toFixed(3)})`; c.style.zIndex = 200 - i; c.style.visibility = o <= .01 ? 'hidden' : 'visible'; c.style.pointerEvents = d < -.3 ? 'none' : 'auto'; });
    }
    const loop = () => { run = true; tick(); if (Math.abs(pos - posS) > .002) requestAnimationFrame(loop); else run = false; };
    addEventListener('scroll', () => { const r = box.getBoundingClientRect(); if (r.bottom < -200 || r.top > innerHeight + 200) return; if (!run) requestAnimationFrame(loop); }, { passive: true });
    addEventListener('resize', () => tick(true));
    q('.p').addEventListener('click', () => go(Math.round(pos) - 1)); q('.x').addEventListener('click', () => go(Math.round(pos) + 1));
    $$('.seg button', box).forEach(b => b.addEventListener('click', () => { $$('.seg button', box).forEach(x => x.setAttribute('aria-pressed', x === b)); setList(b.dataset.f); scrollTo({ top: top(), behavior: 'auto' }); }));
    setList('best');
  };

  /* призыв в конце страницы */
  B.cta = box => {
    box.innerHTML = `<div class="cta-box glass card rise"><h2>${box.dataset.h || 'Соберите заказ за две минуты.'}</h2><p class="lead">${box.dataset.p || 'Выберите, что нужно, напишите своими словами — и мы пришлём первый экран вашего сайта бесплатно.'}</p>
      <div class="cta-btns"><a class="btn btn-main" href="order.html">Собрать заказ</a><a class="btn" href="#" data-chat>Написать в чат</a></div>
      <ul class="trust"><li>0 ₽ до демо</li><li>Договор и чек</li><li>Ответ в течение дня</li></ul></div>`;
  };

  /* заявка на бесплатное демо: одна ссылка и контакт */
  B.lead = box => {
    box.innerHTML = `<form class="lead-form" novalidate>
      <label><span>Ссылка на ваши соцсети или карточку на картах</span><input name="link" type="text" inputmode="url" autocomplete="off" required></label>
      <label><span>Ваш Telegram или телефон</span><input name="contact" type="text" autocomplete="tel" required></label>
      <button class="btn btn-main" type="submit">Прислать демо бесплатно</button>
      <p class="note" role="status">Первый экран вашего сайта пришлём за 24 часа. Ни к чему не обязывает.</p></form>`;
    $('form', box).addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target, note = $('.note', f), link = f.link.value.trim(), c = f.contact.value.trim();
      if (!link || !c) { note.textContent = !link ? 'Вставьте ссылку или напишите название — по нему мы вас найдём.' : 'Оставьте Telegram или телефон, чтобы мы прислали демо.'; (!link ? f.link : f.contact).focus(); return; }
      note.textContent = 'Отправляем…'; note.textContent = sentNote(await send('demo', `Заявка на бесплатное демо\nГде посмотреть: ${link}\nКонтакт: ${c}`));
    });
  };

  /* подбор пакета: три вопроса */
  B.quiz = box => {
    const Q = [
      ['Что у вас?', [['service', 'Услуги: салон, студия, сервис'], ['goods', 'Товары: магазин, шоурум'], ['brand', 'Бренд, который хочет выделиться'], ['solo', 'Я частный мастер']]],
      ['Сколько позиций показывать?', [['few', 'До десяти'], ['some', 'От десяти до ста'], ['many', 'Больше ста']]],
      ['Что важнее всего?', [['fast', 'Быстро и недорого'], ['manage', 'Самому менять цены и товары'], ['wow', 'Чтобы запомнили']]],
    ];
    const a = {}; let step = 0;
    const pickPlan = () => a[2] === 'wow' || a[0] === 'brand' && a[2] !== 'fast' ? 'flagship' : a[0] === 'goods' || a[1] !== 'few' || a[2] === 'manage' ? 'catalog' : a[0] === 'solo' && a[2] === 'fast' ? 'card' : 'landing';
    function draw() {
      if (step < Q.length) {
        const [q, opts] = Q[step];
        box.innerHTML = `<div class="quiz glass card"><p class="quiz-step">Вопрос ${step + 1} из ${Q.length}</p><h3>${q}</h3><div class="quiz-opts">${opts.map(([v, t]) => `<button type="button" class="chip" data-v="${v}">${t}</button>`).join('')}</div>
          ${step ? '<button type="button" class="quiz-back">Назад</button>' : ''}</div>`;
        $$('.chip', box).forEach(b => b.addEventListener('click', () => { a[step] = b.dataset.v; step++; draw(); }));
        const back = $('.quiz-back', box); back && back.addEventListener('click', () => { step--; draw(); });
      } else {
        const p = D.plans.find(x => x.id === pickPlan());
        box.innerHTML = `<div class="quiz glass card done"><p class="quiz-step">Вам подойдёт</p><h3>${p.name} <span class="g">от ${rub(p.price)}</span></h3><p class="lead">${p.for} Срок: ${p.days}.</p>
          <ul class="quiz-list">${p.list.slice(0, 4).map(l => `<li>${l}</li>`).join('')}</ul>
          <div class="cta-btns"><a class="btn btn-main" href="order.html?p=${p.id}">Собрать заказ с этим пакетом</a><button type="button" class="btn quiz-again">Пройти заново</button></div></div>`;
        $('.quiz-again', box).addEventListener('click', () => { step = 0; draw(); });
      }
    }
    draw();
  };

  /* конструктор заказа */
  B.order = box => {
    const PL = [...D.plans.map(p => ({ id: p.id, name: p.name, price: p.price, days: p.days })), { id: 'bot', name: 'Только бот', price: 0, days: '3–7 дней' }, { id: 'idk', name: 'Пока не знаю', price: 0, days: 'назовём после демо' }];
    const st = { biz: '', plan: new URLSearchParams(location.search).get('p') || '', extra: new Set(), text: '', link: '', name: '', via: 'Telegram', contact: '' };
    try { Object.assign(st, JSON.parse(sessionStorage.getItem('order') || '{}'), st.plan ? { plan: st.plan } : {}); st.extra = new Set(st.extra || []); } catch (e) {}
    box.innerHTML = `<div class="order">
      <form class="order-form" novalidate>
        <fieldset class="ostep"><legend><i>1</i>Чем вы занимаетесь?</legend><div class="chips" data-g="biz">${D.biz.map(b => `<button type="button" class="chip" data-v="${b}">${b}</button>`).join('')}</div></fieldset>
        <fieldset class="ostep"><legend><i>2</i>Что нужно?</legend><div class="opick" data-g="plan">${PL.map(p => `<button type="button" class="pick" data-v="${p.id}"><b>${p.name}</b><span>${p.price ? 'от ' + rub(p.price) : p.id === 'bot' ? 'от 5 000 ₽' : 'подскажем'}</span></button>`).join('')}</div></fieldset>
        <fieldset class="ostep"><legend><i>3</i>Добавить к заказу</legend><div class="chips" data-g="extra">${D.extras.map(x => `<button type="button" class="chip" data-v="${x.id}">${x.name}<span class="chip-p">${x.note && !x.price ? x.note : '+' + rub(x.price) + (x.note ? ' ' + x.note : '')}</span></button>`).join('')}</div></fieldset>
        <fieldset class="ostep"><legend><i>4</i>Расскажите своими словами</legend>
          <label><span>Что хотите получить и для чего</span><textarea name="text" rows="4" placeholder="Например: чтобы клиенты записывались сами и перестали спрашивать цены в переписке"></textarea></label>
          <label><span>Где вас посмотреть: соцсети, карты или сайт</span><input name="link" type="text" inputmode="url" autocomplete="off"></label></fieldset>
        <fieldset class="ostep"><legend><i>5</i>Как с вами связаться</legend>
          <div class="chips" data-g="via">${['Telegram', 'WhatsApp', 'Телефон'].map(v => `<button type="button" class="chip" data-v="${v}">${v}</button>`).join('')}</div>
          <div class="two"><label><span>Ваше имя</span><input name="name" type="text" autocomplete="given-name"></label><label><span class="via-l">Ник или номер</span><input name="contact" type="text" autocomplete="tel" required></label></div></fieldset>
      </form>
      <aside class="receipt" aria-live="polite"><div class="receipt-in">
        <p class="r-top">Ваш заказ</p><ul class="r-rows"></ul>
        <p class="r-total"><span>Ориентир</span><b></b></p><p class="r-days"></p>
        <button class="btn btn-main" type="button">Отправить заявку</button>
        <p class="note" role="status">Точную сумму назовём после демо и закрепим в договоре.</p>
        <ul class="trust"><li>0 ₽ до демо</li><li>Договор и чек</li><li>Ответ за день</li></ul>
      </div></aside></div>`;
    const f = $('form', box), rows = $('.r-rows', box), total = $('.r-total b', box), days = $('.r-days', box), note = $('.receipt .note', box);
    const sum = () => { const p = PL.find(x => x.id === st.plan), base = p ? p.price : 0; let s = base; st.extra.forEach(id => { const x = D.extras.find(e => e.id === id); if (id === 'lang') s += Math.round(base * .3); else if (id !== 'care') s += x.price; }); return s; };
    function paint() {
      $$('[data-g]', box).forEach(g => $$('button', g).forEach(b => b.setAttribute('aria-pressed', g.dataset.g === 'extra' ? st.extra.has(b.dataset.v) : st[g.dataset.g] === b.dataset.v)));
      const p = PL.find(x => x.id === st.plan), line = (a, b) => `<li><span>${a}</span><b>${b}</b></li>`;
      rows.innerHTML = (st.biz ? line('Дело', st.biz) : '') + (p ? line(p.name, p.price ? 'от ' + rub(p.price) : '—') : '<li class="empty"><span>Выберите, что нужно, — здесь появится расчёт</span></li>') +
        [...st.extra].map(id => { const x = D.extras.find(e => e.id === id); return line(x.name, id === 'lang' ? '+30%' : '+' + rub(x.price) + (x.note ? ' ' + x.note : '')); }).join('') + line('Демо первого экрана', '0 ₽');
      const s = sum(); total.textContent = s ? 'от ' + rub(s) : 'после демо'; days.textContent = p ? 'Срок: ' + p.days : '';
      $('.via-l', box).textContent = st.via === 'Telegram' ? 'Ваш ник в Telegram' : 'Ваш номер';
      try { sessionStorage.setItem('order', JSON.stringify({ ...st, extra: [...st.extra] })); } catch (e) {}
    }
    $$('[data-g] button', box).forEach(b => b.addEventListener('click', () => { const g = b.parentElement.dataset.g, v = b.dataset.v;
      if (g === 'extra') st.extra.has(v) ? st.extra.delete(v) : st.extra.add(v); else st[g] = st[g] === v && g !== 'via' ? '' : v; paint(); }));
    ['text', 'link', 'name', 'contact'].forEach(n => { f[n].value = st[n] || ''; f[n].addEventListener('input', () => { st[n] = f[n].value.trim(); paint(); }); });
    $('.receipt button', box).addEventListener('click', async () => {
      if (!st.contact) { note.textContent = 'Оставьте ник или номер, чтобы мы могли ответить.'; f.contact.focus(); f.contact.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); return; }
      const p = PL.find(x => x.id === st.plan), s = sum(), L = ['Заявка с сайта'];
      if (st.biz) L.push('Дело: ' + st.biz); if (p) L.push('Нужно: ' + p.name + (p.price ? ' (от ' + rub(p.price) + ')' : ''));
      if (st.extra.size) L.push('Дополнительно: ' + [...st.extra].map(id => D.extras.find(e => e.id === id).name).join(', '));
      if (s) L.push('Ориентир: от ' + rub(s)); if (st.text) L.push('Задача: ' + st.text); if (st.link) L.push('Где посмотреть: ' + st.link);
      L.push('Контакт: ' + (st.name ? st.name + ', ' : '') + st.via + ' ' + st.contact);
      note.textContent = 'Отправляем…'; const how = await send('order', L.join('\n')); note.textContent = sentNote(how);
      if (how === 'sent') { box.querySelector('.receipt-in').innerHTML = `<p class="r-top">Готово</p><h3>Заявка у нас.</h3><p>Ответим в течение дня в ${st.via}. Первый экран вашего сайта пришлём бесплатно.</p><a class="btn" href="works.html">Пока посмотреть работы</a>`; try { sessionStorage.removeItem('order'); } catch (e) {} }
    });
    paint();
  };

  /* ── запуск ── */
  shell();
  $$('[data-block]').forEach(b => { const fn = B[b.dataset.block]; if (fn) { if (b.dataset.h) b.insertAdjacentHTML('beforebegin', ''); fn(b); } });
  $$('[data-chat]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); const fab = $('.chat-fab'); if (fab.getAttribute('aria-expanded') !== 'true') fab.click(); }));
  $$('[data-tg]').forEach(a => { a.href = tgLink(a.dataset.tg === 'me' ? D.cfg.tg : D.cfg.tg2); a.target = '_blank'; a.rel = 'noopener'; });

  /* манифест: слова загораются по мере прокрутки */
  const mani = $('#mani');
  if (mani) {
    mani.innerHTML = mani.textContent.trim().split(/\s+/).map(w => `<span>${w}</span>`).join(' ');
    const words = [...mani.children], say = mani.closest('.say'); let lit = -1;
    const tick = () => { const r = say.getBoundingClientRect(), sp = r.height - innerHeight, p = sp > 0 ? Math.min(1, Math.max(0, (-r.top + innerHeight * .15) / sp)) : 1, n = reduce ? words.length : Math.round(p * words.length * 1.08);
      if (n !== lit) { lit = n; words.forEach((w, i) => w.classList.toggle('lit', i < n)); } };
    addEventListener('scroll', tick, { passive: true }); tick();
  }

  /* сцена с 3D: главы на главной или один фиксированный кадр */
  const VIDS = D.videos, stage = $('#stage'), canvas = $('#gl');
  let scene = null, T = canvas && canvas.dataset.fixed ? +canvas.dataset.fixed : 0, vi = 0, userAt = 0;
  const chips = $('#vchips');
  function showVideo(i, byUser) { vi = i; if (byUser) userAt = Date.now();
    if (chips) { [...chips.children].forEach((b, k) => b.setAttribute('aria-pressed', k === i)); $('#vName').textContent = VIDS[i].name + '.'; $('#vWhat').textContent = VIDS[i].what; $('#vLink').href = VIDS[i].url; }
    scene && scene.setVideo(i); }
  if (chips) VIDS.forEach((v, i) => { const b = el('button', 'vchip', v.name); b.type = 'button'; b.addEventListener('click', () => showVideo(i, true)); chips.appendChild(b); });
  if (canvas) showVideo(0);
  if (stage) {
    const chs = $$('.ch', stage), hint = $('#hint'), n = chs.length - 1;
    const tick = () => { const sp = stage.offsetHeight - innerHeight; T = sp > 0 ? Math.min(n, Math.max(0, (scrollY - stage.offsetTop) / (sp / n))) : 0; scene && scene.setProgress(T);
      chs.forEach((c, k) => { const d = T - k, o = Math.max(0, Math.min(1, 1.7 - Math.abs(d) * 3.4)); c.style.opacity = o; c.style.transform = `translateY(${(-d * 70).toFixed(1)}px)`; c.classList.toggle('on', o > .5); c.style.visibility = o <= 0 ? 'hidden' : 'visible'; });
      if (hint) hint.style.opacity = T < .15 ? 1 : 0; };
    addEventListener('scroll', tick, { passive: true }); addEventListener('resize', tick); tick();
  }
  if (canvas && !reduce) setInterval(() => { if (document.hidden || (stage && T > 1.6) || Date.now() - userAt < 20000) return; showVideo((vi + 1) % VIDS.length); }, 7600);
  window.APP = { onScene(createScene) {
    if (!canvas) return;
    try { scene = createScene(canvas, { videos: VIDS, reduce, palette: canvas.dataset.palette || 'ice', light: canvas.dataset.light === '1', start: T }); scene.setVideo(vi); scene.setProgress(T); document.documentElement.classList.add('gl'); }
    catch (e) { window.__errs && window.__errs.push('scene: ' + e.message); document.documentElement.classList.add('no-gl'); }
  } };
  if (canvas) addEventListener('load', () => setTimeout(() => { if (!scene) document.documentElement.classList.add('no-gl'); }, 1500));

  /* свет под курсором, появление блоков, кнопка заказа на телефоне */
  if (!reduce && matchMedia('(hover:hover)').matches) $$('.spot').forEach(c => {
    c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); c.style.setProperty('--my', (y * 100).toFixed(1) + '%'); c.style.setProperty('--ry', ((x - .5) * 4).toFixed(2) + 'deg'); c.style.setProperty('--rx', ((.5 - y) * 3).toFixed(2) + 'deg'); });
    c.addEventListener('pointerleave', () => { c.style.setProperty('--ry', '0deg'); c.style.setProperty('--rx', '0deg'); }); });
  $$('.bento,.plans,.cases,.svc,.bots,.hood,.why,.wgrid,.stats').forEach(g => [...g.children].forEach((c, i) => c.style.setProperty('--i', i % 4)));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rise').forEach(e => io.observe(e));
  if (page !== 'order') {
    const dock = el('div', 'dock', '<a class="btn btn-main" href="order.html">Собрать заказ</a>'); document.body.appendChild(dock);
    const tick = () => dock.classList.toggle('on', scrollY > innerHeight * .9 && document.documentElement.scrollHeight - scrollY - innerHeight > 500);
    addEventListener('scroll', tick, { passive: true }); tick();
  }
})();
