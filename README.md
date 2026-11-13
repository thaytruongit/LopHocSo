# 🚀 TRUONG DIGITAL CLASSROOM

**Hệ sinh thái giáo dục số & Cổng học tập môn Tin học THCS (Khối 6, 7, 8, 9)**  
*Dành riêng cho giáo viên & học sinh trường THCS Mão Điền — Thầy Đỗ Mạnh Trường.*

🔗 **Địa chỉ website trực tuyến (GitHub Pages):**  
👉 **[https://thaytruongit.github.io/Tin_hoc_so/](https://thaytruongit.github.io/Tin_hoc_so/)**

---

## 📌 1. Cấu hình & Định hướng chiến lược
Dự án được xây dựng theo mô hình **GitHub First** và triển khai trực tiếp trên **GitHub Pages**:
* **1A (Phạm vi):** Chuyên sâu môn Tin học Khối 6, 7, 8, 9 theo Chương trình GDPT 2018.
* **2A (Đối tượng):** Giáo viên và học sinh các lớp trực tiếp giảng dạy (6A10..9A16 — 670 học sinh THCS Mão Điền).
* **3A (Kiến trúc kỹ thuật):** Ứng dụng độc lập **Next.js (App Router, Static HTML Export) + Supabase (PostgreSQL, Auth, RLS)** chạy mượt mà trực tiếp trên GitHub Pages.
* **4A (Đăng nhập học sinh):** Giáo viên cấp Mã học sinh + Mật khẩu `123` cho từng học sinh THCS (tránh phụ thuộc tài khoản Google).
* **5C (Ưu tiên triển khai):** Triển khai đồng bộ cả **Phiếu học tập điện tử + Phòng thi trực tuyến chấm điểm tự động + Gamification (XP, Cấp độ, Huy hiệu, Bảng vàng)**.

---

## ⚙️ 2. Kích hoạt GitHub Pages (Thực hiện 1 lần duy nhất)
Để website chạy trực tuyến tại địa chỉ `https://thaytruongit.github.io/Tin_hoc_so/`:
1. Vào mục **Settings** của repository `thaytruongit/Tin_hoc_so` trên GitHub.
2. Chọn menu **Pages** (ở thanh menu bên trái).
3. Tại mục **Build and deployment -> Source**, chọn: **GitHub Actions**.
4. GitHub Actions workflow `.github/workflows/deploy-pages.yml` sẽ tự động build và xuất bản trang web.

---

## 🌟 3. Các phân hệ chính
1. **Cổng môn học (Subjects):** Học liệu chuẩn 4 khối 6, 7, 8, 9 (Chủ đề A đến F) & góc bồi dưỡng HSG C++/Python.
2. **Hoạt động trực tiếp trên lớp (In-class):** 3 hoạt động cốt lõi (1. Khám phá cặp đôi, 2. Luyện tập củng cố, 3. Thực hành trên máy) có công tắc khóa/mở thủ công và tự động chấm điểm độc lập.
3. **Phòng kiểm tra trực tuyến (Exams):** Đếm ngược thời gian, đếm số lần chuyển tab (chống gian lận) và tự động chấm điểm.
4. **Không gian học sinh (Student Dashboard):** Theo dõi tiến trình lên cấp, chuỗi ngày học liên tục (Streak), bộ sưu tập huy hiệu và thứ hạng lớp.
5. **Kênh quản trị giáo viên (Teacher Dashboard):** Quản lý danh sách lớp, điều khiển phòng máy qua Supabase Realtime và xuất báo cáo Excel.
6. **Bảng vàng thi đua (Achievements):** Tuyên dương học sinh có điểm kinh nghiệm (XP) dẫn đầu.

---

## 👤 4. Tài khoản mẫu thử nghiệm
* **Học sinh:**
  * Khối 6: Mã `HS601` — Mật khẩu: `123` (Nguyễn Văn An - Lớp 6A1)
  * Khối 7: Mã `HS701` — Mật khẩu: `123` (Lê Hoàng Dũng - Lớp 7A1)
  * Khối 8: Mã `HS801` — Mật khẩu: `123` (Phạm Thu Trang - Lớp 8A1)
  * Khối 9: Mã `HS901` — Mật khẩu: `123` (Đỗ Tuấn Kiệt - Lớp 9A1)
* **Giáo viên:**
  * Email: `thaytruong@thcsmaodien.edu.vn` — Mật khẩu: `123456`

---

© 2026 Thầy Đỗ Mạnh Trường · THCS Mão Điền.
