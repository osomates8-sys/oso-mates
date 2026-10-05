/* Oso Mates - promos por fecha ("Cyber Oso", "Black Oso").
   Se configuran en editar.html → "Promos por fecha" (clave promos en fallback-data.js).
   Mientras una promo está activa:
   - baja el precio de todos los productos (precio y precio por transferencia) en toda la página,
     así el catálogo, el carrito, el checkout y las cuotas ya muestran el precio con descuento;
   - muestra el cartel de arriba con cuenta regresiva y el precio "antes" en cada mate;
   - los cupones no se suman (la promo ya es el descuento).
   Unos días antes, el cartel avisa que se viene. Se carga justo después de fallback-data.js. */
(function () {
  var lista = [];
  try {
    var raw = (window.FALLBACK_CONFIG || {}).promos;
    lista = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
  } catch (e) { lista = []; }
  if (!Array.isArray(lista)) lista = [];

  var AVISO_DIAS = 7;
  function dia(s, fin) {
    var p = String(s || '').split('-');
    if (p.length !== 3) return null;
    return fin ? new Date(+p[0], +p[1] - 1, +p[2], 23, 59, 59) : new Date(+p[0], +p[1] - 1, +p[2]);
  }
  var ahora = new Date(), activa = null, proxima = null;
  lista.forEach(function (p) {
    var d = Math.round(Number(p && p.descuento) || 0);
    if (!p || !p.active || d <= 0 || d >= 100) return;
    var desde = dia(p.desde), hasta = dia(p.hasta, true);
    if (!desde || !hasta) return;
    var x = { nombre: p.nombre || 'Promo', descuento: d, desde: desde, hasta: hasta };
    if (ahora >= desde && ahora <= hasta) { if (!activa) activa = x; }
    else if (desde > ahora && desde - ahora <= AVISO_DIAS * 864e5 && (!proxima || desde < proxima.desde)) proxima = x;
  });
  window.OM_PROMO = { activa: activa, proxima: proxima };

  /* ---- Precios con descuento ---- */
  if (activa) {
    var f = 1 - activa.descuento / 100;
    var redondear = function (n) { return Math.round(n * f / 100) * 100; };
    (window.FALLBACK_PRODUCTOS || []).forEach(function (p) {
      if (!p || !p.precio || p.precio_lista) return;
      p.precio_lista = p.precio;
      p.precio = redondear(p.precio);
      if (p.precio_transferencia) p.precio_transferencia = redondear(p.precio_transferencia);
      p.badge = activa.nombre + ' −' + activa.descuento + '%';
    });
  }

  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function fechaLarga(d) {
    var dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return dias[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1);
  }
  function cuenta(hasta) {
    var ms = Math.max(0, hasta - new Date()), s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
    var two = function (n) { return (n < 10 ? '0' : '') + n; };
    return (d ? d + 'd ' : '') + two(h) + ':' + two(m) + ':' + two(ss);
  }
  /* Texto para el detalle del pedido (mail y WhatsApp) */
  window.promoDetalle = function () { return activa ? ' | ' + activa.nombre + ': −' + activa.descuento + '% ya aplicado en los precios' : ''; };

  var reloj = null;
  function cartel() {
    var t = document.getElementById('promo-banner-text');
    if (!t) return;
    if (reloj) clearInterval(reloj);
    var pb = document.getElementById('promo-banner');
    if (activa) {
      var pinta = function () {
        if (new Date() > activa.hasta) { location.reload(); return; }
        t.innerHTML = '&#x1F525; <strong>' + esc(activa.nombre.toUpperCase()) + '</strong> · ' + activa.descuento +
          '% OFF en todo &nbsp;|&nbsp; Termina en <strong>' + cuenta(activa.hasta) + '</strong>';
      };
      pinta(); reloj = setInterval(pinta, 1000);
    } else if (proxima) {
      t.innerHTML = '&#x1F525; Se viene <strong>' + esc(proxima.nombre) + '</strong>: ' + proxima.descuento +
        '% OFF en todo desde el ' + fechaLarga(proxima.desde);
    } else return;
    if (pb) pb.style.display = '';
  }

  /* Página de cada mate: "Antes $X" y cuenta regresiva debajo del precio */
  function precioAntes() {
    if (!activa) return;
    var box = document.getElementById('product-price');
    if (!box || document.getElementById('promo-antes')) return;
    var p = null; try { p = currentProd; } catch (e) {}
    var antes = p && p.precio_lista;
    if (!antes) return;
    var fmtp = typeof fmt === 'function' ? fmt : function (n) { return '$' + Math.round(n).toLocaleString('es-AR'); };
    var el = document.createElement('div');
    el.id = 'promo-antes';
    el.className = 'promo-antes';
    box.parentNode.insertBefore(el, box);
    var pinta = function () {
      el.innerHTML = 'Antes <s>' + fmtp(antes) + '</s> · ' + esc(activa.nombre) + ' termina en <strong>' + cuenta(activa.hasta) + '</strong>';
    };
    pinta(); setInterval(pinta, 1000);
  }

  function estilos() {
    if (!activa) return;
    var css = document.createElement('style');
    css.textContent =
      '.promo-antes{font-size:.72rem;color:var(--mid);margin-bottom:.5rem;line-height:1.8;}' +
      '.promo-antes s{color:var(--gray);}.promo-antes strong{color:var(--black);font-weight:600;}';
    document.head.appendChild(css);
  }

  function iniciar() {
    estilos();
    cartel();
    window.addEventListener('load', function () { setTimeout(cartel, 400); });
    /* el precio del mate se dibuja después de cargar el producto */
    var n = 0, iv = setInterval(function () { precioAntes(); if (document.getElementById('promo-antes') || ++n > 40) clearInterval(iv); }, 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
