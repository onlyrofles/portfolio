(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ----- Mobile menu -----
  var burger = document.getElementById('burger');
  var links = document.getElementById('nav-links');

  function setMenu(open) {
    links.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  }

  burger.addEventListener('click', function () {
    setMenu(!links.classList.contains('is-open'));
  });

  links.addEventListener('click', function (event) {
    if (event.target.closest('a')) setMenu(false);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setMenu(false);
  });

  // ----- Scroll reveal for blocks -----
  var items = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -50px 0px' }
    );
    items.forEach(function (item) { observer.observe(item); });
  } else {
    items.forEach(function (item) { item.classList.add('is-visible'); });
  }

  // ----- Character-by-character text reveal driven by scroll -----
  var aboutText = document.getElementById('about-text');

  if (aboutText) {
    var text = aboutText.textContent.trim();
    var words = text.split(/\s+/);
    var total = text.replace(/\s+/g, '').length;
    var chars = [];
    var index = 0;

    aboutText.setAttribute('aria-label', text);
    aboutText.textContent = '';

    words.forEach(function (word, wi) {
      var wordEl = document.createElement('span');
      wordEl.className = 'w';
      wordEl.setAttribute('aria-hidden', 'true');

      Array.from(word).forEach(function (ch) {
        var c = document.createElement('span');
        c.className = 'c';
        c.textContent = ch;
        wordEl.appendChild(c);
        chars.push({ el: c, progress: index / total });
        index += 1;
      });

      aboutText.appendChild(wordEl);
      if (wi < words.length - 1) aboutText.appendChild(document.createTextNode(' '));
    });

    var ticking = false;

    function updateText() {
      ticking = false;
      var vh = window.innerHeight;
      var rect = aboutText.getBoundingClientRect();
      // Progress from "top reaches 80% of the screen" to "bottom reaches 20%"
      var p = (0.8 * vh - rect.top) / (rect.height + 0.6 * vh);
      p = Math.min(1, Math.max(0, p));

      chars.forEach(function (item) {
        var start = Math.max(0, item.progress - 0.1);
        var end = Math.min(1, item.progress + 0.05);
        var t = end > start ? (p - start) / (end - start) : 1;
        t = Math.min(1, Math.max(0, t));
        item.el.style.opacity = (0.2 + 0.8 * t).toFixed(2);
      });
    }

    if (!reduceMotion) {
      window.addEventListener('scroll', function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(updateText);
        }
      }, { passive: true });
      window.addEventListener('resize', updateText);
      updateText();
    } else {
      chars.forEach(function (item) { item.el.style.opacity = 1; });
    }
  }

  // ----- Mouse parallax for hero shapes (pointer devices only) -----
  var hero = document.getElementById('top');
  var shapes = document.querySelectorAll('.shape');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (hero && finePointer && !reduceMotion) {
    hero.addEventListener('mousemove', function (event) {
      var rect = hero.getBoundingClientRect();
      var x = (event.clientX - rect.left) / rect.width - 0.5;
      var y = (event.clientY - rect.top) / rect.height - 0.5;
      shapes.forEach(function (shape) {
        var depth = Number(shape.dataset.depth) || 0;
        shape.style.setProperty('--px', (x * depth).toFixed(1) + 'px');
        shape.style.setProperty('--py', (y * depth).toFixed(1) + 'px');
      });
    });

    hero.addEventListener('mouseleave', function () {
      shapes.forEach(function (shape) {
        shape.style.setProperty('--px', '0px');
        shape.style.setProperty('--py', '0px');
      });
    });
  }

  // ----- Cursor spotlight on cards -----
  document.querySelectorAll('.glass').forEach(function (card) {
    card.addEventListener('mousemove', function (event) {
      var rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', (event.clientX - rect.left) + 'px');
      card.style.setProperty('--my', (event.clientY - rect.top) + 'px');
    });
  });

  // ----- Footer year -----
  document.getElementById('year').textContent = new Date().getFullYear();
})();
