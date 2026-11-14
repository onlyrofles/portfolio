(function () {
  'use strict';

  // Demo prices: tenge per linear meter of the base kitchen
  var LAYOUTS = {
    straight: { name: 'Прямая', k: 1 },
    corner: { name: 'Угловая', k: 1.12 },
    u: { name: 'П-образная', k: 1.25 },
    island: { name: 'С островом', k: 1.35 }
  };
  var FACADES = {
    ldsp: { name: 'ЛДСП', price: 170000 },
    film: { name: 'МДФ в плёнке', price: 230000 },
    enamel: { name: 'МДФ в эмали', price: 310000 },
    wood: { name: 'Массив дерева', price: 450000 }
  };
  var TOPS = {
    post: { name: 'Постформинг', price: 25000 },
    acryl: { name: 'Искусственный камень', price: 65000 },
    quartz: { name: 'Кварцевый агломерат', price: 110000 }
  };
  var WHATSAPP_PHONE = '77081498620'; // digits only, with country code: 8 708 149 86 20

  var REVIEWS = [
    { text: 'Заказывали кухню к переезду. Замерщик приехал в день звонка, проект согласовали за два визита. Установили точно в срок, все ящики на доводчиках.', author: 'Имя Фамилия' },
    { text: 'Переживали, что угловая кухня не встанет из-за кривых стен. Мастера всё учли, зазоров нет. Рекомендуем знакомым.', author: 'Имя Фамилия' },
    { text: 'Понравилось, что цена в договоре не изменилась. Качество фурнитуры и сборки на высоте, за собой убрали.', author: 'Имя Фамилия' }
  ];

  var form = document.getElementById('order');
  var errorEl = document.getElementById('form-error');

  function money(value) {
    // Round to thousands: the price is only an estimate
    return (Math.round(value / 1000) * 1000).toLocaleString('ru-RU') + ' ₸';
  }

  // Single place where the kitchen is priced
  function calculate() {
    var layout = LAYOUTS[form.elements.layout.value];
    var facade = FACADES[form.elements.facade.value];
    var top = TOPS[form.elements.top.value];
    // Note: the field is named "size" because form.elements.length is the collection size
    var length = Number(form.elements.size.value);
    return {
      layout: layout.name,
      facade: facade.name,
      top: top.name,
      length: length,
      total: (facade.price * layout.k + top.price) * length
    };
  }

  function render() {
    var o = calculate();
    document.getElementById('length-out').textContent = o.length + ' м';
    document.getElementById('r-total').textContent = money(o.total);
  }

  form.addEventListener('input', render);
  form.addEventListener('change', render);

  function setError(el, message, field) {
    el.textContent = message;
    el.hidden = false;
    field.classList.add('is-invalid');
    field.focus();
  }

  function clearErrors(root) {
    root.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
  }

  // Opens WhatsApp with the chat prefilled; the customer only has to press "send"
  function openWhatsApp(lines) {
    window.open('https://wa.me/' + WHATSAPP_PHONE + '?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    errorEl.hidden = true;
    clearErrors(form);

    var name = form.elements.name.value.trim();
    var phone = form.elements.phone.value.trim();
    if (!name) return setError(errorEl, 'Укажите, как к вам обращаться.', form.elements.name);
    if (phone.replace(/\D/g, '').length < 10) return setError(errorEl, 'Проверьте телефон: нужно минимум 10 цифр.', form.elements.phone);

    var o = calculate();
    openWhatsApp([
      'Здравствуйте! Хочу заказать кухню.',
      '',
      'Планировка: ' + o.layout,
      'Длина: ' + o.length + ' м',
      'Фасады: ' + o.facade,
      'Столешница: ' + o.top,
      'Ориентировочная стоимость: ' + money(o.total),
      '',
      'Имя: ' + name,
      'Телефон: ' + phone
    ]);
  });

  form.addEventListener('input', function (event) { event.target.classList.remove('is-invalid'); });

  // Catalog request goes to the same WhatsApp number
  var catalogForm = document.getElementById('catalog-form');
  var catalogError = document.getElementById('catalog-error');
  catalogForm.addEventListener('submit', function (event) {
    event.preventDefault();
    catalogError.hidden = true;
    clearErrors(catalogForm);
    var email = catalogForm.elements.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(catalogError, 'Проверьте адрес почты.', catalogForm.elements.email);
    openWhatsApp(['Здравствуйте! Пришлите, пожалуйста, каталог кухонь.', 'Почта: ' + email]);
  });

  // Review slider
  var current = 0;
  function showReview(index) {
    current = (index + REVIEWS.length) % REVIEWS.length;
    document.getElementById('review-text').textContent = REVIEWS[current].text;
    document.getElementById('review-author').textContent = REVIEWS[current].author;
    document.getElementById('review-count').textContent = (current + 1) + '/' + REVIEWS.length + ' отзыв';
  }
  document.getElementById('prev').addEventListener('click', function () { showReview(current - 1); });
  document.getElementById('next').addEventListener('click', function () { showReview(current + 1); });

  // Mobile menu
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  }
  burger.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
  nav.addEventListener('click', function (event) { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') setMenu(false); });

  // ----- Scroll animations -----
  // Elements get their reveal class here, so the markup stays clean.
  // Siblings inside one group get a growing delay for a staggered entrance.
  var REVEAL_GROUPS = [
    ['.cream__text h2, .hand-steps li', 'reveal--left'],
    ['.card', 'reveal--right'],
    ['.years h2', 'reveal--left'],
    ['#works h2, #works .note', ''],
    ['.catalog > div:first-child > *', 'reveal--left'],
    ['.book', 'reveal--right'],
    ['.reviews h2, .review, .slider', 'reveal--left'],
    ['.lamp', 'reveal--zoom'],
    ['.brands p, .brands li', ''],
    ['.contacts > div:first-child > *', 'reveal--left'],
    ['.map', 'reveal--right'],
    ['.footer__in > *', '']
  ];
  REVEAL_GROUPS.forEach(function (group) {
    document.querySelectorAll(group[0]).forEach(function (el, i) {
      el.classList.add('reveal');
      if (group[1]) el.classList.add(group[1]);
      el.style.setProperty('--d', Math.min(i, 6) * 0.1 + 's');
    });
  });
  // Stagger for blocks that already carry .reveal in the markup
  document.querySelectorAll('.cross li, .tile, .steps li').forEach(function (el, i) {
    el.classList.add('reveal--zoom');
    el.style.setProperty('--d', (i % 3) * 0.12 + 's');
  });

  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (item) { observer.observe(item); });
  } else {
    items.forEach(function (item) { item.classList.add('is-visible'); });
  }

  // Header (hide on scroll down, show on scroll up), progress bar, parallax, active menu link
  var header = document.getElementById('header');
  var progress = document.getElementById('progress');
  var heroImg = document.querySelector('.hero__img');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lastY = window.scrollY;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    header.classList.toggle('is-scrolled', y > 20);

    // Keep the bar visible while the mobile menu is open
    var menuOpen = nav.classList.contains('is-open');
    if (y > lastY + 6 && y > 200 && !menuOpen) header.classList.add('is-hidden');
    else if (y < lastY - 6 || y <= 200) header.classList.remove('is-hidden');
    lastY = y;

    if (heroImg && !reduceMotion && y < window.innerHeight) {
      heroImg.style.translate = '0 ' + Math.round(y * 0.08) + 'px';
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });

  if ('IntersectionObserver' in window) {
    var links = {};
    nav.querySelectorAll('a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        Object.keys(links).forEach(function (id) { links[id].classList.toggle('is-active', id === entry.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) spy.observe(section);
    });
  }
  onScroll();

  document.getElementById('year').textContent = new Date().getFullYear();
  showReview(0);
  render();
})();
