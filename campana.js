/* Oso Mates - campaña de temporada (Día de la Madre).
   Se configura en editar.html → "Campaña Día de la Madre" (clave campana_madre).
   - Inicio: cambia el cartel de arriba por la fecha límite para que llegue a tiempo
     y agrega la sección "Regalale un mate a mamá" con el aviso del sorteo de Instagram.
   - Página de cada mate: avisa si el pedido llega antes del Día de la Madre.
   Todo se apaga solo después de la fecha. Necesita entrega.js. */
(function () {
  var cfg = null;
  try {
    var raw = (window.FALLBACK_CONFIG || {}).campana_madre;
    cfg = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) { cfg = null; }
  if (!cfg || !cfg.active || !cfg.fecha || typeof calcEntrega !== 'function') return;

  function dia(s) { var p = String(s || '').split('-'); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; }
  function finDe(d) { return d ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59) : null; }
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }

  var ahora = new Date();
  var fecha = dia(cfg.fecha);                       /* domingo del Día de la Madre */
  if (!fecha || ahora > finDe(fecha)) return;
  var limite = new Date(fecha); limite.setDate(limite.getDate() - 1); /* tiene que llegar antes */
  var nombre = cfg.titulo || 'Día de la Madre';
  var sorteoHasta = dia(cfg.sorteo_hasta), sorteoDia = dia(cfg.sorteo_dia);
  var sorteoAbierto = !!(cfg.sorteo_premio && sorteoHasta && ahora <= finDe(sorteoHasta));

  var ZONAS = [
    { label: 'Mar del Plata', cost: 0, days: 'En el día', mismoDia: true },
    { label: 'CABA y GBA', cost: 4500, days: '2-3 días hábiles' },
    { label: 'Interior del país', cost: 6500, days: '4-7 días hábiles' },
    { label: 'Patagonia y zonas extremas', cost: 8500, days: '7-10 días hábiles' }
  ];
  function zonas() {
    try { if (typeof _shipZones !== 'undefined' && Array.isArray(_shipZones) && _shipZones.length) return _shipZones; } catch (e) {}
    return ZONAS;
  }
  function plazos(grabado) {
    return zonas().map(function (z) { return { z: z, hasta: ultimoDiaPedido(z, grabado, limite, ahora) }; });
  }

  /* ---- Página de cada mate: "¿llega para el Día de la Madre?" ---- */
  window.campanaNota = function (e) {
    if (!e) return '';
    var tope = finDe(limite);
    if (e.hasta <= tope) return '<span class="entrega-madre ok">&#x1F337; Llega antes del ' + esc(nombre) + ' (domingo ' + fecha.getDate() + ')</span>';
    if (e.desde <= tope) return '<span class="entrega-madre">&#x1F337; Puede llegar justo para el ' + esc(nombre) + '. Si lo necesitás seguro, escribinos por WhatsApp.</span>';
    return '<span class="entrega-madre no">&#x1F337; A esta zona ya no llega antes del ' + esc(nombre) + '.</span>';
  };

  function estilos() {
    if (document.getElementById('campana-css')) return;
    var css = document.createElement('style');
    css.id = 'campana-css';
    css.textContent =
      '.entrega-madre{display:block;margin-top:.35rem;font-size:.7rem;color:var(--mid);}' +
      '.entrega-madre.ok{color:var(--green,#2e7d32);font-weight:600;}' +
      '[data-theme="dark"] .entrega-madre.ok{color:#7ccf8a;}' +
      '#dia-madre{padding:5rem 4rem;background:#f6eee8;}' +
      '[data-theme="dark"] #dia-madre{background:#221d1b;}' +
      '#dia-madre .dm-head{max-width:1200px;margin:0 auto 2.2rem;}' +
      '#dia-madre .dm-eyebrow{font-size:.62rem;letter-spacing:.28em;text-transform:uppercase;color:var(--warm);margin-bottom:.8rem;}' +
      '#dia-madre .dm-title{font-family:"Cormorant Garamond",serif;font-size:clamp(2rem,4.5vw,3rem);font-weight:300;line-height:1.1;color:var(--black);margin-bottom:1rem;}' +
      '#dia-madre .dm-plazos{font-size:.8rem;line-height:1.9;color:var(--mid);}' +
      '#dia-madre .dm-plazos strong{color:var(--black);font-weight:600;}' +
      '#dia-madre .dm-grid{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:1.4rem;}' +
      '#dia-madre .dm-card{text-decoration:none;color:inherit;display:block;cursor:pointer;}' +
      '#dia-madre .dm-card img{width:100%;aspect-ratio:3/4;object-fit:cover;display:block;background:var(--light);margin-bottom:.7rem;}' +
      '#dia-madre .dm-name{font-family:"Cormorant Garamond",serif;font-size:1.25rem;color:var(--black);}' +
      '#dia-madre .dm-price{font-size:.72rem;color:var(--mid);margin-top:.2rem;}' +
      '#dia-madre .dm-sorteo{max-width:1200px;margin:2.4rem auto 0;border:1px solid var(--warm);padding:1.6rem 1.8rem;display:flex;gap:1.5rem;align-items:center;justify-content:space-between;flex-wrap:wrap;background:var(--white);}' +
      '#dia-madre .dm-sorteo-t{font-family:"Cormorant Garamond",serif;font-size:1.6rem;color:var(--black);margin-bottom:.3rem;}' +
      '#dia-madre .dm-sorteo p{font-size:.78rem;line-height:1.7;color:var(--mid);max-width:620px;}' +
      '#dia-madre .dm-btns{display:flex;gap:.6rem;flex-wrap:wrap;}' +
      '#dia-madre .dm-btn{display:inline-block;background:var(--black);color:var(--white);text-decoration:none;font-size:.6rem;letter-spacing:.18em;text-transform:uppercase;padding:.9rem 1.4rem;}' +
      '#dia-madre .dm-btn.ghost{background:none;color:var(--black);border:1px solid var(--black);}' +
      '@media(max-width:768px){#dia-madre{padding:3.5rem 1rem;}#dia-madre .dm-grid{grid-template-columns:repeat(2,1fr);gap:1rem;}#dia-madre .dm-sorteo{padding:1.3rem 1.1rem;}}';
    document.head.appendChild(css);
  }

  function textoPlazos() {
    var sin = plazos(false), con = plazos(true), partes = [];
    sin.forEach(function (p, i) {
      if (p.hasta) {
        var g = con[i].hasta;
        partes.push('<strong>' + esc(p.z.label) + ':</strong> pedí hasta el ' + fechaCorta(p.hasta, true) +
          (g ? ' (con grabado, hasta el ' + fechaCorta(g, false) + ')' : ' (con grabado ya no llega)'));
      } else {
        var quizas = ultimoDiaPedido(p.z, false, limite, ahora, true);
        partes.push('<strong>' + esc(p.z.label) + ':</strong> ' + (quizas
          ? 'pedí hasta el ' + fechaCorta(quizas, true) + ' y puede llegar a tiempo; escribinos por WhatsApp y lo confirmamos.'
          : 'ya no llega antes del ' + esc(nombre) + '.'));
      }
    });
    return partes.join('<br>');
  }

  /* ---- Inicio: cartel de arriba ---- */
  function cartel() {
    var t = document.getElementById('promo-banner-text');
    if (!t) return;
    var caba = null, mdp = null;
    plazos(false).forEach(function (p) {
      if (p.z.mismoDia) mdp = p.hasta; else if (!caba && p.hasta) caba = { d: p.hasta, z: p.z };
    });
    var txt = '&#x1F337; ' + esc(nombre) + ' · domingo ' + fecha.getDate() + ' &nbsp;|&nbsp; ';
    if (caba) txt += 'Para que llegue a ' + esc(caba.z.label) + ' pedí hasta el <strong>' + fechaCorta(caba.d, false) + '</strong>';
    else if (mdp) txt += 'En Mar del Plata pedí hasta el <strong>' + fechaCorta(mdp, false) + '</strong>';
    else txt += '<strong>Regalos para mamá</strong>';
    if (sorteoAbierto) txt += ' &nbsp;|&nbsp; Sorteo en Instagram';
    t.innerHTML = '<a href="#dia-madre" style="color:inherit;text-decoration:none">' + txt + ' &#x2192;</a>';
    var pb = document.getElementById('promo-banner'); if (pb) pb.style.display = '';
  }

  /* ---- Inicio: sección "Regalale un mate a mamá" ---- */
  function seccion() {
    var antes = document.getElementById('bestsellers');
    if (!antes || document.getElementById('dia-madre')) return;
    var prods = (window.FALLBACK_PRODUCTOS || []).filter(function (p) {
      return p.activo !== false && p.imagen && !(p.stock !== null && p.stock !== undefined && p.stock !== '' && parseInt(p.stock, 10) <= 0);
    });
    prods.sort(function (a, b) { return (b.ofrece_grabado !== false) - (a.ofrece_grabado !== false); });
    var cards = prods.slice(0, 4).map(function (p) {
      var href = window.OM_SEO ? OM_SEO.productHref(p.id) : 'producto.html?id=' + encodeURIComponent(p.id);
      var img = typeof getImg === 'function' ? getImg(p.imagen) : p.imagen;
      var pos = typeof getImgPos === 'function' ? getImgPos(p.imagen) : 'center';
      var precio = typeof fmt === 'function' ? fmt(p.precio) : '$' + p.precio;
      return '<a class="dm-card" href="' + esc(href) + '"><img src="' + esc(img) + '" alt="' + esc(p.nombre) + '" loading="lazy" style="object-position:' + esc(pos) + '"/>' +
        '<div class="dm-name">' + esc(p.nombre) + '</div><div class="dm-price">' + precio + (p.ofrece_grabado !== false ? ' · se puede grabar' : '') + '</div></a>';
    }).join('');
    var sorteo = '';
    if (sorteoAbierto) {
      var link = cfg.sorteo_link || 'https://www.instagram.com/oso_mates/';
      sorteo = '<div class="dm-sorteo"><div><div class="dm-sorteo-t">&#x1F381; Sorteo en Instagram</div>' +
        '<p>Sorteamos <strong>' + esc(cfg.sorteo_premio) + '</strong> para el ' + esc(nombre) + '. Participá en nuestro posteo de @oso_mates hasta el ' + fechaCorta(sorteoHasta, true) + '.' +
        (sorteoDia ? ' Sorteamos el ' + fechaCorta(sorteoDia, true) + '.' : '') + ' No hace falta comprar.</p></div>' +
        '<div class="dm-btns"><a class="dm-btn" href="' + esc(link) + '" target="_blank" rel="noopener">Participar en Instagram</a>' +
        '<a class="dm-btn ghost" href="sorteo-dia-de-la-madre.html">Bases y condiciones</a></div></div>';
    }
    var sec = document.createElement('section');
    sec.id = 'dia-madre';
    sec.innerHTML = '<div class="dm-head"><div class="dm-eyebrow">' + esc(nombre) + ' · domingo ' + fecha.getDate() + ' de ' + fechaCorta(fecha, true).split(' de ')[1] + '</div>' +
      '<h2 class="dm-title">Regalale un mate <em>a mamá</em></h2>' +
      '<div class="dm-plazos">' + textoPlazos() + '</div></div>' +
      (cards ? '<div class="dm-grid">' + cards + '</div>' : '') + sorteo;
    antes.parentNode.insertBefore(sec, antes);
  }

  function iniciar() {
    estilos();
    seccion();
    cartel();
    /* el cartel de arriba también lo carga la configuración; lo volvemos a poner al final */
    window.addEventListener('load', function () { setTimeout(cartel, 300); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
