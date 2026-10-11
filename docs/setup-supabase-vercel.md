# Cài đặt Supabase + Vercel (Việt Ego Lab)

## Kiến trúc

| Phần | Nằm ở | Ghi chú |
|---|---|---|
| Web bán hàng `/` | Vercel (tĩnh) | Đọc sản phẩm từ Supabase bằng anon key; chưa cấu hình thì dùng `js/products.js` |
| API `/api/orders`, `/api/subscribe` | Vercel Functions (`api/`) | Dùng service-role key; giá và tổng tiền tính trong DB (`create_order`) |
| Quản trị `/admin` | Vercel (tĩnh) + Supabase Auth | Chỉ user có trong bảng `admins` mới đọc/ghi được (RLS) |
| Database, ảnh | Supabase | `supabase/schema.sql`, bucket `product-images` |

## 1. Tạo database

1. Tạo project tại <https://supabase.com/dashboard> (region gần nhất: Singapore).
2. Vào **SQL Editor**, chạy lần lượt toàn bộ nội dung:
   - `supabase/schema.sql` (bảng, phân quyền, hàm tạo đơn, bucket ảnh)
   - `supabase/analytics.sql` (thống kê truy cập cho biểu đồ ở `/admin`; ghi lượt xem ẩn danh qua `/api/track`, không lưu IP)
   - `supabase/brief-alignment.sql` (5 sản phẩm theo brief, các trường trang chi tiết sản phẩm, bảng `articles` cho Tạp chí mùi hương)

## Trang web (theo brief)

| Trang | File | Nội dung |
|---|---|---|
| Trang chủ | `index.html` | 7 phần: Hero → Tuyên ngôn |
| Về Việt Ego Lab | `about.html` | Câu chuyện, nguồn cảm hứng, ý nghĩa tên, triết lý, tuyên ngôn |
| Danh mục sản phẩm | `products.html`, `product.html?id=` | Bộ lọc (bộ sưu tập / nhóm hương chỉ hiện khi có dữ liệu), trang chi tiết |
| Tạp chí mùi hương | `journal.html`, `article.html?slug=` | 4 chuyên mục, bài viết quản lý ở `/admin` → Tạp chí |

Quy tắc nội dung (brief VI): không tự điền giá, nốt hương, thành phần khi chưa được xác nhận. Ô để trống trong admin hiển thị "Đang cập nhật"; sản phẩm chưa có giá không đặt mua được. Ảnh stock được gắn nhãn "Ảnh minh họa".
   Hai file chạy lại nhiều lần vẫn an toàn.

## 2. Tạo tài khoản admin

1. **Authentication → Users → Add user → Create new user**: nhập email + mật khẩu, tick *Auto Confirm User*.
2. Vào **SQL Editor**, cấp quyền admin:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'email-admin@vidu.com';
   ```
3. Khuyến nghị: **Authentication → Sign In / Providers → Email**, tắt *Allow new users to sign up* để người lạ không tự tạo tài khoản (họ cũng không có quyền admin, nhưng tắt cho gọn).

## 3. Nối web với Supabase

Lấy trong **Project Settings → API**:

- `Project URL` và `anon public` key → điền vào `js/config.js`.
- `service_role` key → **chỉ** đặt trong Vercel env, không bao giờ đưa vào code.

## 4. Biến môi trường trên Vercel

Project → **Settings → Environment Variables** (hoặc CLI):

```bash
npx vercel env add SUPABASE_URL production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

Sau đó deploy lại: `npx vercel deploy --prod`.

## 5. Kiểm tra

- Mở `/admin`, đăng nhập bằng tài khoản ở bước 2.
- Đặt thử một đơn ở trang chủ → đơn hiện ở tab **Đơn hàng**.
- Tắt "Đang bán" một sản phẩm → sản phẩm biến mất ở trang chủ sau khi tải lại.

## Bảo mật: điểm cần nhớ

- `anon` key công khai là bình thường; quyền do RLS trong `schema.sql` quyết định.
- `service_role` key bỏ qua mọi RLS: lộ key = lộ toàn bộ dữ liệu. Nếu lỡ lộ, vào **Project Settings → API** để tạo lại key.
- Khách không gọi được `create_order` trực tiếp; chỉ API trên Vercel gọi được.
