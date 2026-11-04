# Lũy — Từng chút cho ngày mai

Ứng dụng thu chi và tiết kiệm cá nhân, giao diện tiếng Việt, nền sáng/tối, responsive, animation nhẹ và ẩn số tiền khi cần. Chạy bằng Node.js 22, không cần thư viện npm bên ngoài. API lưu vào Google Sheets; có cấu hình Vercel và Docker.

## Dùng thử trên máy

Nhấp `start-demo.cmd`, mở **http://localhost:4180**. Hoặc:

```sh
node server.mjs
```

Chế độ chưa có cấu hình dùng dữ liệu mẫu, lưu trong trình duyệt. Chọn **Bắt đầu với dữ liệu của tôi** để tạo sổ trống, rồi thiết lập số dư. Dữ liệu mẫu không được tự ghi lên Google Sheets.

Để chạy với cấu hình Google của bạn, nhấp `start.cmd` hoặc `npm run dev`. File `.env.local` riêng trên máy đã điền Sheet ID và OAuth Client của bạn; file này không có trong gói mã nguồn và không được commit. Mở file trên máy để xem/đổi `APP_PASSWORD` trước khi dùng.

## Các màn hình

- **Tổng quan:** tổng tiền hiện có, phần tiết kiệm, tiền sinh hoạt; thu/chi, phần dư, tỷ lệ dư theo tháng; biểu đồ 6 tháng; danh mục chi và mục tiêu.
- **Sổ thu chi:** thêm/sửa/xóa, ghi chú, danh mục có sẵn, tìm kiếm, lọc theo tháng/năm/khoảng tháng/mọi thời gian, loại và danh mục; khoản chưa rõ Thu/Chi có hàng chờ xác nhận. Tổng thu/chi tính cho toàn bộ kỳ đã chọn.
- **Thống kê:** tổng thu, tổng chi, dư thu chi và tỷ lệ dư; bảng gộp từng tháng hoặc từng năm, có nút mở các khoản trong kỳ. Bao gồm dữ liệu lịch sử đã nhập và các khoản mới; xem được lịch sử trước khi thiết lập mốc số dư.
- **Tiết kiệm:** để dành, rút, phân bổ mục tiêu, trả về quỹ chung và lịch sử chuyển quỹ.
- **Mục tiêu:** số tiền cần đạt, thời hạn theo tháng, màu/biểu tượng, ghi chú, tiến độ và số tiền cần dành mỗi tháng.
- **Nhập dữ liệu:** CSV có màn hình ghép cột, xem trước, báo lỗi, chống nhập lại file và cảnh báo khoản có nội dung giống nhau. Khôi phục JSON cần xác nhận thay toàn bộ sổ.
- **Cài đặt:** sao lưu JSON, đối chiếu số dư, chốt tháng, tải lại dữ liệu và cập nhật bảng tổng hợp.

### Xem lại thu chi cũ

Mở **Thống kê → Xem theo**, chọn **Tháng**, **Năm**, **Khoảng tháng** hoặc **Mọi thời gian**. Ví dụ chọn **Khoảng tháng**, từ **12/2024** đến **02/2025** để xem tổng cả ba tháng, bao gồm tháng đầu và tháng cuối. Chọn **Gộp theo → Từng tháng / Từng năm** để đổi cách trình bày; chọn **Xem khoản** ở từng dòng để mở đúng các khoản trong Sổ thu chi.

Năm hiện tại tính từ tháng 1 đến tháng hiện tại. Tháng chưa có ghi chép hiện **Chưa có dữ liệu**; khoản **Cần xác nhận** được đếm riêng và chưa cộng vào Thu/Chi. Tỷ lệ dư của cả kỳ tính bằng tổng dư chia tổng thu, không lấy trung bình các tỷ lệ tháng. Nếu dữ liệu cũ chưa nằm trong ứng dụng, mở **Nhập dữ liệu** để nhập CSV hoặc bản sao lưu JSON trước.

## Số liệu được tính thế nào?

**Mốc số dư** là tổng tiền thực tế tại ngày bạn bắt đầu, đã bao gồm tiết kiệm. Ví dụ đang có 30 triệu, đã dành 10 triệu: tổng tiền 30 triệu, tiết kiệm 10 triệu, sinh hoạt 20 triệu.

**Dữ liệu lịch sử** dùng cho báo cáo thu chi; không cộng lại vào mốc số dư. Nhập một khoản thu cũ 18 triệu không làm 30 triệu thành 48 triệu. Với khoản thêm tay, chỉ chọn **Khoản phát sinh sau mốc số dư** nếu khoản đó cần thay đổi tiền hiện có.

**Tháng/năm không có ngày** được giữ như vậy. Lũy không tự gán ngày 01. Không có danh mục thì để **Chưa phân loại**. Chưa rõ Thu/Chi thì để **Cần xác nhận**, chưa tính vào tổng.

**Dư từ thu chi = Thu − Chi**, khác với tiền đã chủ động dành vào quỹ. Tỷ lệ dư chỉ tính khi có thu nhập.

