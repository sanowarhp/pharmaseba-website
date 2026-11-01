// build-legal-pages.js
// Chalao ~/pharmaseba-website folder theke:  node build-legal-pages.js <md-folder>
// <md-folder> = jekhane Privacy-Policy.md ar Terms-and-Conditions.md ache (app-er src/legal).
// Website-er privacy.html-ke template dhore app-privacy.html ar app-terms.html baniye dey.
// Purono privacy.html / terms.html (PC version) ar kono page-e hat dey na.
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
if (!dir) { console.error('Usage: node build-legal-pages.js <md-folder>'); process.exit(1); }
if (!fs.existsSync('privacy.html')) { console.error('privacy.html pai ni. ~/pharmaseba-website folder theke chalao.'); process.exit(1); }

const tpl = fs.readFileSync('privacy.html', 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const plain = (s) => s.replace(/\*\*/g, '').trim();

function convert(md) {
  const out = [];
  let title = '', updated = [], desc = '';
  let para = [], list = null; // list = { tag, items }
  const flushPara = () => {
    if (!para.length) return;
    const text = para.join(' ');
    if (!desc) desc = plain(text);
    out.push('    <p>' + para.map(inline).join('<br>\n    ') + '</p>');
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    out.push('    <' + list.tag + '>\n' + list.items.map((i) => '      <li>' + inline(i).split('\u0001').join('<br>\n        ') + '</li>').join('\n') + '\n    </' + list.tag + '>');
    list = null;
  };
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushPara(); flushList(); continue; }
    if (/^---+$/.test(line.trim())) { flushPara(); flushList(); continue; }
    let m;
    if ((m = line.match(/^#\s+(.+)/))) { title = plain(m[1]); continue; }
    if ((m = line.match(/^##\s+(.+)/))) { flushPara(); flushList(); out.push('\n    <h2>' + inline(m[1]) + '</h2>'); continue; }
    if ((m = line.match(/^\*\*(সর্বশেষ হালনাগাদ|সংস্করণ):\*\*\s*(.+)/))) { updated.push(m[1] + ': ' + m[2]); continue; }
    if ((m = line.match(/^(\s*)- (.+)/))) {
      flushPara();
      if (m[1].length >= 2 && list && list.tag === 'ul') { list.items[list.items.length - 1] += '\u0001' + m[2]; continue; } // nested bullet: ager item-er sathe jure dey
      if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; }
      list.items.push(m[2]); continue;
    }
    if ((m = line.match(/^\d+\.\s+(.+)/))) {
      flushPara();
      if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; }
      list.items.push(m[1]); continue;
    }
    flushList(); para.push(line.trim());
  }
  flushPara(); flushList();
  return { title, updated: updated.join(' · '), desc, body: out.join('\n') };
}

function build(mdFile, outFile, url) {
  const p = path.join(dir, mdFile);
  if (!fs.existsSync(p)) { console.error(p + ' pai ni'); process.exit(1); }
  const d = convert(fs.readFileSync(p, 'utf8'));
  const pageTitle = d.title + ' — PharmaSeba';
  const desc = esc(d.desc.slice(0, 160));
  const main = '<main>\n  <div class="wrap legal-hero">\n    <span class="kicker">আইনি তথ্য · মোবাইল অ্যাপ</span>\n    <h1>' + esc(d.title) + '</h1>\n    <p class="updated">' + esc(d.updated) + '</p>\n  </div>\n  <div class="wrap legal-content">\n' + d.body + '\n\n  </div>\n</main>';
  let html = tpl.replace(/<main>[\s\S]*<\/main>/, () => main);
  html = html.replace(/<title>[\s\S]*?<\/title>/, () => '<title>' + esc(pageTitle) + '</title>');
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, (_, a, b) => a + desc + b);
  html = html.replace(/(<meta property="og:title" content=")[^"]*(")/, (_, a, b) => a + esc(pageTitle) + b);
  html = html.replace(/(<meta property="og:description" content=")[^"]*(")/, (_, a, b) => a + desc + b);
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*(")/, (_, a, b) => a + esc(pageTitle) + b);
  html = html.replace(/(<meta name="twitter:description" content=")[^"]*(")/, (_, a, b) => a + desc + b);
  html = html.split('https://pharmaseba.com/privacy.html').join(url);
  fs.writeFileSync(outFile, html);
  console.log('OK  ' + outFile + '  ->  ' + url);
}

build('Privacy-Policy.md', 'app-privacy.html', 'https://pharmaseba.com/app-privacy');
build('Terms-and-Conditions.md', 'app-terms.html', 'https://pharmaseba.com/app-terms');

// sitemap.xml-e jog (ekbar-i)
if (fs.existsSync('sitemap.xml')) {
  let s = fs.readFileSync('sitemap.xml', 'utf8');
  for (const u of ['https://pharmaseba.com/app-privacy', 'https://pharmaseba.com/app-terms']) {
    if (!s.includes(u)) s = s.replace('</urlset>', '  <url><loc>' + u + '</loc></url>\n</urlset>');
  }
  fs.writeFileSync('sitemap.xml', s);
  console.log('OK  sitemap.xml');
}
