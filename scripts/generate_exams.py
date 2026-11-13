import json

with open('c:/Users/manht/Documents/Data_in/temp_teacher/lib/curriculum_116_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Tạo đề thi 16 câu cho từng khối từ 7 câu/tiết
# Lấy câu hỏi từ các tiết 1 đến 8 (Giữa kì 1) và tiết 1 đến 15 (Cuối kì 1)
exams_generated = []

for g_str in ['6', '7', '8', '9']:
    g = int(g_str)
    periods = data.get(g_str, [])
    
    # 1. Đề thi Giữa kỳ (Tiết 1 -> 8)
    mid_questions = []
    for p in periods[:8]:
        qs = p.get('reinforcement', {}).get('questions', [])
        if qs:
            mid_questions.extend(qs[:2]) # lấy 2 câu/tiết -> 16 câu
    mid_questions = mid_questions[:16]

    # 2. Đề thi Cuối kỳ (Tiết 1 -> 15)
    final_questions = []
    for p in periods[:15]:
        qs = p.get('reinforcement', {}).get('questions', [])
        if qs:
            final_questions.append(qs[0]) # 1 câu mỗi tiết
    final_questions = final_questions[:16]

    print(f"Khối {g}: Giữa kỳ {len(mid_questions)} câu, Cuối kỳ {len(final_questions)} câu")