**Để dành** chuyển tiền sinh hoạt sang tiết kiệm, không phải chi phí. **Phân bổ** chuyển từ quỹ chung sang mục tiêu, không tạo thêm tiết kiệm. Không được phân bổ cùng một khoản cho hai mục tiêu. Rút tiết kiệm trả tiền về sinh hoạt. Xóa mục tiêu trả tiền đã phân bổ về quỹ chung.

**Đối chiếu** ghi chênh lệch giữa số dư tính toán và thực tế thành điều chỉnh riêng, không tạo thu nhập giả. Nếu chi tiêu làm tổng tiền thấp hơn phần đã dành tiết kiệm, ứng dụng cảnh báo để bạn kiểm tra/rút quỹ.

**Chốt tháng** lưu tổng kết và số dư thực tế nếu có. Với tháng chưa có phát sinh, có thể ghi một tổng Thu và một tổng Chi. Không trộn tổng tháng với các khoản chi tiết cùng loại/cùng tháng để tránh cộng trùng. Chỉ cập nhật số dư khi bạn chủ động chọn. Các tháng đã chốt vẫn sửa được.

## Google Sheet

Sheet của dự án này:

```text
1l1pUMGgEx5WIFfHBPV7YQcYI1UmByAG3riDAETB6DUw
```

Ứng dụng tạo các tab riêng khi lần đầu đọc dữ liệu sau khi kết nối:

| Tab | Nội dung |
| --- | --- |
| `Events` | Nhật ký dữ liệu gốc, có kiểm tra toàn vẹn và phiên bản |
| `ThuChi` | Bảng thu chi dễ đọc |
| `MucTieu` | Mục tiêu và tiến độ |
| `SoDu` | Mốc ban đầu, điều chỉnh và tổng tiền hiện tại |
| `TietKiem` | Số tiền ban đầu và lịch sử chuyển quỹ |

Các tab có sẵn khác được giữ nguyên. Nếu một tab trùng tên có cấu trúc khác, ứng dụng dừng và báo lỗi. **Thêm/sửa dữ liệu qua ứng dụng; không sửa/xóa trực tiếp `Events`.** Các tab còn lại là bảng tổng hợp, sửa tay sẽ không cập nhật ứng dụng và có thể bị ghi lại. Nếu bảng tổng hợp chưa cập nhật, chọn **Cài đặt → Cập nhật bảng tổng hợp**. Những bảng này không phải file để import dữ liệu cũ trực tiếp.

Mỗi lần lưu có ID và phiên bản. Khi hai tab/thiết bị lưu cùng lúc, một thao tác được nhận, thao tác còn lại báo cần tải lại; không tự cộng cả hai. Khi gặp lỗi, giữ nội dung đang nhập và tải lại dữ liệu trước khi thử lưu tiếp. Dữ liệu được đọc từ nhật ký gốc, không từ bảng tổng hợp có thể chậm cập nhật.

## Deploy lên Vercel

1. Đưa **nội dung thư mục `luy-finance`** lên repository GitHub riêng, hoặc chọn đúng **Root Directory** nếu repository chứa nhiều dự án. Không upload `.env.local`.
2. Import repository vào Vercel. Dùng **Framework Preset: Other**, Node.js **22.x**, Build Command **`npm run build`**, Output Directory **`public`**. Không cần chạy `server.mjs` hay đặt Start Command trên Vercel: các file `api/` chạy dưới dạng Vercel Functions.
3. Trong **Settings → Environment Variables**, điền các giá trị bên dưới. Chỉ đặt phía máy chủ; không dùng tiền tố public.

| Biến | Giá trị |
| --- | --- |
| `GOOGLE_SHEET_ID` | ID Sheet phía trên |
| `GOOGLE_CLIENT_ID` | OAuth Client ID trong `.env.local` riêng trên máy |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret tương ứng |
| `APP_PASSWORD` | Mật khẩu riêng để mở ứng dụng |
| `SESSION_SECRET` | Chuỗi ngẫu nhiên bí mật ít nhất 32 ký tự; dùng riêng cho ứng dụng này |
| `GOOGLE_OAUTH_REDIRECT_URI` | Có thể bỏ trống; mặc định lấy domain đang mở + `/api/auth/google/callback` |

Sinh một secret mới nếu cần:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

4. Deploy để lấy tên miền, ví dụ `https://ten-app.vercel.app`.
5. Trong Google Cloud, bật **Google Sheets API**. Mở **Google Auth Platform → Clients → OAuth Client loại Web application**, thêm **Authorized redirect URI**:

```text
https://ten-app.vercel.app/api/auth/google/callback
```

Giữ callback của AWS Recall nếu dùng chung OAuth Client. Nếu app Google còn ở trạng thái **Testing**, thêm email Google của bạn vào **Audience → Test users** để tránh lỗi `403 access_denied`.

6. Mở website ở đúng tên miền đã thêm → nhập `APP_PASSWORD` → **Kết nối Google Sheets** → chọn tài khoản có quyền sửa Sheet → đồng ý quyền Sheets. Sau đó tạo mốc số dư, mục tiêu và nhập dữ liệu.

