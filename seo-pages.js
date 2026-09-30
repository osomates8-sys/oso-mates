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
  /* Guías (páginas fijas): se incluyen en el sitemap */
  var GUIDES = ['guias.html', 'guia-como-curar-un-mate.html', 'guia-como-cebar-un-mate.html',
    'guia-como-cuidar-un-mate.html', 'guia-mate-calabaza-vs-algarrobo.html', 'guia-que-mate-regalar.html'];
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
    var extra = (p.material ? p.material + '. ' : '') + 'Hecho a mano en Mar del Plata. Envíos a todo el país.';
    return (d ? d + ' ' : '') + extra;
  }

  function productLD(p, url) {
    var imgs = (p.imagenes && p.imagenes.length ? p.imagenes : [p.imagen]).filter(Boolean).map(imgUrl);
    return {
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
  }

  function setAttrById(html, id, attr, value) {
    var re = new RegExp('(<[^>]*\\bid="' + id + '"[^>]*>)');
    return html.replace(re, function (tag) {
      var attrRe = new RegExp('\\b' + attr + '="[^"]*"');
      return tag.replace(attrRe, attr + '="' + esc(value) + '"');
    });
  }

  /* Arma la página de un producto a partir del HTML de producto.html */
  function buildProductPage(template, p, prods) {
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
      function (m, a, b) { return a + JSON.stringify(productLD(p, url)).replace(/</g, '\\u003c') + b; });
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

  function buildSitemap(prods) {
    var hoy = new Date().toISOString().slice(0, 10);
    var map = pageMap(prods);
    var urls = [[SITE, '1.0']].concat((prods || []).filter(function (p) { return p.activo !== false && p.id; })
      .map(function (p) { return [SITE + map[p.id], '0.8']; }))
      .concat(GUIDES.map(function (f) { return [SITE + f, '0.6']; }));
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map(function (u) {
        return '  <url>\n    <loc>' + u[0].replace(/&/g, '&amp;') + '</loc>\n    <lastmod>' + hoy +
          '</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>' + u[1] + '</priority>\n  </url>\n';
      }).join('') + '</urlset>\n';
  }

  var api = {
    SITE: SITE, OG_SIZE: OG_SIZE, slugify: slugify, pageMap: pageMap, productHref: productHref, productUrl: productUrl,
    imgUrl: imgUrl, ogImage: ogImage, buildProductPage: buildProductPage, buildSitemap: buildSitemap
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OM_SEO = api;
})(typeof window !== 'undefined' ? window : this);
