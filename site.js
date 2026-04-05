/* ============================================
   Florida Mesh — Site JavaScript
   Vanilla JS — no frameworks, no dependencies
   ============================================ */

(function () {
  'use strict';

  // ── SkyWatch API base URL ─────────────────
  // Change this to match where SkyWatch is deployed.
  // Falls back gracefully if SkyWatch is unreachable.
  var SKYWATCH_API = 'https://skywatch.areyoumeshingwith.us';

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
                    '<div class="placeholder-icon">&#128248;</div>Photo pending</div></div>';
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

  // ── SkyWatch: Live mesh node stats + mini-map ──
  var miniMap = null;
  var meshLayer = null;

  function initMiniMap() {
    var el = document.getElementById('mini-map');
    if (!el || typeof L === 'undefined') return;

    miniMap = L.map('mini-map', {
      center: [27.8, -82.5],
      zoom: 7,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: true,
      doubleClickZoom: false,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 12,
    }).addTo(miniMap);

    meshLayer = L.layerGroup().addTo(miniMap);
  }

  function loadMeshNodes() {
    fetch(SKYWATCH_API + '/api/mesh-nodes')
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .then(function (nodes) {
        if (!nodes || !Array.isArray(nodes)) return;

        var online = 0;
        nodes.forEach(function (n) { if (n.online) online++; });

        // Update stats
        var elOnline = document.getElementById('stat-online');
        var elTotal = document.getElementById('stat-total');
        if (elOnline) elOnline.textContent = online.toLocaleString();
        if (elTotal) elTotal.textContent = nodes.length.toLocaleString();

        // Populate mini-map
        if (meshLayer) {
          meshLayer.clearLayers();
          nodes.forEach(function (n) {
            if (n.lat == null || n.lng == null) return;
            var color = n.online ? '#00e676' : '#556677';
            var radius = n.online ? 5 : 3;

            var marker = L.circleMarker([n.lat, n.lng], {
              radius: radius,
              fillColor: color,
              color: '#0a0e14',
              weight: 1,
              opacity: 0.9,
              fillOpacity: 0.8,
            });

            var popup = '<strong>' + escapeHtml(n.long_name) + '</strong>';
            if (n.short_name) popup += ' <code>' + escapeHtml(n.short_name) + '</code>';
            popup += '<br><span style="color:' + color + '">&#8226;</span> ' +
                     (n.online ? 'ONLINE' : 'OFFLINE');
            if (n.hardware) popup += ' &middot; ' + escapeHtml(n.hardware);
            if (n.role) popup += '<br>Role: ' + escapeHtml(n.role);

            marker.bindPopup(popup);
            meshLayer.addLayer(marker);
          });
        }
      })
      .catch(function () {
        // SkyWatch unreachable — stats stay as dashes, map stays empty
      });
  }

  // ── SkyWatch: NWS alert banner ─────────────
  function loadAlerts() {
    fetch(SKYWATCH_API + '/api/events?severity=extreme&limit=5')
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.text();
      })
      .then(function (html) {
        // The events endpoint returns HTML partials.
        // Parse out event titles from the response.
        var parser = new DOMParser();
        var doc = parser.parseFromString('<div>' + html + '</div>', 'text/html');
        var titles = doc.querySelectorAll('.event-title');
        var areas = doc.querySelectorAll('.event-area');

        if (titles.length === 0) {
          // Try severe if no extreme alerts
          return fetch(SKYWATCH_API + '/api/events?severity=severe&limit=5')
            .then(function (res) { return res.text(); })
            .then(function (html2) {
              var doc2 = parser.parseFromString('<div>' + html2 + '</div>', 'text/html');
              return {
                titles: doc2.querySelectorAll('.event-title'),
                areas: doc2.querySelectorAll('.event-area'),
              };
            });
        }
        return { titles: titles, areas: areas };
      })
      .then(function (result) {
        if (!result || !result.titles || result.titles.length === 0) return;

        // Check if the "no active events" message is shown
        var firstTitle = result.titles[0].textContent.trim();
        if (firstTitle === '' || firstTitle === 'No active events') return;

        var alertCount = result.titles.length;
        var text = firstTitle;
        if (result.areas && result.areas[0]) {
          var area = result.areas[0].textContent.trim();
          if (area && area !== '—') text += ' — ' + area;
        }
        if (alertCount > 1) {
          text += ' (+' + (alertCount - 1) + ' more)';
        }

        var banner = document.getElementById('alert-banner');
        var bannerText = document.getElementById('alert-banner-text');
        if (banner && bannerText) {
          bannerText.textContent = text;
          banner.removeAttribute('hidden');
        }

        // Update alert count stat
        var elAlerts = document.getElementById('stat-alerts');
        if (elAlerts) elAlerts.textContent = alertCount.toString();
      })
      .catch(function () {
        // SkyWatch unreachable — no banner shown
      });

    // Also get total alert count from stats endpoint
    fetch(SKYWATCH_API + '/api/stats')
      .then(function (res) { return res.text(); })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString('<div>' + html + '</div>', 'text/html');
        var totalEl = doc.querySelector('.stat-total .stat-number');
        if (totalEl) {
          var count = totalEl.textContent.trim();
          var elAlerts = document.getElementById('stat-alerts');
          if (elAlerts && count !== '0') elAlerts.textContent = count;
          else if (elAlerts && count === '0') elAlerts.textContent = '0';
        }
      })
      .catch(function () {});
  }

  // ── Alert banner dismiss ───────────────────
  var closeBtn = document.getElementById('alert-banner-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      var banner = document.getElementById('alert-banner');
      if (banner) banner.setAttribute('hidden', '');
    });
  }

  // ── Helpers ────────────────────────────────
  function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Init ───────────────────────────────────
  initReveal();
  loadBuilds();
  initMiniMap();
  loadMeshNodes();
  loadAlerts();

})();
