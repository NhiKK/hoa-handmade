// ===== Trang quản trị: khối trang chủ, sản phẩm, danh mục, thông tin shop =====
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => n.toLocaleString('vi-VN') + '₫';
let token = sessionStorage.getItem('token');
let products = [], cats = [], site = { settings: {}, blocks: [] };
const openIds = new Set();   // các khối đang mở rộng (giữ nguyên khi vẽ lại)

// ----- Định nghĩa các loại khối: [khóa, nhãn, kiểu]. Kiểu: area | cat | check | (mặc định: 1 dòng) -----
const BLOCKS = {
  hero: { name: 'Banner đầu trang', init: { title: 'Tiêu đề mới', text: '', buttonText: 'Xem ngay', buttonLink: '#' },
    fields: [['title', 'Tiêu đề', 'area'], ['text', 'Mô tả', 'area'], ['buttonText', 'Chữ trên nút (để trống = ẩn nút)'], ['buttonLink', 'Liên kết của nút (vd #bo-suu-tap hoặc https://…)']] },
  products: { name: 'Lưới sản phẩm', init: { title: 'Sản phẩm', category: '', showFilter: true, showSearch: true },
    fields: [['title', 'Tiêu đề'], ['category', 'Chỉ hiện danh mục', 'cat'], ['showFilter', 'Hiện nút lọc danh mục', 'check'], ['showSearch', 'Hiện ô tìm kiếm', 'check']] },
  text: { name: 'Đoạn văn bản', init: { title: 'Tiêu đề', body: '' },
    fields: [['title', 'Tiêu đề'], ['body', 'Nội dung', 'area']] },
  cta: { name: 'Kêu gọi hành động', init: { title: 'Tiêu đề', text: '', buttonText: 'Liên hệ ngay', buttonLink: '#contact' },
    fields: [['title', 'Tiêu đề'], ['text', 'Mô tả', 'area'], ['buttonText', 'Chữ trên nút'], ['buttonLink', 'Liên kết của nút']] }
};
const SETTINGS = [['shopName', 'Tên shop'], ['logoEmoji', 'Biểu tượng logo (emoji)'], ['address', 'Địa chỉ'],
  ['phone', 'Số điện thoại hiển thị'], ['zalo', 'Số Zalo', 'Chỉ nhập số. Dùng cho nút Chat Zalo và Đặt mua.'],
  ['facebook', 'Link Facebook', 'Để trống nếu muốn ẩn.'], ['instagram', 'Link Instagram', 'Để trống nếu muốn ẩn.'], ['copyright', 'Dòng bản quyền']];

// ----- Gọi API -----
async function api(url, method = 'GET', body) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (res.status === 401 && token) logout();
  if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');
  return data;
}
const say = (sel, t, err) => { $(sel).textContent = t; $(sel).className = 'msg' + (err ? ' err' : ''); };
const move = (arr, i, d) => { const j = i + d; if (j >= 0 && j < arr.length) [arr[i], arr[j]] = [arr[j], arr[i]]; };

// ----- Đăng nhập -----
function show() { $('#loginBox').hidden = !!token; $('#app').hidden = !token; if (token) init(); }
function logout() { token = null; sessionStorage.removeItem('token'); show(); }
$('#logout').onclick = logout;
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('#password').value }) });
    const d = await r.json(); if (!r.ok) throw new Error(d.error);
    token = d.token; sessionStorage.setItem('token', token); $('#password').value = ''; show();
  } catch (err) { say('#loginMsg', err.message, true); }
});
async function init() {
  [cats, site, products] = await Promise.all(['/api/categories', '/api/site', '/api/products'].map(u => fetch(u).then(r => r.json())));
  renderBlocks(); renderProducts(); renderCats(); renderSettings(); fillCatSelect();
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
  ['tabBlocks', 'tabProducts', 'tabCats', 'tabSettings'].forEach(id => ($('#' + id).hidden = id !== t.dataset.tab));
}));

// Lưu khối + thông tin shop (cùng 1 file site.json)
async function saveSite(msgSel) {
  try { site = await api('/api/site', 'PUT', site); renderBlocks(); renderSettings(); say(msgSel, 'Đã lưu. Tải lại trang chủ để xem thay đổi.'); }
  catch (err) { say(msgSel, err.message, true); }
}