**Không cần đăng ký callback localhost nếu chỉ dùng Vercel.** Preview deployment có domain khác cũng cần callback tương ứng; nên kết nối bằng domain Production ổn định. Nếu đặt `GOOGLE_OAUTH_REDIRECT_URI` cố định, nó phải khớp domain đang truy cập. Sửa biến môi trường xong cần redeploy.

Mã nguồn chuẩn bị sẵn cấu hình và luồng OAuth, không tự deploy hay xác minh thay bạn trên Google Cloud. Kết nối Google thật cần đăng nhập/đồng ý quyền từ trình duyệt. Nếu quyền Google hết hạn, đăng xuất rồi kết nối lại. Mỗi trình duyệt giữ phiên Google riêng; xóa cookie cần kết nối lại.

### Cách xác thực thay thế

- Có thể dùng `GOOGLE_REFRESH_TOKEN` cùng Client ID/Secret thay vì kết nối từng trình duyệt.
- Hoặc dùng `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY`, chia sẻ Sheet cho email service account với quyền **Editor**. Private key hỗ trợ ký tự xuống dòng dạng `\n`.
- Dù dùng cách nào, chế độ Google Sheets yêu cầu `APP_PASSWORD` và `SESSION_SECRET` đủ dài.

## Nhập dữ liệu cũ

Trong Excel, lưu **CSV UTF-8**. Tải `/sample-import.csv` để xem mẫu. Có thể dùng dấu phẩy, chấm phẩy hoặc tab. Số tiền là số nguyên VND (`1500000`, `1.500.000`, `1,500,000` đặt trong ô CSV có ngoặc kép).

Hỗ trợ:

```csv
Tháng,Năm,Loại,Số tiền,Nội dung
1,2025,Thu,18000000,Lương tháng
1,2025,Chi,12000000,Tổng chi tháng
```

Hoặc:

```csv
Kỳ,Thu,Chi
01/2025,18000000,12000000
02/2025,18000000,11500000
```

Chọn **Tổng tháng** khi mỗi dòng là tổng kết, chọn **Một khoản thu chi** nếu mỗi dòng là một lần phát sinh. Nếu file chỉ có cột số tiền, để **Cần xác nhận** hoặc chỉ định rõ loại cho cả file. Số âm cần xác nhận quy ước âm = Chi. Các dòng lỗi không được tự bỏ qua: bạn phải sửa hoặc chọn cho phép bỏ dòng lỗi trước khi nhập.

Giới hạn cho ứng dụng cá nhân: 500 dòng CSV / 900 KB mỗi file; tối đa 10.000 khoản thu chi, 100 mục tiêu. File nhập được nhận diện theo nội dung; nếu thay đổi file, kiểm tra cảnh báo khoản giống nhau để tránh nhập trùng. Có thể xuất bản sao lưu trên máy rồi khôi phục vào Google Sheets; ứng dụng không tự gộp dữ liệu giữa hai chế độ.

## Docker

Docker dùng để chạy local hoặc máy chủ có Docker. Cấu hình Vercel mặc định dùng Functions và không yêu cầu Docker.

```sh
docker compose up --build -d
docker compose logs -f
docker compose down
```

Mở **http://localhost:4180**. Compose đọc `.env.local` nếu có. Chạy demo không cần Google bằng cách dùng thư mục không có `.env.local`. Nếu cần OAuth local, thêm callback `http://localhost:4180/api/auth/google/callback` trong Google Cloud, đặt giá trị đó vào `GOOGLE_OAUTH_REDIRECT_URI` và tạo lại container. Container chạy bằng user `node`, filesystem chỉ đọc; secrets được truyền lúc chạy, không đóng vào image.

Compose đặt `COOKIE_SECURE=false` cho HTTP localhost. Khi dùng máy chủ công khai qua HTTPS, bỏ giá trị này hoặc đặt `true`, cấu hình redirect HTTPS đúng và chọn reverse proxy thích hợp.

## Kiểm tra

```sh
npm test
npm run build
docker compose config --quiet
```

Test kiểm tra số dư, lịch sử tháng/năm, khoản cần xác nhận, quỹ không cộng trùng, mục tiêu, chốt tháng, nhập file, bản sao lưu, lưu đồng thời, cấu trúc Sheets, cookie và OAuth. Các kiểm tra Google dùng giả lập API, không ghi dữ liệu thật.

Trong môi trường tạo dự án, test và build đã chạy qua, các tài nguyên và API local trả phản hồi đúng. Trình duyệt tự động bị hệ thống chặn (`spawn EPERM`), chưa xác nhận trực quan desktop/mobile; Docker Compose đã kiểm tra cấu hình, chưa build/chạy image trong Docker Engine. Trước khi dùng dữ liệu thật, mở app trên trình duyệt và thử tạo/xóa một khoản mẫu, sao lưu, kiểm tra callback Google sau khi deploy.
