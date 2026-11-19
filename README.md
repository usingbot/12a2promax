# 12A2 Pro Max — Vintage Memories

Lưu bút trực tuyến của lớp 12A2, niên khóa 2026–2027. Trang chủ mở bằng một lá thư trên nền bản đồ sao. Bốn khung Polaroid bao quanh lá thư. Người xem có thể bước vào không gian ảnh trôi, mở từng ảnh, nghe nhạc, xem album hoặc gửi kỷ niệm để ban quản trị duyệt.

## Chạy trên máy cá nhân

Dự án dùng Node.js 24 LTS, npm, Next.js 16 App Router, React 19 và TypeScript ở chế độ nghiêm ngặt. Phông chữ tiếng Việt, ảnh minh họa và nhạc mặc định đều nằm trong bản dựng.

```bash
git clone https://github.com/usingbot/12a2promax.git
cd 12a2promax
git switch feature/vintage-memories
npm ci
cp .env.example .env.local
npm run dev
```

Mở `http://localhost:3000`. Nếu đã tải bản mã nguồn đóng gói, giải nén và chạy từ bước `npm ci`. Sau khi nhánh tính năng đã được hợp nhất, có thể chạy trực tiếp từ `main`.

Khi chưa có cấu hình Supabase, trang chủ dùng sáu ảnh có nhãn **Bộ ảnh minh họa**. Người xem vẫn có thể khám phá và xem trước tệp đã chọn. Nút gửi ảnh và đăng nhập sẽ mở sau khi có kết nối phù hợp.

## Kết nối Supabase

Tạo một dự án Supabase dành cho lớp. Trong phần cài đặt API, lấy URL dự án, publishable key và khóa bí mật phía máy chủ. Điền các giá trị vào `.env.local`.

| Biến                                   | Giá trị cần điền                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL dự án, dạng `https://<project-ref>.supabase.co`                                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key hoặc khóa `anon` cũ                                                    |
| `SUPABASE_SERVICE_ROLE_KEY`            | Secret key phía máy chủ hoặc khóa `service_role` cũ, dùng trong các module server-only |
| `UPLOAD_RATE_LIMIT_SECRET`             | Chuỗi bí mật riêng tối thiểu 32 ký tự để băm địa chỉ mạng và nhận diện lần gửi lại     |

Tạo giá trị cuối bằng `openssl rand -hex 32`. Giữ khóa bí mật trong cài đặt môi trường của máy chủ. Tệp `.env.local` đã được Git bỏ qua. Sau khi sửa biến, khởi động lại ứng dụng.

### Chạy migration và cấu hình Storage

Trong SQL Editor của **dự án mới**, chạy lần lượt `supabase/migrations/202611190001_vintage_memories.sql` rồi `supabase/migrations/202611190002_upload_quota_500.sql`, mỗi tệp một lần. Nếu đã chạy migration đầu tiên trước đó, chỉ cần chạy migration thứ hai để tăng hạn mức. Có thể dùng Supabase CLI thay thế.

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Migration tạo các bảng, chỉ mục, chính sách RLS, hàm giới hạn lượt gửi và hàng đợi dọn tệp. Nó cũng tạo hai bucket riêng tư. Trong Storage, kiểm tra cột **Public** của cả hai bucket đã tắt.

| Bucket     | Nội dung                                 | Định dạng lưu |
| ---------- | ---------------------------------------- | ------------- |
| `memories` | Ảnh đã tối ưu cùng bản thu nhỏ           | WebP          |
| `theme`    | Ảnh nền và nhạc do quản trị viên tải lên | WebP, MP3     |

Mỗi bucket có giới hạn 4 MiB/tệp. Hai tên bucket phải còn trống khi chạy migration lần đầu. Ứng dụng đọc ảnh qua các route phía máy chủ và giữ URL ký ngắn hạn ở phía máy chủ. Việc chuyển một ảnh sang trạng thái từ chối chặn yêu cầu đọc tiếp theo qua URL công khai của ảnh đó.

### Tạo quản trị viên đầu tiên

1. Trong **Authentication → Sign In / Providers**, bật đăng nhập email và tắt **Allow new users to sign up**. Trong cấu hình URL, đặt **Site URL** thành địa chỉ website.
2. Vào **Authentication → Users → Add user → Create new user**. Tạo tài khoản quản trị bằng email riêng, dùng mật khẩu mạnh và xác nhận email. Sao chép **User UID** của tài khoản.
3. Trong SQL Editor, thay UUID ở câu lệnh bên dưới bằng UID vừa sao chép rồi chạy lệnh.
4. Mở `/admin/login` và đăng nhập bằng tài khoản đã cấp quyền.

```sql
insert into public.admin_users (user_id)
values ('<UUID-từ-Authentication>'::uuid)
on conflict do nothing;
```

Để thu hồi quyền, xóa dòng có UID đó khỏi `public.admin_users` qua SQL Editor. Máy chủ xác thực người dùng với Supabase Auth và kiểm tra bảng này cho từng thao tác quản trị. Người dùng thông thường chỉ đọc được dòng quyền của chính họ và không thể tự thêm quyền.

