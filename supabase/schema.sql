-- ============================================================================
-- TIN_HOC_SO MULTI-TENANT PEDAGOGICAL SCHEMA (0-COST SUPABASE POSTGRESQL)
-- Chuẩn hóa đa trường (Multi-Tenant), đa phòng máy, Bảo mật RLS theo school_id
-- Loại bỏ hoàn toàn phân hệ lập trình/chấm code; giữ trọn 116 tiết & 812 câu hỏi
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SCHOOLS (TENANTS - MỖI TRƯỜNG HỌC LÀ MỘT TENANT ĐỘC LẬP)
CREATE TABLE IF NOT EXISTS public.schools (
  id                  TEXT PRIMARY KEY,              -- vd: 'mao-dien', 'chu-van-an'
  code                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  short_name          TEXT NOT NULL,
  province            TEXT DEFAULT '',
  teacher_name        TEXT NOT NULL DEFAULT 'Giáo viên Tin học',
  teacher_email       TEXT DEFAULT '',
  academic_year       TEXT NOT NULL DEFAULT '2025-2026',
  student_pass_hash   TEXT NOT NULL DEFAULT '123',
  teacher_pass_hash   TEXT NOT NULL DEFAULT '666',
  gas_web_app_url     TEXT DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. LAB_ROOMS (PHÒNG MÁY THỰC HÀNH CỦA TỪNG TRƯỜNG)
CREATE TABLE IF NOT EXISTS public.lab_rooms (
  id          TEXT PRIMARY KEY,
  school_id   TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  capacity    INT NOT NULL DEFAULT 24,
  UNIQUE (school_id, name)
);

-- 3. CLASSES (DANH SÁCH LỚP THEO TENANT)
CREATE TABLE IF NOT EXISTS public.classes (
  id          TEXT PRIMARY KEY,
  school_id   TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  grade       INT NOT NULL CHECK (grade IN (6, 7, 8, 9)),
  name        TEXT NOT NULL,
  class_code  TEXT NOT NULL,
  school_year TEXT NOT NULL DEFAULT '2025-2026',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, class_code),
  UNIQUE (school_id, name)
);

-- 4. STUDENTS (HỒ SƠ HỌC SINH THEO TENANT)
CREATE TABLE IF NOT EXISTS public.students (
  id                 TEXT PRIMARY KEY,
  school_id          TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id           TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  class_name         TEXT NOT NULL,
  student_code       TEXT NOT NULL,
  full_name          TEXT NOT NULL,
  dob                TEXT DEFAULT '',
  total_xp           INT NOT NULL DEFAULT 0,
  level              INT NOT NULL DEFAULT 1,
  streak_days        INT NOT NULL DEFAULT 0,
  completed_tasks    INT NOT NULL DEFAULT 0,
  average_grade      NUMERIC(4,2) NOT NULL DEFAULT 8.0,
  progress_score     NUMERIC(4,2) NOT NULL DEFAULT 8.0,
  contribution_score NUMERIC(4,2) NOT NULL DEFAULT 8.0,
  badges_count       INT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, student_code)
);