// ================= KHỐI TRANG CHỦ =================
function fieldHtml(i, [k, label, type], b) {
  const at = `data-i="${i}" data-k="${k}"`;
  if (type === 'check') return `<label class="chk"><input type="checkbox" ${at} ${b[k] ? 'checked' : ''}> ${label}</label>`;
  let ctl;
  if (type === 'area') ctl = `<textarea rows="3" ${at}>${esc(b[k])}</textarea>`;
  else if (type === 'cat') ctl = `<select ${at}><option value="">Tất cả danh mục</option>${cats.map(c => `<option value="${esc(c.id)}" ${b[k] === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`;
  else ctl = `<input ${at} value="${esc(b[k])}">`;
  return `<label>${label}${ctl}</label>`;
}
function renderBlocks() {
  $('#blockList').innerHTML = site.blocks.map((b, i) => `
    <details class="block ${b.visible === false ? 'off' : ''}" data-id="${esc(b.id)}" ${openIds.has(b.id) ? 'open' : ''}>
      <summary><span class="bname"><strong>${BLOCKS[b.type].name}</strong> <small>${esc(b.title || '')}${b.visible === false ? ' (đang ẩn)' : ''}</small></span>
        <span class="btns">
          <button type="button" data-act="up" data-i="${i}" title="Lên">↑</button>
          <button type="button" data-act="down" data-i="${i}" title="Xuống">↓</button>
          <button type="button" data-act="vis" data-i="${i}">${b.visible === false ? 'Hiện' : 'Ẩn'}</button>
          <button type="button" data-act="del" data-i="${i}" class="danger">Xóa</button>
        </span></summary>
      <div class="fields">${BLOCKS[b.type].fields.map(f => fieldHtml(i, f, b)).join('')}
        <label>Tên trên menu <span class="hint">Để trống = không hiện trên menu</span><input data-i="${i}" data-k="menuLabel" value="${esc(b.menuLabel)}"></label>
      </div>
    </details>`).join('') || '<p class="hint">Chưa có khối nào. Hãy thêm khối ở bên dưới.</p>';
}
$('#blockList').addEventListener('toggle', e => { const d = e.target; d.open ? openIds.add(d.dataset.id) : openIds.delete(d.dataset.id); }, true);
$('#blockList').addEventListener('click', e => {
  const btn = e.target.closest('[data-act]'); if (!btn) return;
  e.preventDefault();
  const i = +btn.dataset.i, b = site.blocks[i];
  if (btn.dataset.act === 'up') move(site.blocks, i, -1);
  if (btn.dataset.act === 'down') move(site.blocks, i, 1);
  if (btn.dataset.act === 'vis') b.visible = b.visible === false;
  if (btn.dataset.act === 'del') { if (!confirm('Xóa khối này khỏi trang chủ?')) return; site.blocks.splice(i, 1); }
  renderBlocks();
});
$('#blockList').addEventListener('input', e => {            // gõ đến đâu lưu vào bộ nhớ đến đó; bấm "Lưu trang chủ" để ghi thật
  const t = e.target; if (!t.dataset.k) return;
  site.blocks[+t.dataset.i][t.dataset.k] = t.type === 'checkbox' ? t.checked : t.value;
});
$('#addBlock').onclick = () => {
  const type = $('#blockType').value, id = type + '-' + Date.now().toString(36);
  site.blocks.push({ id, type, visible: true, menuLabel: '', ...BLOCKS[type].init }); openIds.add(id); renderBlocks();
  say('#blocksMsg', 'Đã thêm khối. Nhớ bấm "Lưu trang chủ".');
};
$('#saveBlocks').onclick = () => saveSite('#blocksMsg');

// ================= THÔNG TIN SHOP =================
$('#settingsForm').addEventListener('input', e => { site.settings[e.target.dataset.k] = e.target.value; });
function renderSettings() {
  $('#settingsForm').innerHTML = SETTINGS.map(([k, label, hint]) =>
    `<label>${label}${hint ? ` <span class="hint">${hint}</span>` : ''}<input data-k="${k}" value="${esc(site.settings[k])}"></label>`).join('')
    + '<button class="btn">Lưu thông tin</button><p class="msg" id="settingsMsg" role="status"></p>';
}
$('#settingsForm').addEventListener('submit', e => { e.preventDefault(); saveSite('#settingsMsg'); });

// ================= DANH MỤC =================
function renderCats() {
  $('#catList').innerHTML = cats.map((c, i) => `
    <div class="item cat">
      <input data-i="${i}" value="${esc(c.name)}" aria-label="Tên danh mục" placeholder="Tên danh mục">
      <div class="btns"><button class="btn btn-ghost" data-act="up" data-i="${i}">↑</button><button class="btn btn-ghost" data-act="down" data-i="${i}">↓</button>
        <button class="btn btn-del" data-act="del" data-i="${i}">Xóa</button></div>
    </div>`).join('');
}
$('#catList').addEventListener('input', e => { cats[+e.target.dataset.i].name = e.target.value; });
$('#catList').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const i = +b.dataset.i;
  if (b.dataset.act === 'up') move(cats, i, -1);
  if (b.dataset.act === 'down') move(cats, i, 1);
  if (b.dataset.act === 'del') cats.splice(i, 1);
  renderCats();
});
$('#addCat').onclick = () => { cats.push({ id: '', name: '' }); renderCats(); $('#catList').lastElementChild.querySelector('input').focus(); };
$('#saveCats').onclick = async () => {
  try { cats = await api('/api/categories', 'PUT', cats); renderCats(); fillCatSelect(); renderBlocks(); renderProducts(); say('#catsMsg', 'Đã lưu danh mục.'); }
  catch (err) { say('#catsMsg', err.message, true); }
};

// ================= SẢN PHẨM =================
const catName = id => (cats.find(c => c.id === id) || {}).name || 'Chưa phân loại';
function fillCatSelect() {
  const cur = $('#category').value;
  $('#category').innerHTML = cats.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  if (cur) $('#category').value = cur;
}
function renderProducts() {
  $('#count').textContent = products.length;
  $('#list').innerHTML = products.map(p => `
    <div class="item">
      <div class="t" style="background-color:${esc(p.color)};background-image:url('${esc(p.image)}')">${esc(p.emoji)}</div>
      <div><strong>${esc(p.name)}</strong><small>${esc(catName(p.category))} · ${money(p.price)}</small></div>
      <div class="btns"><button class="btn btn-ghost" data-edit="${esc(p.id)}">Sửa</button><button class="btn btn-del" data-del="${esc(p.id)}">Xóa</button></div>
    </div>`).join('');
}
async function refreshProducts() { products = await (await fetch('/api/products')).json(); renderProducts(); }
$('#list').addEventListener('click', async e => {
  const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
  if (ed) fill(products.find(p => p.id === ed.dataset.edit));
  if (del && confirm('Xóa sản phẩm này? Không thể hoàn tác.')) {
    try { await api('/api/products/' + del.dataset.del, 'DELETE'); flash('Đã xóa sản phẩm'); refreshProducts(); }
    catch (err) { flash(err.message, true); }
  }
});
const fields = ['id', 'name', 'category', 'price', 'short', 'material', 'size', 'meaning', 'emoji', 'color', 'image'];
const flash = (t, err) => say('#msg', t, err);
function showPreview() {
  const img = $('#image').value; $('#preview').hidden = !img;
  $('#preview').style.cssText = `background-color:${$('#color').value};background-image:url('${img}')`;
}
function reset() { $('#form').reset(); $('#id').value = ''; $('#image').value = ''; $('#formTitle').textContent = 'Thêm sản phẩm mới'; $('#cancel').hidden = true; showPreview(); }
function fill(p) {
  fields.forEach(f => ($('#' + f).value = p[f] ?? ''));
  $('#formTitle').textContent = 'Sửa: ' + p.name; $('#cancel').hidden = false; showPreview(); scrollTo({ top: 0, behavior: 'smooth' });
}
$('#cancel').onclick = () => { reset(); flash(''); };
$('#color').oninput = showPreview;
$('#file').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  if (f.size > 5 * 1024 * 1024) return flash('Ảnh tối đa 5MB', true);
  const reader = new FileReader();
  reader.onload = async () => {
    try { flash('Đang tải ảnh…'); const r = await api('/api/upload', 'POST', { data: reader.result }); $('#image').value = r.path; showPreview(); flash('Đã tải ảnh lên'); }
    catch (err) { flash(err.message, true); }
  };
  reader.readAsDataURL(f);
});
$('#form').addEventListener('submit', async e => {
  e.preventDefault();
  const body = Object.fromEntries(fields.filter(f => f !== 'id').map(f => [f, $('#' + f).value])), id = $('#id').value;
  try { await api(id ? '/api/products/' + id : '/api/products', id ? 'PUT' : 'POST', body); flash(id ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm mới'); reset(); refreshProducts(); }
  catch (err) { flash(err.message, true); }
});

show();
