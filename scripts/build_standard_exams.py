import json
import re

with open('c:/Users/manht/Documents/Data_in/temp_teacher/lib/curriculum_116_data.json', 'r', encoding='utf-8') as f:
    curriculum = json.load(f)

exams = []

# Cấu hình 8 đề thi
exam_configs = [
    # KHỐI 6
    {
        'id': 'exam-mid-6',
        'grade': 6,
        'title': 'Đề Kiểm Tra Giữa Học Kỳ 1 - Tin Học 6 (Chuẩn Ma Trận Bộ GD&ĐT)',
        'examType': 'giữa kỳ',
        'durationMin': 45,
        'periodRange': (1, 8),
        'desc': 'Kiểm tra chủ đề: Thông tin và Dữ liệu, Mạng máy tính và Internet, An toàn thông tin số'
    },
    {
        'id': 'exam-final-6',
        'grade': 6,
        'title': 'Đề Kiểm Tra Cuối Học Kỳ 1 - Tin Học 6 (Chuẩn Ma Trận Bộ GD&ĐT)',
        'examType': 'cuối kỳ',
        'durationMin': 45,
        'periodRange': (1, 15),
        'desc': 'Tổng hợp kiến thức Học kỳ 1: Thông tin, Mạng Internet, Soạn thảo văn bản và Đạo đức số'
    },
    # KHỐI 7
    {
        'id': 'exam-mid-7',
        'grade': 7,
        'title': 'Đề Kiểm Tra Giữa Học Kỳ 1 - Tin Học 7 (Chuẩn Ma Trận Bộ GD&ĐT)',
        'examType': 'giữa kỳ',
        'durationMin': 45,
        'periodRange': (1, 8),
        'desc': 'Kiểm tra chủ đề: Thiết bị vào - ra, Phần mềm ứng dụng, Bảng tính điện tử Excel cơ bản'
    },
    {
        'id': 'exam-final-7',
        'grade': 7,
        'title': 'Đề Kiểm Tra Cuối Học Kỳ 1 - Tin Học 7 (Chuẩn Ma Trận Bộ GD&ĐT)',
        'examType': 'cuối kỳ',
        'durationMin': 45,
        'periodRange': (1, 15),
        'desc': 'Tổng hợp Học kỳ 1: Bảng tính điện tử, Định dạng dữ liệu, Hàm tính toán và Trình bày thông tin'
    },
    # KHỐI 8
    {
        'id': 'exam-mid-8',
        'grade': 8,
        'title': 'Đề Kiểm Tra Giữa Học Kỳ 1 - Tin Học 8 (Chuẩn Ma Trận Bộ GD&ĐT)',
        'examType': 'giữa kỳ',
        'durationMin': 45,
        'periodRange': (1, 8),
        'desc': 'Kiểm tra chủ đề: Lịch sử máy tính, Thông tin số, Địa chỉ bảng tính tương đối/tuyệt đối'
    },
    {
        'id': 'exam-final-8',
        'grade': 8,
        'title': 'Đề Kiểm Tra Cuối Học Kỳ 1 - Tin Học 8 (Chuẩn Ma Trận Bộ GD&ĐT)',
        'examType': 'cuối kỳ',
        'durationMin': 45,
        'periodRange': (1, 15),
        'desc': 'Tổng hợp Học kỳ 1: Bảng tính nâng cao, Đồ thị, Lập trình Python cơ bản (biến, rẽ nhánh)'
    },
    # KHỐI 9
    {
        'id': 'exam-mid-9',
        'grade': 9,
        'title': 'Đề Kiểm Tra Giữa Học Kỳ 1 - Tin Học 9 (Chuẩn Ma Trận Bộ GD&ĐT)',
        'examType': 'giữa kỳ',
        'durationMin': 45,
        'periodRange': (1, 8),
        'desc': 'Kiểm tra chủ đề: Mạng máy tính nâng cao, Điện toán đám mây, Dịch vụ mạng và An toàn số'
    },
    {
        'id': 'exam-final-9',
        'grade': 9,
        'title': 'Đề Kiểm Tra Cuối Học Kỳ 1 - Tin Học 9 (Chuẩn Ma Trận Bộ GD&ĐT)',
        'examType': 'cuối kỳ',
        'durationMin': 45,
        'periodRange': (1, 15),
        'desc': 'Tổng hợp Học kỳ 1: An toàn số, Đạo đức pháp luật số, Lập trình giải quyết bài toán thực tế'
    },
]

for cfg in exam_configs:
    g_str = str(cfg['grade'])
    periods = curriculum.get(g_str, [])
    start_p, end_p = cfg['periodRange']
    
    selected_periods = [p for p in periods if start_p <= p.get('period', 0) <= end_p]
    
    questions = []
    # Thu thập câu hỏi phân hóa
    for p in selected_periods:
        p_qs = p.get('reinforcement', {}).get('questions', [])
        if p_qs:
            questions.append(p_qs[0])
            if len(questions) < 16 and len(p_qs) > 1:
                questions.append(p_qs[1])
        if len(questions) >= 16:
            break
            
    questions = questions[:16]
    
    # Chuyển đổi sang format ExamQuestion
    formatted_qs = []
    points_per_q = round(10.0 / len(questions), 2)
    for q_idx, q in enumerate(questions):
        formatted_qs.append({
            'id': f"{cfg['id']}-q{q_idx+1}",
            'content': q.get('question', ''),
            'options': q.get('options', []),
            'correctAnswer': q.get('correctIndex', 0),
            'points': points_per_q,
            'level': q.get('level', 'Nhận biết'),
            'explanation': q.get('explanation', '')
        })
        
    exams.append({
        'id': cfg['id'],
        'grade': cfg['grade'],
        'title': cfg['title'],
        'examType': cfg['examType'],
        'durationMin': cfg['durationMin'],
        'questionsCount': len(formatted_qs),
        'isLocked': False,
        'questions': formatted_qs
    })

print(f"Đã tạo thành công {len(exams)} bộ đề thi chuẩn ma trận đặc tả Bộ GD&ĐT!")
for ex in exams:
    print(f" - [{ex['id']}] {ex['title']} ({ex['questionsCount']} câu, {ex['durationMin']}p)")

# Cập nhật vào lib/mock-data.ts
exams_json = json.dumps(exams, ensure_ascii=False, indent=2)
exams_ts = f"export const MOCK_EXAMS: Exam[] = {exams_json};\n"

with open('c:/Users/manht/Documents/Data_in/temp_teacher/lib/mock-data.ts', 'r', encoding='utf-8') as f:
    mock_content = f.read()

pattern = r'export const MOCK_EXAMS: Exam\[\] = \[.*?\];'
match = re.search(pattern, mock_content, re.DOTALL)
if match:
    updated_mock = mock_content[:match.start()] + exams_ts + mock_content[match.end():]
    with open('c:/Users/manht/Documents/Data_in/temp_teacher/lib/mock-data.ts', 'w', encoding='utf-8') as f:
        f.write(updated_mock)
    print("Đã cập nhật thành công vào lib/mock-data.ts!")
else:
    print("Không tìm thấy MOCK_EXAMS trong lib/mock-data.ts")

