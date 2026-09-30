/* Oso Mates - guías: arma "Mates recomendados" con el catálogo actual (fallback-data.js).
   En cada guía: <div class="recos" data-cats="madera,calabaza" data-title="..."></div> */
(function () {
  var box = document.querySelector('.recos[data-cats]');
  if (!box || !window.OM_SEO) return;
  var cats = box.getAttribute('data-cats').split(',');
  var prods = (window.FALLBACK_PRODUCTOS || []).filter(function (p) {
    return p.activo !== false && (cats[0] === '*' || cats.indexOf(p.categoria) !== -1);
  }).slice(0, 3);
  if (!prods.length) { box.remove(); return; }
  function esc(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  box.innerHTML = '<div class="recos-title">' + esc(box.getAttribute('data-title') || 'Mates recomendados') + '</div>' +
    '<div class="recos-grid">' + prods.map(function (p) {
      var img = (p.imagenes && p.imagenes[0]) || p.imagen || '';
      var pos = img.indexOf('|') > -1 ? img.slice(img.indexOf('|') + 1) : 'center';
      return '<a class="reco" href="' + OM_SEO.productHref(p.id) + '"><img src="' + OM_SEO.imgUrl(img) + '" alt="Mate ' + esc(p.nombre) +
        '" loading="lazy" style="object-position:' + esc(pos) + '"/><div class="reco-name">' + esc(p.nombre) +
        '</div><div class="reco-mat">' + esc(p.material) + '</div></a>';
    }).join('') + '</div>';
})();
