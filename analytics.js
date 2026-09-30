/* Oso Mates - Google Analytics 4.
   El ID de medición (G-XXXXXXX) se carga desde editar.html -> "Google Analytics"
   y queda guardado en fallback-data.js (ga_id). Si está vacío, no se carga nada. */
(function () {
  var cfg = window.FALLBACK_CONFIG || {};
  var id = String(cfg.ga_id || '').trim().toUpperCase();
  window.omTrack = function () {};
  if (!/^G-[A-Z0-9]{4,}$/.test(id)) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', id);
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(s);

  function item(p, qty) {
    return { item_id: p.id, item_name: p.nombre, item_category: p.categoria, price: Number(p.precio) || 0, quantity: qty || 1 };
  }
  /* Eventos de comercio electrónico: view_item, add_to_cart, begin_checkout */
  window.omTrack = function (event, data) {
    try {
      if (event === 'view_item' || event === 'add_to_cart') {
        window.gtag('event', event, { currency: 'ARS', value: Number(data.precio) || 0, items: [item(data)] });
      } else if (event === 'begin_checkout') {
        window.gtag('event', event, {
          currency: 'ARS', value: Number(data.total) || 0,
          items: (data.items || []).map(function (i) { return item(i, i.qty); })
        });
      }
    } catch (e) {}
  };
})();
