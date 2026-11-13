/* Общие данные обоих вариантов. Контакты и работы меняются только здесь. */
window.KUHTA = (() => {
  /* ── КОНТАКТЫ ─────────────────────────────────────────────
     tg — ник в Telegram без @ (например 'ai_kuhta'); wa — номер только цифрами (например '79001234567').
     Пустая строка = кнопка не показывается. */
  const me = {
    name: 'AI KUHTA',
    tg: 'AI_KUHTA',
    partnerTg: 'usamaluh',   // ник Дани в Telegram без @
    wa: '',
    ig: 'ai.kuhta',
    mail: 'ai_kuhta@outlook.com',
  };

  const demo = s => `https://pikold.github.io/demo-sites/${s}/`;
  /* kind: client — живой клиент, concept — демо-концепт (показан владельцу до оплаты)
     group: brand | service | west   ·  d3: есть WebGL / 3D */
  const works = [
    { id: 'cat28lin', name: 'cat28lin', what: 'Портупеи и ремни из кожи', group: 'brand', kind: 'concept', d3: true, url: demo('cat28lin') },
    { id: 'masy', name: 'MASY', what: 'Бренд верхней одежды, Пермь', group: 'brand', kind: 'client', url: 'https://bymasy.ru/v1/' },
    { id: 'bonkombinezon', name: 'Bonkombinezon', what: 'Зимние комбинезоны из Сибири', group: 'brand', kind: 'concept', d3: true, url: demo('bonkombinezon') },
    { id: 'pm-code', name: 'PM CODE', what: 'Студия перманентного макияжа, Петербург', group: 'service', kind: 'client', url: 'https://pikold.github.io/DEMO-PM-CODE/' },
    { id: 'all-youall', name: 'All.', what: 'Мужская одежда, Москва', group: 'brand', kind: 'concept', d3: true, url: demo('all-youall') },
    { id: 'hamlet-coffee-company', name: 'Hamlet Coffee', what: 'Кофейня, Бруклин', group: 'west', kind: 'concept', d3: true, url: demo('hamlet-coffee-company') },
    { id: 'kislota', name: 'Кислота', what: 'Тату-салон', group: 'service', kind: 'concept', url: demo('kislota') },
    { id: 'barballetta', name: 'Barballetta', what: 'Ателье индивидуального пошива', group: 'brand', kind: 'concept', d3: true, url: demo('barballetta') },
    { id: 'giorgio-bekleidungen-herrenm', name: 'Giorgio', what: 'Мужское ателье, Швейцария', group: 'west', kind: 'concept', url: demo('giorgio-bekleidungen-herrenm') },
    { id: 'moskou-garazh', name: 'Москоу Гараж', what: 'Детейлинг и тюнинг, Москва', group: 'service', kind: 'concept', url: demo('moskou-garazh') },
    { id: 'polytope-shop', name: 'Polytope', what: 'Дизайнерская одежда, Пермь', group: 'brand', kind: 'concept', url: demo('polytope-shop') },
    { id: 'goat-barbershop', name: 'GOAT Barbershop', what: 'Барбершоп, Орландо', group: 'west', kind: 'concept', d3: true, url: demo('goat-barbershop') },
    { id: 'hardcore', name: 'Hardcore', what: 'Барбершоп, Краснодар', group: 'service', kind: 'concept', url: demo('hardcore') },
    { id: 'mari-gogenloe', name: 'Mari Gogenloe', what: 'Вязаные свитеры', group: 'brand', kind: 'concept', url: demo('mari-gogenloe') },
    { id: 'fahrschule-sasa', name: 'Fahrschule Sasa', what: 'Автошкола, Швейцария', group: 'west', kind: 'concept', url: demo('fahrschule-sasa') },
    { id: 'kolibri-sound', name: 'Kolibri sound', what: 'Шумоизоляция и автозвук, Краснодар', group: 'service', kind: 'concept', url: demo('kolibri-sound') },
    { id: 'veir-bags', name: 'Veir bags', what: 'Вязаные сумки, Петербург', group: 'brand', kind: 'concept', url: demo('veir-bags') },
    { id: 'curate-collective', name: 'Curate Collective', what: 'Стритвир и кроссовки, Тампа', group: 'west', kind: 'concept', url: demo('curate-collective') },
    { id: 'boris-the-blade', name: 'Boris the Blade', what: 'Барбершоп, Краснодар', group: 'service', kind: 'concept', url: demo('boris-the-blade') },
    { id: 'not-usual-things', name: 'not.usual.things', what: 'Апсайкл-одежда, Петербург', group: 'brand', kind: 'concept', url: demo('not-usual-things') },
    { id: 'roofing-xl-solar', name: 'Roofing XL', what: 'Кровельная компания, Шарлотт', group: 'west', kind: 'concept', url: demo('roofing-xl-solar') },
    { id: 'top-laser-pro', name: 'Top Laser Pro', what: 'Лазерная эпиляция', group: 'service', kind: 'concept', url: demo('top-laser-pro') },
    { id: 'bolo-bolo-cafe-bakery', name: 'Bolo Bolo', what: 'Кафе-пекарня, Бруклин', group: 'west', kind: 'concept', url: demo('bolo-bolo-cafe-bakery') },
  ];
  works.forEach(w => { w.img = `../assets/shots/${w.id}.jpg`; w.thumb = `../assets/shots/s/${w.id}.jpg`; });

  /* ── КАЛЬКУЛЯТОР ЗАЯВКИ ─────────────────────────────────── */
  const brief = {
    biz: ['Салон или барбершоп', 'Бренд одежды', 'Автосервис или детейлинг', 'Кафе или кофейня', 'Частный мастер', 'Другое'],
    need: [
      { t: 'Визитка-таплинк', p: 3500 },
      { t: 'Лендинг', p: 15000 },
      { t: 'Сайт с каталогом', p: 30000 },
      { t: 'Флагман с 3D', p: 90000 },
      { t: 'Пока не знаю', p: 0 },
    ],
    extra: [
      { t: 'Telegram-бот-автоответчик', p: 5000 },
      { t: 'Бот с онлайн-записью', p: 9500 },
      { t: 'Онлайн-оплата и доставка', p: 15000 },
    ],
  };
  const rub = n => n.toLocaleString('ru-RU').replace(/\s/g, ' ') + ' ₽';

  /* Ссылки «написать» с готовым текстом */
  function links(text) {
    const q = encodeURIComponent(text || 'Здравствуйте! Хочу сайт для своего дела.');
    const out = [];
    if (me.tg) out.push({ id: 'tg', label: 'Telegram', href: `https://t.me/${me.tg}?text=${q}` });
    if (me.wa) out.push({ id: 'wa', label: 'WhatsApp', href: `https://wa.me/${me.wa}?text=${q}` });
    if (me.ig) out.push({ id: 'ig', label: 'Instagram*', href: `https://ig.me/m/${me.ig}`, copy: true });
    if (me.mail) out.push({ id: 'mail', label: 'Почта', href: `mailto:${me.mail}?subject=${encodeURIComponent('Сайт для моего дела')}&body=${q}` });
    return out;
  }

  /* Сборка формы-заявки. root — контейнер с [data-brief]; возвращает ничего, всё вешает само.
     Разметка: [data-chips="biz|need|extra"], [data-link] input, [data-total], [data-send], [data-copied] */
  function mountBrief(root) {
    const state = { biz: '', need: null, extra: new Set(), link: '' };
    const mk = (group, items, multi) => {
      const box = root.querySelector(`[data-chips="${group}"]`);
      items.forEach((it, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'chip'; b.setAttribute('aria-pressed', 'false');
        const label = typeof it === 'string' ? it : it.t;
        b.innerHTML = label + (it.p ? ` <span class="chip-p">${multi ? '+' : 'от '}${rub(it.p)}</span>` : '');
        b.addEventListener('click', () => {
          if (multi) { state.extra.has(i) ? state.extra.delete(i) : state.extra.add(i); b.setAttribute('aria-pressed', state.extra.has(i)); }
          else {
            box.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', 'false'));
            b.setAttribute('aria-pressed', 'true');
            if (group === 'biz') state.biz = label; else state.need = i;
          }
          render();
        });
        box.appendChild(b);
      });
    };
    mk('biz', brief.biz); mk('need', brief.need); mk('extra', brief.extra, true);
    const input = root.querySelector('[data-link]');
    input.addEventListener('input', () => { state.link = input.value.trim(); render(); });

    const message = () => {
      const l = ['Здравствуйте! Хочу сайт.'];
      if (state.biz) l.push('Моё дело: ' + state.biz.toLowerCase() + '.');
      if (state.need !== null) l.push('Нужно: ' + brief.need[state.need].t.toLowerCase() + '.');
      if (state.extra.size) l.push('Дополнительно: ' + [...state.extra].map(i => brief.extra[i].t.toLowerCase()).join(', ') + '.');
      if (state.link) l.push('Мы в сети: ' + state.link);
      l.push('Покажите, пожалуйста, демо.');
      return l.join('\n');
    };
    const total = root.querySelector('[data-total]'), send = root.querySelector('[data-send]'), note = root.querySelector('[data-copied]');
    function render() {
      let sum = state.need !== null ? brief.need[state.need].p : 0;
      state.extra.forEach(i => sum += brief.extra[i].p);
      total.textContent = sum ? 'от ' + rub(sum) : 'посчитаем после демо';
      const msg = message();
      send.innerHTML = '';
      links(msg).forEach((k, n) => {
        const a = document.createElement('a');
        a.className = 'btn ' + (n === 0 ? 'btn-main' : 'btn-line'); a.href = k.href; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = (n === 0 ? 'Отправить в ' : '') + k.label;
        if (k.copy) a.addEventListener('click', () => copy(msg, 'Текст заявки скопирован — вставьте его в сообщение.'));
        send.appendChild(a);
      });
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'btn btn-line'; c.textContent = 'Скопировать текст';
      c.addEventListener('click', () => copy(msg, 'Текст заявки скопирован.'));
      send.appendChild(c);
    }
    function copy(t, say) {
      const done = () => { note.textContent = say; };
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, done); else done();
    }
    render();
  }

  /* Прямые контакты: вставляет ссылки в каждый [data-contacts] */
  function mountContacts() {
    document.querySelectorAll('[data-contacts]').forEach(box => {
      links().forEach(k => {
        const a = document.createElement('a');
        a.href = k.href; a.target = '_blank'; a.rel = 'noopener'; a.textContent = k.label; a.className = box.dataset.contacts || '';
        box.appendChild(a);
      });
    });
    /* главная кнопка «написать»: первый доступный канал */
    const first = links()[0];
    document.querySelectorAll('[data-write]').forEach(a => { if (first && a.dataset.write === 'direct') { a.href = first.href; a.target = '_blank'; a.rel = 'noopener'; } });
  }

  return { me, works, brief, rub, links, mountBrief, mountContacts };
})();