## Sử dụng

- **Trang chủ** có ảnh trôi, trộn ảnh, tạm dừng, chỉnh âm lượng và album. Di chuột hoặc đặt tiêu điểm lên ảnh để dừng khung ảnh đó. Bấm ảnh để xem lời nhắn, người gửi và ngày. Dùng Escape hoặc nút Đóng để quay lại.
- **Gửi kỷ niệm** cho phép chọn hoặc kéo thả tối đa 6 ảnh JPEG, PNG, WebP. Mỗi ảnh tối đa 4 MiB, được gửi bằng một yêu cầu riêng để phù hợp giới hạn thân yêu cầu trên Vercel. Máy chủ xác minh định dạng thực, giới hạn số điểm ảnh, xoay theo hướng chụp và mã hóa lại thành WebP tối đa 1.920 px, kèm bản thu nhỏ 640 px. Metadata của ảnh gốc được loại bỏ.
- **Duyệt ảnh** tại `/admin`. Lọc theo trạng thái, tìm theo tên hoặc lời nhắn, sửa chú thích, duyệt, từ chối hoặc xóa nhiều ảnh. Mọi ảnh gửi từ biểu mẫu công khai bắt đầu ở trạng thái `pending`. Album sử dụng ảnh thật ngay khi có ảnh `approved`. Ảnh mẫu không được ghi vào cơ sở dữ liệu.
- **Cài đặt** tại `/admin/settings`. Sửa nội dung, chọn màu và mẫu nền, điều chỉnh lớp phủ, thay ảnh nền, tải hoặc gỡ nhạc MP3 và tùy chỉnh chuyển động. Các tệp nền và nhạc được áp dụng ngay sau khi tải thành công. Với trường văn bản và thanh trượt, chọn **Lưu thay đổi**. Mở lại trang chủ để xem cấu hình mới.
- **Nhạc** mặc định là bản hòa tấu ngắn “Chiều sân trường” được tạo cho dự án. Trình phát chỉ bắt đầu sau khi người xem bấm **Bật nhạc**. Khi gỡ bản nhạc đã tải, tùy chọn phát nhạc sẽ tắt. Bật lại để dùng bản mặc định.

### Hiệu năng và tính nhất quán

Chuyển động dùng CSS transform với tham số ổn định và ít lớp ảnh. Trang mở đầu có tối đa 4 khung. Khi bước vào miền ký ức, giới hạn là 12 khung trên màn hình lớn và 4 trên điện thoại. Vòng lặp dừng khi tab bị ẩn, cảnh cuộn khỏi màn hình hoặc đang mở hộp thoại. Chế độ giảm chuyển động giữ khung ảnh đứng yên. Album thật tải theo trang 24 ảnh.

Hạn mức công khai là 500 lần gửi mỗi giờ cho mỗi địa chỉ mạng, được cập nhật nguyên tử trong PostgreSQL. Trên Vercel, máy chủ dùng địa chỉ do hạ tầng Vercel cung cấp. Khi chạy cục bộ hoặc trên máy chủ khác, ứng dụng dùng chung một hạn mức cho đến khi được tích hợp với proxy đáng tin cậy ở nơi triển khai.

Biểu mẫu giữ mã riêng cho từng ảnh khi thử gửi lại. Ảnh được ghi vào bucket riêng trước khi tạo metadata. Khi xóa ảnh hoặc thay tệp giao diện, trigger đưa đường dẫn cũ vào `asset_cleanup` trong cùng giao dịch. Các thao tác xóa và lưu cài đặt thử dọn hàng đợi. Nếu Storage gián đoạn, hàng đợi được giữ cho lần xử lý sau. Phiên bản `updated_at` ngăn hai quản trị viên ghi đè cài đặt của nhau.

## Kiểm tra và dựng production

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

- `tests/database.test.ts` chạy migration trên PostgreSQL nhúng bằng PGlite, với vai trò và schema nền tảng Supabase được dựng riêng cho kiểm thử. Bao phủ RLS, trạng thái chờ duyệt, duyệt/từ chối, thu hồi quyền đọc, xóa, lưu cài đặt, xung đột phiên bản và hạn mức.
- `tests/gallery.test.tsx` kiểm tra tương tác React trong JSDOM, bao gồm mở ảnh, chuyển chế độ, giới hạn khung trên điện thoại, chọn nhiều tệp, phản hồi thành công và biểu mẫu cài đặt.
- `tests/validation.test.ts` kiểm tra kích thước, định dạng thực, tối ưu hóa tệp, ngày kỷ niệm và giới hạn cấu hình.
- `tests/server/routes.test.ts` gọi trực tiếp các route với môi trường trống và với lớp HTTP Supabase giả lập. Bao phủ trường hợp thiếu cấu hình, quyền quản trị, gửi lại không nhân đôi và bảo vệ ảnh riêng tư.

### Kiểm thử trình duyệt

