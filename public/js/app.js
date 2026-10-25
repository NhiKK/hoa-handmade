// ===== Trang chủ: dựng các khối từ /api/site, sản phẩm từ /api/products =====
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeLink = u => (/^(https?:\/\/|#|\/|tel:|mailto:)/.test(u || '') ? u : '#');
const money = n => n.toLocaleString('vi-VN') + '₫';
const imgStyle = p => `background-color:${esc(p.color)};background-image:url('${esc(p.image)}')`;

let site = { settings: { zalo: '0900000000' }, blocks: [] }, cats = [], products = [], current = null, cart = 0;
const states = {};   // trạng thái lọc/tìm kiếm của từng khối sản phẩm

// Ảnh thật tải được thì ẩn emoji
function hideEmojiIfImage(el, src) { const i = new Image(); i.onload = () => (el.textContent = ''); i.src = src; }

// ----- MẪU HIỂN THỊ TỪNG LOẠI KHỐI (muốn thêm loại mới: thêm 1 hàm ở đây) -----
const renderers = {
  hero: b => `<section id="${esc(b.id)}" class="hero">
    <div class="hero-text"><h1>${esc(b.title)}</h1><p>${esc(b.text)}</p>
      ${b.buttonText ? `<a href="${esc(safeLink(b.buttonLink))}" class="btn">${esc(b.buttonText)}</a>` : ''}</div>
    <div class="hero-art" aria-hidden="true"><span class="petal p1">🌷</span><span class="petal p2">🌸</span><span class="petal p3">🌼</span></div>
  </section>`,

  products: b => `<section id="${esc(b.id)}" class="section" data-products="${esc(b.id)}">
    ${b.title ? `<h2>${esc(b.title)}</h2>` : ''}
    <div class="toolbar">
      ${b.showFilter && !b.category ? `<div class="chips"><button class="chip active" data-cat="all">Tất cả</button>
        ${cats.map(c => `<button class="chip" data-cat="${esc(c.id)}">${esc(c.name)}</button>`).join('')}</div>` : '<span></span>'}
      ${b.showSearch ? '<input type="search" class="search" placeholder="Tìm hoa theo tên…" aria-label="Tìm sản phẩm">' : ''}
    </div>
    <div class="grid"></div>
    <p class="empty" hidden>Chưa có sản phẩm phù hợp. Thử từ khóa khác hoặc chọn "Tất cả".</p>
  </section>`,

  text: b => `<section id="${esc(b.id)}" class="section about"><h2>${esc(b.title)}</h2><p>${esc(b.body).replace(/\n/g, '<br>')}</p></section>`,

  cta: b => `<section id="${esc(b.id)}" class="cta"><h2>${esc(b.title)}</h2><p>${esc(b.text)}</p>
    ${b.buttonText ? `<a href="${esc(safeLink(b.buttonLink))}" class="btn">${esc(b.buttonText)}</a>` : ''}</section>`
};

const card = p => `<article class="card">
  <div class="thumb" style="${imgStyle(p)}" role="img" aria-label="${esc(p.name)}">${esc(p.emoji)}</div>
  <div class="card-body"><h3>${esc(p.name)}</h3><p>${esc(p.short)}</p><span class="price">${money(p.price)}</span>
    <div class="card-actions">
      <button class="btn btn-ghost" data-detail="${esc(p.id)}">Xem chi tiết</button>
      <button class="btn" data-buy="${esc(p.id)}">Đặt mua</button>
    </div></div></article>`;

// Vẽ lại lưới sản phẩm của 1 khối theo bộ lọc hiện tại
function drawProducts(b) {
  const sec = document.getElementById(b.id), st = states[b.id];
  const list = products.filter(p => (b.category ? p.category === b.category : st.cat === 'all' || p.category === st.cat)
    && (p.name + ' ' + p.short).toLowerCase().includes(st.kw));
  sec.querySelector('.empty').hidden = list.length > 0;
  const grid = sec.querySelector('.grid');
  grid.innerHTML = list.map(card).join('');
  grid.querySelectorAll('.thumb').forEach((el, i) => hideEmojiIfImage(el, list[i].image));
}

function build() {
  const blocks = site.blocks.filter(b => b.visible !== false && renderers[b.type]);
  $('#blocks').innerHTML = blocks.map(b => renderers[b.type](b)).join('');
  blocks.filter(b => b.type === 'products').forEach(b => { states[b.id] = { cat: 'all', kw: '' }; drawProducts(b); });
  // Menu: mỗi khối có "tên trên menu" sẽ thành 1 mục; "Liên hệ" luôn cuối
  $('#nav').innerHTML = blocks.filter(b => b.menuLabel).map(b => `<a href="#${esc(b.id)}">${esc(b.menuLabel)}</a>`).join('')
    + '<a href="#contact">Liên hệ</a>';
}

// Thông tin chung: tên shop, liên hệ, mạng xã hội
function applySettings() {
  const s = site.settings;
  document.querySelectorAll('[data-site]').forEach(el => { if (s[el.dataset.site]) el.textContent = s[el.dataset.site]; });
  document.title = `${s.shopName} – Hoa handmade`;
  const link = (cls, href) => document.querySelectorAll('.' + cls).forEach(a => (href ? (a.href = href) : (a.hidden = true)));
  link('zalo-link', s.zalo && 'https://zalo.me/' + s.zalo);
  link('facebook-link', s.facebook);
  link('instagram-link', s.instagram);
  link('tel-link', s.phone && 'tel:' + s.phone.replace(/\D/g, ''));
}

// ----- Modal & đặt mua -----
function openModal(p) {
  current = p;
  $('#mImg').style.cssText = imgStyle(p); $('#mImg').textContent = p.emoji; hideEmojiIfImage($('#mImg'), p.image);
  $('#mTitle').textContent = p.name; $('#mPrice').textContent = money(p.price);
  $('#mMaterial').textContent = p.material; $('#mSize').textContent = p.size; $('#mMeaning').textContent = p.meaning;
  $('#modal').hidden = false;
}
const closeModal = () => ($('#modal').hidden = true);
function buy(p) {                       // mở Zalo kèm tin nhắn sẵn; số Zalo chỉnh ở trang quản trị
  $('#cartCount').textContent = ++cart;
  window.open(`https://zalo.me/${site.settings.zalo}?text=${encodeURIComponent(`Mình muốn đặt: ${p.name} (${money(p.price)})`)}`, '_blank');
}

// ----- Sự kiện (gắn 1 lần, dùng cho mọi khối) -----
document.addEventListener('click', e => {
  const find = id => products.find(p => p.id === id);
  const d = e.target.closest('[data-detail]'), b = e.target.closest('[data-buy]'), c = e.target.closest('.chip');
  if (d) openModal(find(d.dataset.detail));
  if (b) buy(find(b.dataset.buy));
  if (c) {
    const sec = c.closest('[data-products]');
    sec.querySelectorAll('.chip').forEach(x => x.classList.toggle('active', x === c));
    states[sec.dataset.products].cat = c.dataset.cat;
    drawProducts(site.blocks.find(x => x.id === sec.dataset.products));
  }
  if (e.target === $('#modal') || e.target.closest('#closeModal')) closeModal();
});
document.addEventListener('input', e => {
  if (!e.target.matches('.search')) return;
  const sec = e.target.closest('[data-products]');
  states[sec.dataset.products].kw = e.target.value.trim().toLowerCase();
  drawProducts(site.blocks.find(x => x.id === sec.dataset.products));
});
document.addEventListener('keydown', e => e.key === 'Escape' && closeModal());
$('#addCart').onclick = () => current && buy(current);
$('#menuBtn').onclick = () => $('#nav').classList.toggle('open');
$('#nav').onclick = () => $('#nav').classList.remove('open');

// ----- Khởi động -----
(async () => {
  try {
    [site, cats, products] = await Promise.all(['/api/site', '/api/categories', '/api/products'].map(u => fetch(u).then(r => r.json())));
  } catch { $('#blocks').innerHTML = '<p class="empty">Không tải được nội dung. Hãy tải lại trang.</p>'; return; }
  applySettings(); build();
  try { if (location.hash) document.querySelector(location.hash)?.scrollIntoView(); } catch {}
})();
