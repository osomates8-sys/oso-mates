#!/usr/bin/env node
/* Genera las páginas de producto (mate-*.html, etc.) y sitemap.xml desde la terminal.
   Hace lo mismo que editar.html al guardar. Uso: node scripts/build-product-pages.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const SEO = require('../seo-pages.js');

const root = path.join(__dirname, '..');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'fallback-data.js'), 'utf8'), sandbox);
const prods = sandbox.window.FALLBACK_PRODUCTOS || [];
const tpl = fs.readFileSync(path.join(root, 'producto.html'), 'utf8');
const map = SEO.pageMap(prods);

for (const p of prods) {
  const og = SEO.ogImage(p);
  if (og && !fs.existsSync(path.join(root, og.path))) {
    fs.mkdirSync(path.join(root, 'og'), { recursive: true });
    execFileSync('python3', [path.join(__dirname, 'make-og-image.py'), path.join(root, og.src), path.join(root, og.path),
      String(og.x), String(og.y), String(SEO.OG_SIZE)], { stdio: 'inherit' });
    console.log('✓', og.path);
  }
  fs.writeFileSync(path.join(root, map[p.id]), SEO.buildProductPage(tpl, p, prods));
  console.log('✓', map[p.id]);
}
const vigentes = new Set(Object.values(map));
for (const f of fs.readdirSync(root)) {
  if (/^(mate|bombilla|combo)-.+\.html$/.test(f) && !vigentes.has(f)) {
    fs.unlinkSync(path.join(root, f));
    console.log('✗ borrada', f);
  }
}
fs.writeFileSync(path.join(root, 'sitemap.xml'), SEO.buildSitemap(prods));
console.log('✓ sitemap.xml');