Bộ Playwright chạy cùng các tình huống trên Chromium máy tính, Android mô phỏng, iPhone và iPad mô phỏng bằng WebKit. Các ca kiểm tra mở ảnh bằng bàn phím, khôi phục tiêu điểm, giảm chuyển động, tràn ngang, chọn nhiều ảnh và chuyển hướng quản trị. Chúng chỉ xem trước tệp, không gửi ảnh lên lớp.

Mở ứng dụng bằng `npm run dev` ở một terminal. Trong terminal khác, chạy hai lệnh sau.

```bash
npx playwright install chromium webkit
npm run test:e2e
```

Để chạy với bản Preview trên Vercel, đặt `E2E_BASE_URL` thành URL Preview trước khi chạy `npm run test:e2e`.

### Kiểm tra với dự án Supabase thật

Sau khi cấu hình môi trường, dùng hai phiên trình duyệt, một phiên khách và một phiên quản trị.

1. Ở điện thoại, gửi hai ảnh và chờ thông báo gửi thành công. Trong quản trị, kiểm tra cả hai có trạng thái **Chờ duyệt**.
2. Duyệt một ảnh. Tải lại trang khách, mở ảnh, kiểm tra chú thích và ngày. Sau đó từ chối ảnh đó và tải lại URL ảnh trong phiên khách để kiểm tra máy chủ trả về 404.
3. Thử truy cập `/admin` và `/admin/settings` trong phiên khách. Cả hai trang phải chuyển đến đăng nhập.
4. Trong quản trị, thay nền, chọn nhạc MP3, đổi tốc độ và lưu. Mở lại trang chủ và kiểm tra nội dung, âm lượng và chuyển động vừa đặt.
5. Thử Android và iPhone ở chế độ dọc, ngang, bật giảm chuyển động và dùng bàn phím để mở/đóng hộp thoại. Kiểm tra cả trường hợp tắt mạng khi gửi nhiều ảnh.

## Triển khai lên Vercel

1. Đưa nhánh chứa mã nguồn lên GitHub và hợp nhất vào nhánh sản xuất.
2. Trong Vercel chọn **Add New → Project**, nhập repository, chọn preset **Next.js**, thư mục gốc của dự án và Node.js **24.x**.
3. Khai báo bốn biến ở trên trong **Settings → Environment Variables** cho môi trường tương ứng. Nên dùng một dự án Supabase riêng cho Preview nếu cần kiểm thử bằng dữ liệu riêng.
4. Chạy migration và cấp quyền cho quản trị viên trong đúng dự án Supabase trước khi nhận ảnh thật.
5. Dùng lệnh build `npm run build` và cài đặt `npm ci`. Chọn **Deploy**, đặt Site URL tương ứng trong Supabase Auth, sau đó thực hiện các bước kiểm tra thực tế ở trên. Khi thay biến môi trường, tạo bản triển khai mới.

## Cấu trúc mã nguồn

```text
app/                 Trang công khai, quản trị và các HTTP route
components/gallery/  Cảnh ảnh trôi, album, nhạc và trình xem ảnh
components/upload/   Chọn tệp, xem trước và gửi theo tiến độ
components/admin/    Đăng nhập, duyệt ảnh và cài đặt
components/ui/       Hộp thoại, biểu trưng và ảnh dự phòng
lib/supabase/        Client công khai, phiên đăng nhập và client đặc quyền
lib/validation/      Kiểm tra trường văn bản, cấu hình và nội dung tệp
public/              Ảnh minh họa, giấy, họa tiết và nhạc cục bộ
supabase/            Cấu hình CLI và migration PostgreSQL/Storage
tests/               Kiểm thử thành phần, route và cơ sở dữ liệu
```

Nguồn gốc bộ ảnh minh họa được ghi trong `public/demo/SOURCES.txt`. Khi đăng ảnh thật, lớp có thể thay toàn bộ phần minh họa bằng nội dung đã duyệt.

## Gửi nhánh lên GitHub từ bản bàn giao

Bản Git bundle chứa nhánh `feature/vintage-memories` cùng một commit gốc trống trên `main`. Có thể khôi phục lịch sử và làm việc sau khi đã đăng nhập GitHub bằng tài khoản có quyền ghi.

```bash
git clone -b feature/vintage-memories 12a2-vintage-memories.bundle 12a2promax
cd 12a2promax
git remote rename origin handoff
git remote add origin https://github.com/usingbot/12a2promax.git
git ls-remote origin
```

Nếu repository đích vẫn hoàn toàn trống, tạo nhánh cơ sở bằng `git push origin refs/remotes/handoff/main:refs/heads/main`. Khi repository đã có lịch sử riêng, đối chiếu và tích hợp với nhánh cơ sở hiện tại trước khi mở pull request. Đẩy nhánh tính năng và tạo pull request bằng các lệnh sau.

```bash
git push -u origin feature/vintage-memories
gh pr create --base main --head feature/vintage-memories --title "12A2 Pro Max — Vintage Memories" --body "Lưu bút tiếng Việt của lớp 12A2, kèm quản trị, kiểm thử và hướng dẫn triển khai."
```
