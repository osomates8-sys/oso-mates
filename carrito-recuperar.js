/* Oso Mates - carrito abandonado.
   El carrito ya queda guardado en el navegador del cliente (om_cart). Este script:
   1) Al entrar, actualiza el carrito con el catálogo actual: precios, nombres y fotos;
      saca los mates que ya no están o no tienen stock, y ajusta la cantidad al stock.
   2) Si el cliente dejó cosas en el carrito y vuelve después de un rato
      (más de 30 minutos sin tocarlo), le muestra "Te quedó esto en el carrito"
      con un botón para terminar la compra. Se muestra una sola vez por visita.
   Lo usan index.html y producto.html (y las páginas mate-*.html). */
(function () {
  var MIN_AUSENCIA = 30 * 60 * 1000;

  function ls(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }
  function ss(k, v) {
    try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; }
  }
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function money(n) { return typeof fmt === 'function' ? fmt(n) : '$' + Math.round(n).toLocaleString('es-AR'); }

  /* 1) Sincronizar el carrito con el catálogo actual */
  function sincronizar() {
    if (typeof cart === 'undefined' || !Array.isArray(cart) || !cart.length) return false;
    var cat = window.FALLBACK_PRODUCTOS || [];
    if (!cat.length) return false;
    var cambio = false, porProducto = {};
    var nuevo = [];
    cart.forEach(function (it) {
      var p = cat.find(function (x) { return x.id === it.id; });
      if (!p || p.activo === false) { cambio = true; return; }
      ['nombre', 'precio', 'precio_transferencia', 'imagen', 'material', 'stock', 'categoria'].forEach(function (k) {
        if (p[k] !== undefined && it[k] !== p[k]) { it[k] = p[k]; cambio = true; }
      });
      var s = (p.stock === null || p.stock === undefined || p.stock === '') ? null : Math.max(0, parseInt(p.stock, 10) || 0);
      if (s !== null) {
        var ya = porProducto[it.id] || 0;
        var max = Math.max(0, s - ya);
        if (it.qty > max) { it.qty = max; cambio = true; }
        if (it.qty <= 0) { cambio = true; return; }
        porProducto[it.id] = ya + it.qty;
      }
      nuevo.push(it);
    });
    if (cambio) {
      cart.length = 0; Array.prototype.push.apply(cart, nuevo);
      if (typeof updateCartUI === 'function') updateCartUI();
    }
    return cambio;
  }

  /* 2) Aviso "Te quedó esto en el carrito" */
  function mostrarAviso() {
    if (ss('om_cart_avisado')) return;
    if (typeof cart === 'undefined' || !cart.length) return;
    var ts = parseInt(ls('om_cart_ts') || '0', 10);
    if (!ts || Date.now() - ts < MIN_AUSENCIA) return;
    ss('om_cart_avisado', '1');

    var css = document.createElement('style');
    css.textContent =
      '.om-reminder{position:fixed;left:1rem;bottom:1rem;z-index:950;width:min(360px,calc(100vw - 2rem));background:var(--white,#f8f8f6);color:var(--black,#0a0a0a);border:1px solid var(--light,#ebebeb);box-shadow:0 12px 40px rgba(0,0,0,.18);padding:1.1rem 1.2rem 1.2rem;font-family:Montserrat,sans-serif;animation:omRemIn .35s ease;}' +
      'body.has-buy-bar .om-reminder{bottom:96px;}' +
      '@media(max-width:600px){body.om-rem-open .wa-float{display:none!important;}}' +
      '@keyframes omRemIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}' +
      '.om-reminder-x{position:absolute;top:.4rem;right:.5rem;background:none;border:none;font-size:1.1rem;line-height:1;color:var(--gray,#6f6f6f);cursor:pointer;padding:.3rem;}' +
      '.om-reminder-t{font-family:"Cormorant Garamond",serif;font-size:1.35rem;line-height:1.15;margin:0 1.5rem .8rem 0;}' +
      '.om-reminder-items{display:flex;flex-direction:column;gap:.5rem;margin-bottom:.8rem;}' +
      '.om-reminder-it{display:flex;align-items:center;gap:.7rem;font-size:.75rem;}' +
      '.om-reminder-it img{width:44px;height:44px;object-fit:cover;flex-shrink:0;background:var(--light,#ebebeb);}' +
      '.om-reminder-more{font-size:.68rem;color:var(--gray,#6f6f6f);}' +
      '.om-reminder-total{font-size:.72rem;color:var(--mid,#444);margin-bottom:.9rem;}' +
      '.om-reminder-total strong{color:var(--black,#0a0a0a);}' +
      '.om-reminder-btn{display:block;width:100%;padding:.9rem;background:var(--black,#0a0a0a);color:var(--white,#f8f8f6);border:none;font-family:Montserrat,sans-serif;font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;cursor:pointer;}';
    document.head.appendChild(css);

    var items = cart.slice(0, 3).map(function (it) {
      var img = typeof getImg === 'function' ? getImg(it.imagen) : '';
      var pos = typeof getImgPos === 'function' ? getImgPos(it.imagen) : 'center';
      return '<div class="om-reminder-it">' + (img ? '<img src="' + esc(img) + '" alt="" style="object-position:' + esc(pos) + '"/>' : '') +
        '<span>' + esc(it.nombre) + (it.qty > 1 ? ' × ' + it.qty : '') + '</span></div>';
    }).join('');
    var resto = cart.length > 3 ? '<div class="om-reminder-more">y ' + (cart.length - 3) + ' más</div>' : '';
    var totalT = typeof cartTransferTotal === 'function' ? cartTransferTotal() : 0;
    var unico = cart.length === 1 && cart[0].stock === 1;

    var box = document.createElement('div');
    box.className = 'om-reminder';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Te quedó esto en el carrito');
    box.innerHTML =
      '<button type="button" class="om-reminder-x" aria-label="Cerrar">✕</button>' +
      '<div class="om-reminder-t">Te quedó esto en el carrito 🧉</div>' +
      '<div class="om-reminder-items">' + items + resto + '</div>' +
      (totalT ? '<div class="om-reminder-total">Total por transferencia: <strong>' + money(totalT) + '</strong>' +
        (unico ? '<br>Es la última pieza: cada mate es único.' : '') + '</div>' : '') +
      '<button type="button" class="om-reminder-btn">Terminar compra</button>';
    document.body.appendChild(box);
    document.body.classList.add('om-rem-open');

    function cerrar() { box.remove(); document.body.classList.remove('om-rem-open'); }
    box.querySelector('.om-reminder-x').onclick = cerrar;
    box.querySelector('.om-reminder-btn').onclick = function () {
      cerrar();
      if (typeof window.gtag === 'function') { try { window.gtag('event', 'carrito_recuperado', { items: cart.length }); } catch (e) {} }
      if (typeof toggleCart === 'function') toggleCart();
    };
  }

  function iniciar() {
    /* La actualización automática no es actividad del cliente: se conserva la hora de su último cambio */
    var tsAntes = ls('om_cart_ts');
    sincronizar();
    if (tsAntes) ls('om_cart_ts', tsAntes);
    setTimeout(mostrarAviso, 2500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
