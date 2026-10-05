/* Oso Mates - arma las páginas de las guías (guias.html y guia-*.html)
   a partir de guias-data.js. Lo usan editar.html (al guardar) y
   scripts/build-product-pages.js (desde la terminal).

   El texto de cada guía se escribe con este formato simple:
     ## Título de sección        -> título grande (y aparece en el índice "En esta guía")
     ### Subtítulo               -> subtítulo chico
     - algo                      -> lista con viñetas
     1. algo                     -> lista numerada
     > algo                      -> recuadro de consejo
     | a | b | c |               -> tabla (la primera fila son los títulos)
     **negrita**  *cursiva*  [texto del link](guia-como-curar-un-mate.html)
   Un renglón vacío separa párrafos. El primer párrafo sale más grande (bajada). */
(function (root) {
  var SITE = 'https://osomates.com/';
  var WA = 'https://wa.me/542233061168?text=Hola!%20Le%C3%AD%20la%20gu%C3%ADa%20y%20quer%C3%ADa%20consultar.';
  var CATS = {
    '*': 'Todos los mates', 'calabaza,madera': 'Mates de calabaza y madera',
    'calabaza': 'Solo calabaza', 'madera': 'Solo madera', 'bombillas': 'Bombillas', 'combos': 'Combos'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function slugify(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }
  function safeUrl(u) {
    u = String(u || '').trim();
    if (/^(https?:|mailto:|#)/i.test(u)) return u;
    if (/^[a-z0-9_\-./?=&%#]+$/i.test(u) && !/^[a-z]+:/i.test(u)) return u;
    return '#';
  }
  function inline(s) {
    var out = esc(s);
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, u) {
      var url = safeUrl(u.replace(/&amp;/g, '&'));
      var ext = /^https?:/i.test(url) ? ' target="_blank" rel="noopener"' : '';
      return '<a href="' + esc(url) + '"' + ext + '>' + t + '</a>';
    });
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
    return out;
  }

  /* Texto con formato simple -> {html, toc:[{id,text}]} */
  function render(text) {
    var lines = String(text || '').replace(/\r/g, '').split('\n');
    var html = [], toc = [], used = {}, i = 0, firstP = true;
    function id(t) {
      var b = slugify(t) || 'seccion', n = b, k = 2;
      while (used[n]) n = b + '-' + (k++);
      used[n] = true; return n;
    }
    while (i < lines.length) {
      var l = lines[i], t = l.trim();
      if (!t) { i++; continue; }
      var m;
      if ((m = /^###\s+(.*)$/.exec(t))) { html.push('<h3>' + inline(m[1]) + '</h3>'); i++; continue; }
      if ((m = /^##\s+(.*)$/.exec(t))) {
        var hid = id(m[1]); toc.push({ id: hid, text: m[1] });
        html.push('<h2 id="' + hid + '">' + inline(m[1]) + '</h2>'); i++; continue;
      }
      if (/^[-*]\s+/.test(t)) {
        var items = [];
        while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) { items.push('<li>' + inline(lines[i].trim().replace(/^[-*]\s+/, '')) + '</li>'); i++; }
        html.push('<ul>\n' + items.join('\n') + '\n</ul>'); continue;
      }
      if (/^\d+[.)]\s+/.test(t)) {
        var oitems = [];
        while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) { oitems.push('<li>' + inline(lines[i].trim().replace(/^\d+[.)]\s+/, '')) + '</li>'); i++; }
        html.push('<ol>\n' + oitems.join('\n') + '\n</ol>'); continue;
      }
      if (/^>/.test(t)) {
        var tip = [];
        while (i < lines.length && /^>/.test(lines[i].trim())) { tip.push(lines[i].trim().replace(/^>\s?/, '')); i++; }
        html.push('<div class="tip"><p>' + inline(tip.join(' ')) + '</p></div>'); continue;
      }
      if (/^\|/.test(t)) {
        var rows = [];
        while (i < lines.length && /^\|/.test(lines[i].trim())) {
          var cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
          if (!cells.every(function (c) { return /^:?-{2,}:?$/.test(c); })) rows.push(cells);
          i++;
        }
        var tb = rows.map(function (r, ri) {
          var tag = ri === 0 ? 'th' : 'td';
          return '<tr>' + r.map(function (c) { return '<' + tag + '>' + inline(c) + '</' + tag + '>'; }).join('') + '</tr>';
        });
        html.push('<div class="table-wrap"><table class="compare">\n' + tb.join('\n') + '\n</table></div>'); continue;
      }
      var para = [];
      while (i < lines.length && lines[i].trim() && !/^(#{2,3}\s|[-*]\s|\d+[.)]\s|>|\|)/.test(lines[i].trim())) { para.push(lines[i].trim()); i++; }
      html.push('<p' + (firstP && !toc.length ? ' class="lead"' : '') + '>' + inline(para.join(' ')) + '</p>');
      firstP = false;
    }
    return { html: html.join('\n'), toc: toc };
  }

  function words(text) { return String(text || '').replace(/[#>*|\-\[\]()]/g, ' ').split(/\s+/).filter(Boolean).length; }

  /* Nombre de archivo para una guía nueva, sin repetir los que ya existen */
  function fileFor(g, guides) {
    if (g.archivo) return g.archivo;
    var base = 'guia-' + (slugify(g.titulo + ' ' + (g.titulo_cursiva || '')) || 'nueva'), name = base + '.html', n = 2;
    var taken = (guides || []).map(function (x) { return x.archivo; });
    while (taken.indexOf(name) !== -1) name = base + '-' + (n++) + '.html';
    return name;
  }
  function fullTitle(g) { return (g.titulo + (g.titulo_cursiva ? ' ' + g.titulo_cursiva : '')).trim(); }

  var PIXEL = '<!-- Meta Pixel -->\n<script>\n!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?\n' +
    'n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;\n' +
    "n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;\n" +
    't.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,\n' +
    "document,'script','https://connect.facebook.net/en_US/fbevents.js');\n" +
    "fbq('init', '1690890908657661');\nfbq('track', 'PageView');\n</script>\n" +
    '<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1690890908657661&ev=PageView&noscript=1"/></noscript>\n<!-- End Meta Pixel -->';

  function head(title, desc, url, ld, ogType) {
    return '<!DOCTYPE html>\n<html lang="es">\n<head>\n' +
      "<script>(function(){try{var t=localStorage.getItem('om_theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();</script>\n" +
      '<meta charset="UTF-8"/>\n<meta name="viewport" content="width=device-width, initial-scale=1.0"/>\n' +
      '<title>' + esc(title) + '</title>\n' +
      '<meta name="description" content="' + esc(desc) + '"/>\n' +
      '<link rel="canonical" href="' + url + '"/>\n' +
      '<meta property="og:title" content="' + esc(title) + '"/>\n' +
      '<meta property="og:description" content="' + esc(desc) + '"/>\n' +
      '<meta property="og:type" content="' + ogType + '"/>\n' +
      '<meta property="og:url" content="' + url + '"/>\n' +
      '<meta property="og:image" content="' + SITE + 'og-image.jpg"/>\n' +
      '<meta property="og:image:width" content="1080"/>\n<meta property="og:image:height" content="1080"/>\n' +
      '<meta property="og:locale" content="es_AR"/>\n<meta name="twitter:card" content="summary_large_image"/>\n' +
      '<link rel="icon" href="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'90\'>🧉</text></svg>"/>\n' +
      '<link rel="preconnect" href="https://fonts.googleapis.com"/>\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>\n' +
      '<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Montserrat:wght@300;400;500;600&display=swap"/>\n' +
      '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet" media="print" onload="this.media=\'all\'"/>\n' +
      '<noscript><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet"/></noscript>\n' +
      '<link rel="stylesheet" href="guias.css"/>\n' +
      '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script>\n' +
      '<script src="fallback-data.js"></script>\n<script src="seo-pages.js"></script>\n<script src="analytics.js"></script>\n' +
      PIXEL + '\n</head>\n<body>\n<!-- Página generada automáticamente desde guias-data.js. No editar a mano: se pisa al guardar desde editar.html. -->\n<nav>\n' +
      '  <a href="index.html" class="logo">Oso <em style="font-style:italic">Mates</em></a>\n' +
      '  <div class="nav-links">\n    <a href="guias.html">Guías</a>\n    <a href="index.html#catalogo">Ver mates &#8594;</a>\n  </div>\n</nav>\n<main>\n';
  }
  var FOOT = '\n</main>\n<footer>\n  <div class="footer-logo">Oso Mates</div>\n' +
    '  <div class="footer-copy">&#169; 2026 &#8212; Mates artesanales desde Mar del Plata</div>\n' +
    '  <div class="footer-copy" style="margin-top:.6rem"><a href="guias.html">Guías</a> · <a href="index.html#catalogo">Catálogo</a> · <a href="empresas.html">Empresas</a> · <a href="legales.html">Política de privacidad y términos</a></div>\n' +
    '</footer>\n<script src="guias.js"></script>\n</body>\n</html>\n';

  function crumbs(items) {
    return '<div class="crumbs">' + items.map(function (it) {
      return it[1] ? '<a href="' + it[1] + '">' + esc(it[0]) + '</a>' : esc(it[0]);
    }).join(' / ') + '</div>\n';
  }
  function breadcrumbLD(items) {
    return { '@type': 'BreadcrumbList', itemListElement: items.map(function (it, i) {
      return { '@type': 'ListItem', position: i + 1, name: it[0], item: SITE + (it[1] === 'index.html' ? '' : it[1]) };
    }) };
  }
  function titleHtml(g) {
    return esc(g.titulo) + (g.titulo_cursiva ? '<br/><em>' + esc(g.titulo_cursiva) + '</em>' : '');
  }

  function buildGuidePage(g, guides) {
    var file = g.archivo, url = SITE + file, name = fullTitle(g);
    var trail = [['Inicio', 'index.html'], ['Guías', 'guias.html'], [name, file]];
    var ld = { '@context': 'https://schema.org', '@graph': [
      { '@type': 'Article', headline: name, description: g.descripcion, inLanguage: 'es-AR',
        datePublished: g.fecha, dateModified: g.fecha, mainEntityOfPage: url, image: SITE + 'og-image.jpg',
        author: { '@type': 'Organization', name: 'Oso Mates', url: SITE },
        publisher: { '@type': 'Organization', name: 'Oso Mates', url: SITE } },
      breadcrumbLD(trail)] };
    var r = render(g.texto);
    var mins = Math.max(2, Math.round(words(g.texto) / 200));
    var out = head(g.titulo_seo || (name + ' | Oso Mates'), g.descripcion, url, ld, 'article');
    out += crumbs([['Inicio', 'index.html'], ['Guías', 'guias.html'], [name]]);
    out += '<div class="page-eyebrow">' + esc(g.etiqueta) + '</div>\n<h1 class="page-title">' + titleHtml(g) + '</h1>\n';
    out += '<p class="meta">Oso Mates · Mar del Plata · Lectura de ' + mins + ' minutos</p>\n';
    var body = r.html;
    if (r.toc.length >= 2) {
      var toc = '<div class="toc"><div class="toc-title">En esta guía</div><ol>\n' +
        r.toc.map(function (t) { return '<li><a href="#' + t.id + '">' + inline(t.text.replace(/^\d+[.)]\s*/, '')) + '</a></li>'; }).join('\n') + '\n</ol></div>';
      var at = body.indexOf('<h2 ');
      body = at === -1 ? body : body.slice(0, at) + toc + '\n\n' + body.slice(at);
    }
    out += body + '\n';
    out += '<div class="recos" data-cats="' + esc(g.recomendados || '*') + '" data-title="' + esc(g.recomendados_titulo || 'Nuestros mates') + '"></div>\n';
    out += '<div class="cta">\n  <p>¿Te quedó alguna duda? Escribinos y te respondemos personalmente.</p>\n' +
      '  <a class="btn" href="' + WA + '" target="_blank" rel="noopener">Consultar por WhatsApp</a>\n' +
      '  <a class="btn ghost" href="index.html#catalogo">Ver todos los mates</a>\n</div>\n';
    var others = (guides || []).filter(function (o) { return o.archivo !== file; });
    if (others.length) {
      out += '<div class="more"><div class="more-title">Otras guías</div>\n' +
        others.map(function (o) { return '  <a href="' + o.archivo + '">' + esc(fullTitle(o)) + ' &#8594;</a>'; }).join('\n') + '\n</div>';
    }
    return out + FOOT;
  }

  function buildHub(guides) {
    var url = SITE + 'guias.html';
    var desc = 'Guías prácticas de Oso Mates para disfrutar tu mate: cómo curarlo, cebarlo, cuidarlo y elegir el indicado.';
    var ld = { '@context': 'https://schema.org', '@graph': [
      { '@type': 'CollectionPage', name: 'Guías del mate', description: desc, url: url, inLanguage: 'es-AR',
        hasPart: guides.map(function (g) { return { '@type': 'Article', headline: fullTitle(g), url: SITE + g.archivo }; }) },
      breadcrumbLD([['Inicio', 'index.html'], ['Guías', 'guias.html']])] };
    var out = head('Guías del mate: curar, cebar, cuidar y elegir tu mate | Oso Mates', desc.slice(0, 300), url, ld, 'website');
    out += crumbs([['Inicio', 'index.html'], ['Guías']]);
    out += '<div class="page-eyebrow">Aprendé a disfrutarlo</div>\n<h1 class="page-title">Guías <em>del mate</em></h1>\n' +
      '<p class="lead">Todo lo que necesitás saber para que tu mate dure años y cada ronda salga rica: cómo curarlo, cebarlo, cuidarlo y elegir el indicado.</p>\n' +
      '<div class="guide-list">\n';
    guides.forEach(function (g) {
      out += '  <a class="guide-card" href="' + g.archivo + '">\n    <div class="g-eyebrow">' + esc(g.etiqueta) + '</div>\n' +
        '    <div class="g-title">' + esc(fullTitle(g)) + '</div>\n    <div class="g-desc">' + esc(g.descripcion) + '</div>\n  </a>\n';
    });
    out += '</div>\n<div class="recos" data-cats="*" data-title="Nuestros mates"></div>';
    return out + FOOT;
  }

  /* Archivo guias-data.js completo (lo escribe editar.html al guardar) */
  function buildDataFile(guides) {
    return '/* Oso Mates - contenido de las guías. Se edita desde editar.html (sección "Guías").\n' +
      '   Al guardar se regeneran guias.html y cada guia-*.html a partir de estos datos. */\n' +
      'window.OM_GUIAS = ' + JSON.stringify(guides, null, 2) + ';\n';
  }

  /* Revisa que una guía tenga lo mínimo. Devuelve una lista de problemas (vacía si está bien). */
  function validate(g) {
    var errs = [];
    if (!String(g.titulo || '').trim()) errs.push('falta el título');
    if (!String(g.texto || '').trim()) errs.push('falta el texto');
    if (!String(g.descripcion || '').trim()) errs.push('falta la descripción para Google');
    return errs;
  }

  var api = {
    CATS: CATS, render: render, fileFor: fileFor, fullTitle: fullTitle, validate: validate,
    buildGuidePage: buildGuidePage, buildHub: buildHub, buildDataFile: buildDataFile
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OM_GUIAS_PAGES = api;
})(typeof window !== 'undefined' ? window : this);
