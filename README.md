# Nụ Xinh – Website hoa handmade

## Cài đặt & chạy
1. Cài Node.js bản LTS tại https://nodejs.org (kiểm tra: `node -v`).
2. Mở Terminal tại thư mục dự án: `cd hoa-handmade`
3. Cài thư viện: `npm install`
4. Chạy: `npm start` (hoặc `npm run dev` để tự khởi động lại khi sửa server.js)
5. Mở trình duyệt: http://localhost:3000

## Tùy chỉnh
- Thêm/sửa sản phẩm: `data/products.json` (không cần restart).
- Ảnh sản phẩm: bỏ file vào `public/images/` rồi ghi đúng tên ở trường `image`. Chưa có ảnh thì web hiện emoji + màu nền.
- Màu sắc: biến `:root` đầu file `public/css/style.css`.
- Tên shop, Zalo, địa chỉ: `public/index.html` và `public/js/app.js` (hàm `buy`).
- Thêm danh mục: thêm nút `.chip` trong index.html với `data-cat` trùng trường `category` trong JSON.

## Trang quản trị
- Địa chỉ: http://localhost:3000/admin.html (thêm, sửa, xóa sản phẩm, tải ảnh lên).
- Mật khẩu mặc định: `admin123`. **Hãy đổi trước khi đưa lên mạng:**
  - Mac/Linux: `ADMIN_PASSWORD=matkhau npm start`
  - Windows (PowerShell): `$env:ADMIN_PASSWORD="matkhau"; npm start`
- Thay đổi được ghi thẳng vào `data/products.json`; ảnh lưu trong `public/images/`.
- Trang chủ không có liên kết tới trang quản trị, chỉ bạn biết địa chỉ này.

## Sửa nội dung trang chủ
- Vào trang quản trị, chọn tab **Nội dung trang chủ**: sửa tên shop, tiêu đề banner, giới thiệu, địa chỉ, số điện thoại, Zalo, Facebook, Instagram, bản quyền.
- Dữ liệu lưu trong `data/site.json`. Để trống link Facebook/Instagram thì nút đó tự ẩn.
- Muốn thêm một ô nội dung mới: thêm khóa vào `data/site.json` và `SITE_KEYS` trong `server.js`, thêm dòng vào `SITE_FIELDS` trong `admin.js`, rồi gắn `data-site="tênKhóa"` vào phần tử HTML muốn thay đổi.

## Chỉnh trang chủ theo khối (bản mới)
Trang quản trị có 4 tab:
- **Khối trang chủ:** trang chủ gồm các khối xếp từ trên xuống. Mỗi khối có thể sửa, đổi thứ tự (↑ ↓), ẩn/hiện, xóa; thêm khối mới (Banner, Lưới sản phẩm, Đoạn văn bản, Kêu gọi hành động). Ô "Tên trên menu" quyết định khối có xuất hiện trên menu hay không. Có thể thêm nhiều khối "Lưới sản phẩm", mỗi khối chọn một danh mục riêng (ví dụ "Hoa cưới nổi bật").
- **Sản phẩm:** thêm, sửa, xóa, tải ảnh.
- **Danh mục:** thêm, đổi tên, sắp xếp, xóa danh mục (không xóa được nếu còn sản phẩm).
- **Thông tin shop:** tên, địa chỉ, điện thoại, Zalo, mạng xã hội, bản quyền.
Dữ liệu lưu trong `data/site.json` (khối + thông tin shop), `data/categories.json`, `data/products.json`.
Thêm loại khối mới: `BLOCK_FIELDS` (server.js), `BLOCKS` (admin.js), `renderers` (app.js).