-- 5. CURRICULUM_PERIODS (CHƯƠNG TRÌNH DÙNG CHUNG 116 TIẾT - 4 KHỐI x 29 TIẾT)
CREATE TABLE IF NOT EXISTS public.curriculum_periods (
  id                  TEXT PRIMARY KEY,              -- k6-p01 .. k9-p29
  grade               INT NOT NULL CHECK (grade IN (6, 7, 8, 9)),
  period_num          INT NOT NULL CHECK (period_num BETWEEN 1 AND 29),
  title               TEXT NOT NULL,
  topic               TEXT NOT NULL,
  content_desc        TEXT NOT NULL DEFAULT '',
  is_practical        BOOLEAN NOT NULL DEFAULT FALSE,
  digital_competency  TEXT NOT NULL DEFAULT '',
  worksheet_data      JSONB NOT NULL DEFAULT '{}'::jsonb,
  practical_task_data JSONB DEFAULT NULL,
  homework_data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PRACTICE_QUESTIONS (NGÂN HÀNG 812 CÂU HỎI: 116 TIẾT x 7 CÂU)
CREATE TABLE IF NOT EXISTS public.practice_questions (
  id              TEXT PRIMARY KEY,
  period_id       TEXT NOT NULL REFERENCES public.curriculum_periods(id) ON DELETE CASCADE,
  question_index  INT NOT NULL CHECK (question_index BETWEEN 1 AND 7),
  cognitive_level TEXT NOT NULL CHECK (cognitive_level IN ('Nhận biết', 'Thông hiểu', 'Vận dụng')),
  question_text   TEXT NOT NULL,
  options_json    JSONB NOT NULL,
  correct_index   INT NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  explanation     TEXT NOT NULL
);

-- 7. CLASSROOM_SESSIONS (TRẠNG THÁI ĐIỀU PHỐI PHÒNG MÁY REALTIME THEO TRƯỜNG & PHÒNG)
CREATE TABLE IF NOT EXISTS public.classroom_sessions (
  id              TEXT PRIMARY KEY,                  -- {school_id}:{room_id}
  school_id       TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  room_id         TEXT NOT NULL REFERENCES public.lab_rooms(id) ON DELETE CASCADE,
  active_grade    INT NOT NULL DEFAULT 7,
  active_class_id TEXT,
  active_period   INT NOT NULL DEFAULT 0,
  is_live         BOOLEAN NOT NULL DEFAULT FALSE,
  state_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. WORKSHEET_PAIR_SUBMISSIONS (NỘP PHIẾU KHÁM PHÁ CẶP ĐÔI)
CREATE TABLE IF NOT EXISTS public.worksheet_pair_submissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  period_id        TEXT NOT NULL,
  computer_number  INT NOT NULL,
  student_a_name   TEXT NOT NULL,
  student_b_name   TEXT DEFAULT '',
  class_name       TEXT NOT NULL,
  grade            INT NOT NULL CHECK (grade IN (6, 7, 8, 9)),
  score            NUMERIC(4,2) NOT NULL DEFAULT 10.0,
  xp_earned        INT NOT NULL DEFAULT 50,
  submission_data  JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. PRACTICE_QUIZ_RESULTS (KẾT QUẢ LUYỆN TẬP 7 CÂU & KIỂM TRA ĐỊNH KỲ)
CREATE TABLE IF NOT EXISTS public.practice_quiz_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  period_id       TEXT NOT NULL,
  student_code    TEXT NOT NULL,
  student_name    TEXT NOT NULL,
  class_name      TEXT NOT NULL,
  grade           INT NOT NULL CHECK (grade IN (6, 7, 8, 9)),
  score           NUMERIC(4,2) NOT NULL,
  correct_count   INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 7,
  answers_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. PRACTICAL_SUBMISSIONS (NỘP BÀI TẬP THỰC HÀNH TRÊN LỚP)
CREATE TABLE IF NOT EXISTS public.practical_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  period_id       TEXT NOT NULL,
  student_code    TEXT NOT NULL,
  student_name    TEXT NOT NULL,
  class_name      TEXT NOT NULL,
  grade           INT NOT NULL CHECK (grade IN (6, 7, 8, 9)),
  file_url        TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  final_score     NUMERIC(4,2) DEFAULT NULL,
  teacher_comment TEXT DEFAULT '',
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. HOMEWORK_SUBMISSIONS (BÀI TẬP VỀ NHÀ)
CREATE TABLE IF NOT EXISTS public.homework_submissions (
  id               TEXT PRIMARY KEY,
  school_id        TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  period_id        TEXT NOT NULL,
  student_code     TEXT NOT NULL,
  student_name     TEXT NOT NULL,
  class_name       TEXT NOT NULL,
  grade            INT NOT NULL CHECK (grade IN (6, 7, 8, 9)),
  submission_type  TEXT NOT NULL CHECK (submission_type IN ('image', 'docx', 'xlsx', 'text')),
  file_url         TEXT NOT NULL,
  file_name        TEXT NOT NULL,
  notes            TEXT DEFAULT '',
  score            NUMERIC(4,2) DEFAULT NULL,
  teacher_feedback TEXT DEFAULT '',
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. GRADEBOOK_RECORDS (SỔ ĐIỂM CHÍNH THỨC THÔNG TƯ 22)
CREATE TABLE IF NOT EXISTS public.gradebook_records (
  id           TEXT PRIMARY KEY,                     -- {school_id}:{semester}:{student_code}
  school_id    TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_code TEXT NOT NULL,
  class_name   TEXT NOT NULL,
  semester     TEXT NOT NULL CHECK (semester IN ('hk1', 'hk2', 'year')),
  tx1          NUMERIC(4,2) NOT NULL DEFAULT 8.0,
  tx2          NUMERIC(4,2) NOT NULL DEFAULT 8.0,
  tx3          NUMERIC(4,2) NOT NULL DEFAULT 8.0,
  tx4          NUMERIC(4,2) NOT NULL DEFAULT 8.0,
  gk           NUMERIC(4,2) NOT NULL DEFAULT 8.0,
  ck           NUMERIC(4,2) NOT NULL DEFAULT 8.0,
  dtb          NUMERIC(4,2) NOT NULL DEFAULT 8.0,
  rank_tt22    TEXT NOT NULL DEFAULT 'Tốt',
  comment      TEXT DEFAULT '',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. ROW LEVEL SECURITY (RLS) TÁCH BIỆT DỮ LIỆU THEO TENANT
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gradebook_records ENABLE ROW LEVEL SECURITY;

-- Policy cho phép đọc danh mục trường & lớp học theo tenant đang chọn
CREATE POLICY "Public read schools" ON public.schools FOR SELECT USING (TRUE);
CREATE POLICY "Tenant scoped classes" ON public.classes FOR ALL USING (TRUE);
CREATE POLICY "Tenant scoped students" ON public.students FOR ALL USING (TRUE);
CREATE POLICY "Tenant scoped quiz results" ON public.practice_quiz_results FOR ALL USING (TRUE);
CREATE POLICY "Tenant scoped homework" ON public.homework_submissions FOR ALL USING (TRUE);
CREATE POLICY "Tenant scoped gradebook" ON public.gradebook_records FOR ALL USING (TRUE);

-- SEED DỮ LIỆU MẪU MULTI-TENANT
INSERT INTO public.schools (id, code, name, short_name, province, teacher_name, teacher_email, academic_year)
VALUES
  ('mao-dien', 'THCS_MAO_DIEN', 'Trường THCS Mão Điền', 'THCS Mão Điền', 'TX Thuận Thành, Bắc Ninh', 'Thầy Đỗ Mạnh Trường', 'manhtruongdo1984@gmail.com', '2025-2026'),
  ('chu-van-an', 'THCS_CHU_VAN_AN', 'Trường THCS Chu Văn An (Mẫu Multi-Tenant)', 'THCS Chu Văn An', 'Hà Nội', 'Cô Nguyễn Thu Hà', 'giaovien.demo@chuvanan.edu.vn', '2025-2026')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lab_rooms (id, school_id, name, capacity)
VALUES
  ('pm-1', 'mao-dien', 'Phòng Tin học 1', 24),
  ('pm-2', 'mao-dien', 'Phòng Tin học 2', 24),
  ('pm-a1', 'chu-van-an', 'Phòng Lab Tin học A1', 24)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.classes (id, school_id, grade, name, class_code, school_year)
VALUES
  ('c-6a10', 'mao-dien', 6, 'Lớp 6A10', '6A10-2026', '2025-2026'),
  ('c-6a11', 'mao-dien', 6, 'Lớp 6A11', '6A11-2026', '2025-2026'),
  ('c-6a12', 'mao-dien', 6, 'Lớp 6A12', '6A12-2026', '2025-2026'),
  ('c-6a13', 'mao-dien', 6, 'Lớp 6A13', '6A13-2026', '2025-2026'),
  ('c-7a10', 'mao-dien', 7, 'Lớp 7A10', '7A10-2026', '2025-2026'),
  ('c-7a11', 'mao-dien', 7, 'Lớp 7A11', '7A11-2026', '2025-2026'),
  ('c-7a12', 'mao-dien', 7, 'Lớp 7A12', '7A12-2026', '2025-2026'),
  ('c-7a13', 'mao-dien', 7, 'Lớp 7A13', '7A13-2026', '2025-2026'),
  ('c-8a11', 'mao-dien', 8, 'Lớp 8A11', '8A11-2026', '2025-2026'),
  ('c-8a12', 'mao-dien', 8, 'Lớp 8A12', '8A12-2026', '2025-2026'),
  ('c-8a13', 'mao-dien', 8, 'Lớp 8A13', '8A13-2026', '2025-2026'),
  ('c-9a13', 'mao-dien', 9, 'Lớp 9A13', '9A13-2026', '2025-2026'),
  ('c-9a14', 'mao-dien', 9, 'Lớp 9A14', '9A14-2026', '2025-2026'),
  ('c-9a15', 'mao-dien', 9, 'Lớp 9A15', '9A15-2026', '2025-2026'),
  ('c-9a16', 'mao-dien', 9, 'Lớp 9A16', '9A16-2026', '2025-2026')
ON CONFLICT (id) DO NOTHING;
