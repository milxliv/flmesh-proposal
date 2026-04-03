/* ============================================
   Florida Mesh — Site JavaScript
   Vanilla JS — no frameworks, no dependencies
   ============================================ */

(function () {
  'use strict';

  // ── Mobile nav toggle ──────────────────────
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.classList.toggle('active', open);
      toggle.setAttribute('aria-expanded', String(open));
    });

    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ── Scroll reveal ──────────────────────────
  function initReveal() {
    var reveals = document.querySelectorAll('.reveal:not(.visible)');
    if ('IntersectionObserver' in window && reveals.length > 0) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var siblings = entry.target.parentNode.querySelectorAll('.reveal');
            var idx = Array.from(siblings).indexOf(entry.target);
            var delay = idx * 80;
            setTimeout(function () {
              entry.target.classList.add('visible');
            }, delay);
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

      reveals.forEach(function (el) { obs.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add('visible'); });
    }
  }

  // ── Community Builds loader ────────────────
  function loadBuilds() {
    var grid = document.getElementById('builds-grid');
    if (!grid) return;

    fetch('builds.json')
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .then(function (builds) {
        if (!builds || builds.length === 0) return;

        var html = '';
        builds.forEach(function (b) {
          var escapedTitle = (b.title || '').replace(/</g, '&lt;');
          var escapedDesc = (b.description || '').replace(/</g, '&lt;');
          var escapedTag = (b.tag || '').replace(/</g, '&lt;');
          var escapedLoc = (b.location || '').replace(/</g, '&lt;');
          var escapedAuthor = (b.author || '').replace(/</g, '&lt;');

          html += '<div class="build-card reveal">';

          if (b.image) {
            html += '<img class="build-image-img" src="' + b.image +
                    '" alt="' + escapedTitle + '" loading="lazy">';
          } else {
            html += '<div class="build-image">' +
                    '<div class="placeholder-inner">' +
                    '<div class="placeholder-icon">📸</div>Photo pending</div></div>';
          }

          html += '<div class="build-info">';
          html += '<h3>' + escapedTitle + '</h3>';
          html += '<p>' + escapedDesc + '</p>';
          html += '<div class="build-meta">';
          if (b.tag) html += '<span class="build-tag">' + escapedTag + '</span>';
          if (b.location) html += '<span>' + escapedLoc + '</span>';
          if (b.author) html += '<span>by ' + escapedAuthor + '</span>';
          html += '</div></div></div>';
        });

        grid.innerHTML = html;
        initReveal();
      })
      .catch(function () {
        // Silently fail — static placeholder stays visible
      });
  }

  // ── Init ───────────────────────────────────
  initReveal();
  loadBuilds();

})();
