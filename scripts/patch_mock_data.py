import json
import re

with open(r"C:\Users\manht\teacher\scripts\roster_classes.json", "r", encoding="utf-8") as f:
    classes = json.load(f)

with open(r"C:\Users\manht\teacher\scripts\roster_students.json", "r", encoding="utf-8") as f:
    students = json.load(f)

with open(r"C:\Users\manht\teacher\lib\mock-data.ts", "r", encoding="utf-8") as f:
    old_content = f.read()

# Generate TS string for classes
classes_ts = "export const MOCK_CLASSES: ClassItem[] = " + json.dumps(classes, ensure_ascii=False, indent=2) + ";\n"

# Generate TS string for students
students_ts = "export const MOCK_STUDENTS: Student[] = " + json.dumps(students, ensure_ascii=False, indent=2) + ";\n"

# Replace MOCK_CLASSES and MOCK_STUDENTS
# Find from 'export const MOCK_CLASSES' to 'export const MOCK_WORKSHEETS'
pattern = re.compile(r"export const MOCK_CLASSES: ClassItem\[\] = .*?;\s*export const MOCK_STUDENTS: Student\[\] = .*?;\s*export const MOCK_WORKSHEETS", re.DOTALL)

replacement = f"{classes_ts}\n{students_ts}\nexport const MOCK_WORKSHEETS"

new_content = pattern.sub(replacement, old_content, count=1)

# Now update sample submissions to reference real students:
# Let's find real students from 7A11, 8A11, 8A12, 6A10
sub_sample = """export const MOCK_SUBMISSIONS: PracticalSubmission[] = [
  {
    id: 'sub-01',
    submissionCode: 'SUB-2026-7A11-001',
    studentCode: '7A1101',
    studentName: 'Lê Thị Bảo An',
    classId: 'c-7a11',
    className: 'Lớp 7A11',
    assignmentTitle: 'Tiết 6: Địa chỉ tương đối và tuyệt đối',
    fileName: '7A11_7A1101_LeThiBaoAn_Tiet6.xlsx',
    fileSize: '14.2 KB',
    submittedAt: 'Hôm nay lúc 09:15',
    grade: 10,
    feedback: 'Bài làm xuất sắc! Sử dụng chính xác địa chỉ $C$2 để tính chiết khấu.',
    status: 'graded',
  },
  {
    id: 'sub-02',
    submissionCode: 'SUB-2026-8A11-001',
    studentCode: '8A1101',
    studentName: 'Lê Hoài An',
    classId: 'c-8a11',
    className: 'Lớp 8A11',
    assignmentTitle: 'Tiết 6: Địa chỉ tương đối và tuyệt đối',
    fileName: '8A11_8A1101_LeHoaiAn_Tiet6.xlsx',
    fileSize: '13.8 KB',
    submittedAt: 'Hôm nay lúc 09:22',
    grade: 9.0,
    feedback: 'Công thức đúng, cần chú ý định dạng dấu phân cách phần nghìn ở cột Thành tiền.',
    status: 'graded',
  },
  {
    id: 'sub-03',
    submissionCode: 'SUB-2026-8A12-001',
    studentCode: '8A1201',
    studentName: 'Nguyễn Phương Anh',
    classId: 'c-8a12',
    className: 'Lớp 8A12',
    assignmentTitle: 'Bài tập hàm IF, SUMIF, COUNTIF',
    fileName: '8A12_8A1201_NguyenPhuongAnh_HamIF.xlsx',
    fileSize: '16.5 KB',
    submittedAt: 'Hôm nay lúc 10:05',
    status: 'submitted',
  },
  {
    id: 'sub-04',
    submissionCode: 'SUB-2026-6A10-001',
    studentCode: '6A1001',
    studentName: 'Lê Thị Hoài An',
    classId: 'c-6a10',
    className: 'Lớp 6A10',
    assignmentTitle: 'Thực hành sơ đồ tư duy & Văn bản số',
    fileName: '6A10_6A1001_LeThiHoaiAn_SoDoTuDuy.docx',
    fileSize: '84.0 KB',
    submittedAt: 'Hôm qua lúc 15:40',
    grade: 9.5,
    feedback: 'Trình bày sơ đồ tư duy logic, màu sắc trực quan.',
    status: 'graded',
  },
];"""

sub_pattern = re.compile(r"export const MOCK_SUBMISSIONS: PracticalSubmission\[\] = \[.*?\];", re.DOTALL)
new_content = sub_pattern.sub(sub_sample, new_content, count=1)

# Now update MOCK_RECENT_RESULTS to reference real students
recent_res_sample = """export const MOCK_RECENT_RESULTS: ExamResult[] = [
  {
    id: 'res-1',
    examId: 'exam-701',
    examTitle: 'Kiểm tra thường xuyên: Bảng tính Excel & Địa chỉ ô',
    studentId: 's-7a11-01',
    studentName: 'Lê Thị Bảo An',
    className: 'Lớp 7A11',
    score: 9.5,
    maxScore: 10.0,
    durationSec: 620,
    tabSwitches: 0,
    submittedAt: '5 phút trước',
    xpEarned: 100,
    isEssayReviewed: true,
  },
  {
    id: 'res-2',
    examId: 'exam-801',
    examTitle: 'Kiểm tra giữa kỳ: Thuật toán & Cấu trúc rẽ nhánh',
    studentId: 's-8a11-01',
    studentName: 'Lê Hoài An',
    className: 'Lớp 8A11',
    score: 9.0,
    maxScore: 10.0,
    durationSec: 510,
    tabSwitches: 0,
    submittedAt: '15 phút trước',
    xpEarned: 85,
    isEssayReviewed: true,
  },
  {
    id: 'res-3',
    examId: 'exam-901',
    examTitle: 'Kiểm tra định kỳ: Mạng máy tính & An toàn thông tin',
    studentId: 's-9a14-01',
    studentName: 'Đỗ Thị Quỳnh Anh',
    className: 'Lớp 9A14',
    score: 10.0,
    maxScore: 10.0,
    durationSec: 850,
    tabSwitches: 0,
    submittedAt: '35 phút trước',
    xpEarned: 120,
    isEssayReviewed: true,
  },
];"""

res_pattern = re.compile(r"export const MOCK_RECENT_RESULTS: ExamResult\[\] = \[.*?\];", re.DOTALL)
new_content = res_pattern.sub(recent_res_sample, new_content, count=1)

with open(r"C:\Users\manht\teacher\lib\mock-data.ts", "w", encoding="utf-8") as f:
    f.write(new_content)

print(f"Successfully patched lib/mock-data.ts with {len(students)} students and {len(classes)} classes.")
