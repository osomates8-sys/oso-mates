/* Oso Mates - páginas de producto para Google y para compartir.
   Cada producto tiene su propia página (ej: mate-imperial-algarrobo.html), que es
   una copia de producto.html con el título, la descripción, la foto (og:image)
   y el precio ya escritos en el HTML. Así WhatsApp, Instagram y Google ven el
   producto correcto sin tener que ejecutar JavaScript.

   La usan: index.html y producto.html (para armar los links),
   editar.html (regenera las páginas y el sitemap al guardar) y
   scripts/build-product-pages.js (lo mismo, desde la terminal). */
(function (root) {
  var SITE = 'https://osomates.com/';
  var OG_SIZE = 900;
  var PREFIX = { calabaza: 'mate-', madera: 'mate-', bombillas: 'bombilla-', combos: 'combo-' };
  /* Nombres viejos .jpg que en el repo están como .webp (igual que en index/producto/editar) */
  var IMG_MAP = {
    'camionero.jpg':'camionero.webp','imperial_algarrobo.jpg':'imperial_algarrobo.webp','imperial_algarrobo2.jpg':'imperial_algarrobo2.webp',
    'imperial_calabaza.jpg':'imperial_calabaza.webp','criollo.jpg':'criollo.webp','ranchero.jpg':'ranchero.webp','galleta.jpg':'galleta.webp',
    'foto_camionero_v2.jpg':'camionero.webp','foto_imperial_v2.jpg':'imperial_algarrobo.webp',
    'IMG_5190-Edit.jpg':'IMG_5190-Edit.webp','IMG_5206-Edit.jpg':'IMG_5206-Edit.webp','IMG_5161-Edit.jpg':'IMG_5161-Edit.webp',
    'IMG_5218-Edit-2-Edit.jpg':'IMG_5218-Edit-2-Edit.webp','IMG_5145.jpg':'IMG_5145.webp','IMG_5139.jpg':'IMG_5139.webp',
    'DSC08987.jpg':'DSC08987.webp','IMG_5233.jpg':'IMG_5233.webp','IMG_5277.jpg':'IMG_5277.webp','IMG_5272.jpg':'IMG_5272.webp'
  };

  function slugify(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }

  /* id de producto -> nombre de archivo. Si dos productos dan el mismo nombre,
     el segundo lleva "-2", etc. (en el orden de la lista). */
  function pageMap(prods) {
    var map = {}, used = {};
    (prods || []).forEach(function (p) {
      if (!p || !p.id) return;
      var base = (PREFIX[p.categoria] || '') + (slugify(p.nombre) || 'producto');
      var name = base, n = 2;
      while (used[name]) name = base + '-' + (n++);
      used[name] = true;
      map[p.id] = name + '.html';
    });
    return map;
  }

  /* Link relativo a la página de un producto (cae en producto.html?id= si no está en la lista) */
  function productHref(id, prods) {
    var f = pageMap(prods || root.FALLBACK_PRODUCTOS)[id];
    return f || ('producto.html?id=' + encodeURIComponent(id));
  }
  function productUrl(id, prods) { return SITE + productHref(id, prods); }

  function imgUrl(v) {
    var f = String(v || ''); var i = f.indexOf('|'); if (i > -1) f = f.slice(0, i);
    if (!f) return SITE + 'og-image.jpg';
    if (/^(https?:|data:)/.test(f)) return f;
    return SITE + (IMG_MAP[f] || f);
  }

  function splitImg(v) {
    var s = String(v || ''); var i = s.indexOf('|');
    return i === -1 ? { file: s, pos: '' } : { file: s.slice(0, i), pos: s.slice(i + 1) };
  }
  /* Posición de foco "48% 61%" -> {x:48, y:61} (mismo criterio que object-position) */
  function parsePos(pos) {
    var x = null, y = null;
    String(pos || '').trim().split(/\s+/).filter(Boolean).forEach(function (t) {
      t = t.toLowerCase();
      if (t === 'top') y = 0; else if (t === 'bottom') y = 100;
      else if (t === 'left') x = 0; else if (t === 'right') x = 100;
      else if (/^-?[\d.]+%$/.test(t)) { var n = parseFloat(t); if (x === null) x = n; else y = n; }
    });
    return { x: x === null ? 50 : x, y: y === null ? 50 : y };
  }
  /* Imagen para compartir (og:image): JPG cuadrado recortado sobre el foco de la
     primera foto. WhatsApp/Facebook no siempre muestran .webp. La genera editar.html
     (o scripts/build-product-pages.js) en og/<foto>-<x>-<y>.jpg */
  function ogImage(p) {
    var v = (p.imagenes && p.imagenes[0]) || p.imagen;
    var f = splitImg(v).file;
    if (!f || /^(https?:|data:)/.test(f)) return null;
    var src = IMG_MAP[f] || f;
    var pos = parsePos(splitImg(v).pos);
    return {
      src: src, x: pos.x, y: pos.y,
      path: 'og/' + src.replace(/\.[^.]+$/, '') + '-' + Math.round(pos.x) + '-' + Math.round(pos.y) + '.jpg'
    };
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmt(n) { return '$' + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  function describe(p) {
    var d = String(p.descripcion || '').trim();
    var extra = (p.material ? p.material + '. ' : '') + 'Desde Mar del Plata, envíos a todo el país.';
    return (d ? d + ' ' : '') + extra;
  }

  /* Opiniones de un producto (las que se cargan en editar.html → producto → Opiniones) */
  function reviewsFor(p, config) {
    var raw = config && config['resenas_' + p.id];
    if (!raw) return [];
    try {
      var list = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return (Array.isArray(list) ? list : []).filter(function (r) {
        return r && r.nombre && r.comentario && r.rating >= 1 && r.rating <= 5;
      });
    } catch (e) { return []; }
  }
  /* "5/9/2026" (formato del editor) -> "2026-09-05" */
  function isoDate(f) {
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(f || '').trim());
    if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
    return /^\d{4}-\d{2}-\d{2}/.test(f || '') ? String(f).slice(0, 10) : undefined;
  }
  /* Estrellas para Google: promedio + las últimas opiniones */
  function ratingLD(reviews) {
    if (!reviews || !reviews.length) return null;
    var avg = reviews.reduce(function (s, r) { return s + Number(r.rating); }, 0) / reviews.length;
    return {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: Math.round(avg * 10) / 10, reviewCount: reviews.length, bestRating: 5, worstRating: 1 },
      review: reviews.slice(-5).reverse().map(function (r) {
        return {
          '@type': 'Review',
          author: { '@type': 'Person', name: String(r.nombre) },
          datePublished: isoDate(r.fecha),
          reviewRating: { '@type': 'Rating', ratingValue: Number(r.rating), bestRating: 5, worstRating: 1 },
          reviewBody: String(r.comentario)
        };
      })
    };
  }

  function productLD(p, url, reviews) {
    var imgs = (p.imagenes && p.imagenes.length ? p.imagenes : [p.imagen]).filter(Boolean).map(imgUrl);
    var ld = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.nombre,
      image: imgs,
      description: String(p.descripcion || '').slice(0, 300),
      sku: p.id,
      category: p.material || p.categoria || undefined,
      brand: { '@type': 'Brand', name: 'Oso Mates' },
      offers: {
        '@type': 'Offer',
        url: url,
        priceCurrency: 'ARS',
        price: p.precio,
        availability: p.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: 'Oso Mates' }
      }
    };
    var rt = ratingLD(reviews);
    if (rt) { ld.aggregateRating = rt.aggregateRating; ld.review = rt.review; }
    return ld;
  }

  function setAttrById(html, id, attr, value) {
    var re = new RegExp('(<[^>]*\\bid="' + id + '"[^>]*>)');
    return html.replace(re, function (tag) {
      var attrRe = new RegExp('\\b' + attr + '="[^"]*"');
      return tag.replace(attrRe, attr + '="' + esc(value) + '"');
    });
  }

  /* Arma la página de un producto a partir del HTML de producto.html */
  /* config: FALLBACK_CONFIG (para leer las opiniones del producto) */
  function buildProductPage(template, p, prods, config) {
    var file = pageMap(prods)[p.id];
    var url = SITE + file;
    var title = p.nombre + ' — ' + (p.material ? p.material + ' | ' : '') + 'Oso Mates, mates artesanales';
    var desc = describe(p).slice(0, 300);
    var first = (p.imagenes && p.imagenes[0]) || p.imagen;
    var h = template;
    h = h.replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(title) + '</title>');
    h = setAttrById(h, 'meta-desc', 'content', desc.slice(0, 160));
    h = setAttrById(h, 'meta-og-title', 'content', p.nombre + ' — Oso Mates');
    h = setAttrById(h, 'meta-og-desc', 'content', desc);
    var og = ogImage(p);
    h = setAttrById(h, 'meta-og-image', 'content', og ? SITE + og.path : imgUrl(first));
    h = setAttrById(h, 'meta-og-url', 'content', url);
    h = setAttrById(h, 'link-canonical', 'href', url);
    h = h.replace(/(<script type="application\/ld\+json" id="product-ld">)[\s\S]*?(<\/script>)/,
      function (m, a, b) { return a + JSON.stringify(productLD(p, url, reviewsFor(p, config))).replace(/</g, '\\u003c') + b; });
    var extraMeta =
      '<meta property="product:price:amount" content="' + esc(p.precio) + '"/>\n' +
      '<meta property="product:price:currency" content="ARS"/>\n' +
      '<meta name="twitter:card" content="summary_large_image"/>\n' +
      (og ? '<meta property="og:image:width" content="' + OG_SIZE + '"/>\n<meta property="og:image:height" content="' + OG_SIZE + '"/>\n' : '') +
      '<script>window.OM_PROD_ID=' + JSON.stringify(String(p.id)) + ';</script>\n' +
      '<!-- Página generada automáticamente a partir de producto.html. No editar a mano: se pisa al guardar desde editar.html. -->\n';
    h = h.replace(/(<script type="application\/ld\+json" id="product-ld">)/, extraMeta + '$1');
    /* Resumen en texto plano para buscadores (se reemplaza apenas carga la página) */
    h = h.replace(/(<div id="product-content">)/, function (m, a) {
      return a + '\n  <div style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)"><h1>' + esc(p.nombre) +
        '</h1><p>' + esc(desc) + '</p><p>' + fmt(p.precio) + '</p></div>';
    });
    return h;
  }

  /* guides: lista de guías (guias-data.js). Si no se pasa, usa window.OM_GUIAS */
  function buildSitemap(prods, guides) {
    guides = guides || root.OM_GUIAS || [];
    var hoy = new Date().toISOString().slice(0, 10);
    var map = pageMap(prods);
    var urls = [[SITE, '1.0']].concat((prods || []).filter(function (p) { return p.activo !== false && p.id; })
      .map(function (p) { return [SITE + map[p.id], '0.8']; }))
      .concat(guides.length ? [[SITE + 'guias.html', '0.6']] : [])
      .concat(guides.map(function (g) { return [SITE + g.archivo, '0.6']; }));
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map(function (u) {
        return '  <url>\n    <loc>' + u[0].replace(/&/g, '&amp;') + '</loc>\n    <lastmod>' + hoy +
          '</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>' + u[1] + '</priority>\n  </url>\n';
      }).join('') + '</urlset>\n';
  }

  /* Catálogo de productos (productos.xml) para Google Merchant Center (Google Shopping)
     y Meta Commerce Manager (Instagram/Facebook). Formato RSS 2.0 con campos g:. */
  var CAT_GOOGLE = 'Home & Garden > Kitchen & Dining > Tableware > Drinkware';
  var TIPO = { calabaza: 'Mates > Calabaza', madera: 'Mates > Madera', bombillas: 'Bombillas', combos: 'Combos' };
  function xml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
  function feedTitle(p) {
    var n = String(p.nombre || '').trim();
    var base = /^(mate|bombilla|combo)\b/i.test(n) ? n
      : (p.categoria === 'bombillas' ? 'Bombilla ' : p.categoria === 'combos' ? 'Combo ' : 'Mate ') + n;
    return (base + (p.material ? ' — ' + p.material : '') + ' | Tallado a mano').slice(0, 150);
  }
  /* Próxima promo por fecha (o la que está corriendo) para el precio de oferta del catálogo.
     promos: lo que está en config.promos (texto JSON o lista). */
  function promoFeed(promos) {
    try { if (typeof promos === 'string') promos = JSON.parse(promos); } catch (e) { promos = null; }
    if (!Array.isArray(promos)) return null;
    var hoy = new Date().toISOString().slice(0, 10), mejor = null;
    promos.forEach(function (p) {
      var d = Math.round(Number(p && p.descuento) || 0);
      if (!p || !p.active || d <= 0 || d >= 100 || !p.desde || !p.hasta || p.hasta < hoy) return;
      if (!mejor || p.desde < mejor.desde) mejor = { desde: p.desde, hasta: p.hasta, descuento: d };
    });
    return mejor;
  }
  function buildFeed(prods, promos) {
    var map = pageMap(prods);
    var promo = promoFeed(promos);
    var items = (prods || []).filter(function (p) { return p && p.id && p.activo !== false && map[p.id]; }).map(function (p) {
      var og = ogImage(p);
      var img = og ? SITE + og.path : imgUrl((p.imagenes && p.imagenes[0]) || p.imagen);
      var stock = (p.stock === null || p.stock === undefined || p.stock === '') ? null : Math.max(0, parseInt(p.stock, 10) || 0);
      var desc = describe(p).slice(0, 5000);
      return '    <item>\n' +
        '      <g:id>' + xml(p.id) + '</g:id>\n' +
        '      <g:title>' + xml(feedTitle(p)) + '</g:title>\n' +
        '      <g:description>' + xml(desc) + '</g:description>\n' +
        '      <g:link>' + xml(SITE + map[p.id]) + '</g:link>\n' +
        '      <g:image_link>' + xml(img) + '</g:image_link>\n' +
        '      <g:availability>' + (stock === 0 ? 'out_of_stock' : 'in_stock') + '</g:availability>\n' +
        (stock !== null ? '      <g:quantity_to_sell_on_facebook>' + stock + '</g:quantity_to_sell_on_facebook>\n' : '') +
        '      <g:price>' + (Number(p.precio) || 0).toFixed(2) + ' ARS</g:price>\n' +
        (promo && p.precio ? '      <g:sale_price>' + (Math.round(Number(p.precio) * (1 - promo.descuento / 100) / 100) * 100).toFixed(2) + ' ARS</g:sale_price>\n' +
          '      <g:sale_price_effective_date>' + promo.desde + 'T00:00-03:00/' + promo.hasta + 'T23:59-03:00</g:sale_price_effective_date>\n' : '') +
        '      <g:condition>new</g:condition>\n' +
        '      <g:brand>Oso Mates</g:brand>\n' +
        '      <g:identifier_exists>no</g:identifier_exists>\n' +
        '      <g:google_product_category>' + xml(CAT_GOOGLE) + '</g:google_product_category>\n' +
        '      <g:product_type>' + xml(TIPO[p.categoria] || 'Mates') + '</g:product_type>\n' +
        '    </item>\n';
    });
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n' +
      '    <title>Oso Mates</title>\n    <link>' + SITE + '</link>\n' +
      '    <description>Mates artesanales tallados a mano. Desde Mar del Plata, envíos a todo el país</description>\n' +
      items.join('') + '  </channel>\n</rss>\n';
  }

  var api = {
    SITE: SITE, OG_SIZE: OG_SIZE, slugify: slugify, pageMap: pageMap, productHref: productHref, productUrl: productUrl,
    imgUrl: imgUrl, ogImage: ogImage, reviewsFor: reviewsFor, ratingLD: ratingLD, buildProductPage: buildProductPage, buildSitemap: buildSitemap, buildFeed: buildFeed
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OM_SEO = api;
})(typeof window !== 'undefined' ? window : this);
