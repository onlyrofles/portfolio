(function () {
  'use strict';

  // Demo prices: rubles per stacked cubic meter
  var WOODS = {
    birch: { name: 'Берёза', price: 3200 },
    oak: { name: 'Дуб', price: 4200 },
    alder: { name: 'Ольха', price: 2900 },
    aspen: { name: 'Осина', price: 2300 },
    pine: { name: 'Сосна', price: 2200 }
  };
  var CHUNK_DISCOUNT = 0.15;   // unsplit logs are cheaper
  var DELIVERY_PRICE = 500;
  var FREE_DELIVERY_FROM = 5;  // cubic meters
  var TELEGRAM_USER = 'onlyrofles'; // demo: orders go to the site author

  var form = document.getElementById('order');
  var woodEl = document.getElementById('wood');
  var volumeEl = document.getElementById('volume');
  var errorEl = document.getElementById('form-error');

  function money(value) {
    return Math.round(value).toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽';
  }

  function volumeDiscount(volume) {
    if (volume >= 5) return 0.10;
    if (volume >= 3) return 0.05;
    return 0;
  }

  // Single place where the order is priced, used by the receipt and the message
  function calculate() {
    var wood = WOODS[woodEl.value];
    var kind = form.elements.kind.value;
    var volume = Number(volumeEl.value);

    var unit = wood.price * (kind === 'chunk' ? 1 - CHUNK_DISCOUNT : 1);
    var discount = volumeDiscount(volume);
    var delivery = volume >= FREE_DELIVERY_FROM ? 0 : DELIVERY_PRICE;
    var total = unit * volume * (1 - discount) + delivery;

    return {
      wood: wood.name,
      kind: kind === 'chunk' ? 'Чурками' : 'Колотые',
      volume: volume,
      unit: unit,
      discount: discount,
      delivery: delivery,
      total: total
    };
  }

  function render() {
    var o = calculate();
    document.getElementById('volume-out').textContent = o.volume + ' м³';
    document.getElementById('r-wood').textContent = o.wood;
    document.getElementById('r-kind').textContent = o.kind;
    document.getElementById('r-volume').textContent = o.volume + ' м³';
    document.getElementById('r-unit').textContent = money(o.unit);
    document.getElementById('r-discount').textContent = o.discount ? '−' + Math.round(o.discount * 100) + '%' : 'нет';
    document.getElementById('r-delivery').textContent = o.delivery ? money(o.delivery) : 'бесплатно';
    document.getElementById('r-total').textContent = money(o.total);
  }

  form.addEventListener('input', render);
  form.addEventListener('change', render);

  // "Choose" buttons in the price list preselect the species in the calculator
  document.querySelectorAll('[data-pick]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      woodEl.value = btn.getAttribute('data-pick');
      render();
    });
  });

  // ----- Order submit: validate, then open a prepared Telegram message -----
  function setError(message, field) {
    errorEl.textContent = message;
    errorEl.hidden = false;
    if (field) {
      field.classList.add('is-invalid');
      field.focus();
    }
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    errorEl.hidden = true;
    form.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });

    var name = form.elements.name.value.trim();
    var phone = form.elements.phone.value.trim();
    var address = form.elements.address.value.trim();
    var digits = phone.replace(/\D/g, '');

    if (!name) return setError('Укажите, как к вам обращаться.', form.elements.name);
    if (digits.length < 10) return setError('Проверьте телефон: нужно минимум 10 цифр.', form.elements.phone);
    if (!address) return setError('Укажите адрес доставки.', form.elements.address);

    var o = calculate();
    var text = [
      'Заказ дров',
      o.wood + ', ' + o.kind.toLowerCase() + ', ' + o.volume + ' м³',
      'Итого: ' + money(o.total) + (o.delivery ? ' (с доставкой)' : ' (доставка бесплатно)'),
      'Имя: ' + name,
      'Телефон: ' + phone,
      'Адрес: ' + address
    ].join('\n');

    window.open('https://t.me/' + TELEGRAM_USER + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
  });

  form.addEventListener('input', function (event) {
    event.target.classList.remove('is-invalid');
  });

  // ----- Mobile menu -----
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');

  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  }

  burger.addEventListener('click', function () {
    setMenu(!nav.classList.contains('is-open'));
  });
  nav.addEventListener('click', function (event) {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setMenu(false);
  });

  // ----- Scroll reveal -----
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

  document.getElementById('year').textContent = new Date().getFullYear();
  render();
})();
