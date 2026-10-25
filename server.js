// ===== Server Express: website + API + trang quản trị =====
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
// const PORT = process.env.PORT || 3000;
// MẬT KHẨU QUẢN TRỊ: đổi ngay! Cách tốt nhất: ADMIN_PASSWORD=matkhaucuaban npm start
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const DATA_FILE = path.join(__dirname, 'data', 'products.json');
const IMG_DIR = path.join(__dirname, 'public', 'images');

app.use(express.json({ limit: '8mb' }));            // cho phép gửi ảnh dạng base64
app.use(express.static(path.join(__dirname, 'public')));

// Đọc / ghi dữ liệu sản phẩm
const load = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const save = list => fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf8');

// ---------- API công khai (cho trang chủ) ----------
app.get('/api/products', (req, res) => {
  const { category, q } = req.query;
  let list = load();
  if (category && category !== 'all') list = list.filter(p => p.category === category);
  if (q) {
    const kw = q.toLowerCase();
    list = list.filter(p => (p.name + ' ' + p.short).toLowerCase().includes(kw));
  }
  res.json(list);
});

app.get('/api/products/:id', (req, res) => {
  const p = load().find(x => x.id === req.params.id);
  p ? res.json(p) : res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
});

// ---------- Đăng nhập quản trị ----------
const tokens = new Set(); // token đăng nhập, mất khi restart server (phải đăng nhập lại)

app.post('/api/admin/login', (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Sai mật khẩu' });
  const token = crypto.randomBytes(24).toString('hex');
  tokens.add(token);
  res.json({ token });
});

// Middleware: chặn người chưa đăng nhập
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  tokens.has(token) ? next() : res.status(401).json({ error: 'Chưa đăng nhập' });
}

// Chỉ giữ các trường hợp lệ, ép kiểu giá
const clean = b => ({
  name: String(b.name || '').trim(),
  category: String(b.category || 'hoa-bo'),
  price: Math.max(0, Number(b.price) || 0),
  short: String(b.short || '').trim(),
  image: String(b.image || ''),
  emoji: String(b.emoji || '🌸'),
  color: /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : '#F8C8D4',
  material: String(b.material || '').trim(),
  size: String(b.size || '').trim(),
  meaning: String(b.meaning || '').trim()
});

// ---------- API quản trị (cần đăng nhập) ----------
app.post('/api/products', auth, (req, res) => {
  const p = clean(req.body);
  if (!p.name) return res.status(400).json({ error: 'Vui lòng nhập tên sản phẩm' });
  p.id = 'sp-' + Date.now();
  const list = load(); list.unshift(p); save(list);   // sản phẩm mới hiện đầu danh sách
  res.status(201).json(p);
});

app.put('/api/products/:id', auth, (req, res) => {
  const list = load(), i = list.findIndex(x => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  list[i] = { ...clean(req.body), id: list[i].id }; save(list);
  res.json(list[i]);
});

app.delete('/api/products/:id', auth, (req, res) => {
  const list = load(), next = list.filter(x => x.id !== req.params.id);
  if (next.length === list.length) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  save(next); res.json({ ok: true });
});

// Tải ảnh lên: nhận { data: "data:image/png;base64,..." }, lưu vào public/images/
app.post('/api/upload', auth, (req, res) => {
  const m = /^data:image\/(png|jpe?g|webp);base64,(.+)$/.exec(req.body.data || '');
  if (!m) return res.status(400).json({ error: 'Chỉ nhận ảnh PNG, JPG hoặc WEBP' });
  const name = `sp-${Date.now()}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
  fs.writeFileSync(path.join(IMG_DIR, name), Buffer.from(m[2], 'base64'));
  res.json({ path: 'images/' + name });
});

// ---------- Nội dung trang chủ (khối) & danh mục ----------
const SITE_FILE = path.join(__dirname, 'data', 'site.json');
const CAT_FILE = path.join(__dirname, 'data', 'categories.json');
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const writeJson = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2), 'utf8');
const S = (v, n = 1000) => String(v ?? '').trim().slice(0, n);
const slug = s => S(s, 40).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Trường cho phép của từng loại khối. Muốn thêm loại khối mới: thêm vào đây, admin.js (BLOCKS) và app.js (renderers)
const SETTING_KEYS = ['shopName', 'logoEmoji', 'address', 'phone', 'zalo', 'facebook', 'instagram', 'copyright'];
const BLOCK_FIELDS = { hero: ['title', 'text', 'buttonText', 'buttonLink'], products: ['title', 'category'],
  text: ['title', 'body'], cta: ['title', 'text', 'buttonText', 'buttonLink'] };
const BOOL_FIELDS = { products: ['showFilter', 'showSearch'] };

app.get('/api/site', (req, res) => res.json(readJson(SITE_FILE)));
app.get('/api/categories', (req, res) => res.json(readJson(CAT_FILE)));

app.put('/api/site', auth, (req, res) => {
  const { settings = {}, blocks = [] } = req.body;
  if (!Array.isArray(blocks)) return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  const st = { ...readJson(SITE_FILE).settings };
  SETTING_KEYS.forEach(k => { if (k in settings) st[k] = S(settings[k]); });
  st.zalo = st.zalo.replace(/\D/g, '');
  const seen = new Set();
  const list = blocks.filter(b => BLOCK_FIELDS[b.type]).slice(0, 50).map((b, i) => {
    let id = /^[a-z0-9-]{1,40}$/i.test(b.id) ? b.id : `${b.type}-${Date.now().toString(36)}${i}`;
    while (seen.has(id)) id += '-' + i;
    seen.add(id);
    const o = { id, type: b.type, visible: b.visible !== false, menuLabel: S(b.menuLabel, 40) };
    BLOCK_FIELDS[b.type].forEach(k => (o[k] = S(b[k])));
    (BOOL_FIELDS[b.type] || []).forEach(k => (o[k] = !!b[k]));
    return o;
  });
  const out = { settings: st, blocks: list };
  writeJson(SITE_FILE, out); res.json(out);
});

// Lưu danh sách danh mục (thêm, đổi tên, đổi thứ tự, xóa)
app.put('/api/categories', auth, (req, res) => {
  const seen = new Set(), list = [];
  (Array.isArray(req.body) ? req.body : []).forEach(c => {
    const name = S(c.name, 40); if (!name) return;
    let id = /^[a-z0-9-]{1,40}$/.test(c.id) ? c.id : (slug(name) || 'dm');
    while (seen.has(id)) id += '-' + (seen.size + 1);
    seen.add(id); list.push({ id, name });
  });
  if (!list.length) return res.status(400).json({ error: 'Cần có ít nhất 1 danh mục' });
  // Không cho xóa danh mục còn sản phẩm
  const old = readJson(CAT_FILE), inUse = new Set(load().map(p => p.category));
  const blocked = old.filter(c => inUse.has(c.id) && !seen.has(c.id)).map(c => c.name);
  if (blocked.length) return res.status(400).json({ error: `Danh mục còn sản phẩm: ${blocked.join(', ')}. Hãy chuyển sản phẩm sang danh mục khác trước khi xóa.` });
  writeJson(CAT_FILE, list); res.json(list);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});