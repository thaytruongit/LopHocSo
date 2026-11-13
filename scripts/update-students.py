import json
import re

with open('temp_teacher/data/students.json', 'r', encoding='utf-8') as f:
    raw_students = json.load(f)

classes_map = {
  '6A10': { 'id': 'c-6a10', 'grade': 6, 'name': 'Lớp 6A10' },
  '6A11': { 'id': 'c-6a11', 'grade': 6, 'name': 'Lớp 6A11' },
  '6A12': { 'id': 'c-6a12', 'grade': 6, 'name': 'Lớp 6A12' },
  '6A13': { 'id': 'c-6a13', 'grade': 6, 'name': 'Lớp 6A13' },
  '7A10': { 'id': 'c-7a10', 'grade': 7, 'name': 'Lớp 7A10' },
  '7A11': { 'id': 'c-7a11', 'grade': 7, 'name': 'Lớp 7A11' },
  '7A12': { 'id': 'c-7a12', 'grade': 7, 'name': 'Lớp 7A12' },
  '7A13': { 'id': 'c-7a13', 'grade': 7, 'name': 'Lớp 7A13' },
  '8A11': { 'id': 'c-8a11', 'grade': 8, 'name': 'Lớp 8A11' },
  '8A12': { 'id': 'c-8a12', 'grade': 8, 'name': 'Lớp 8A12' },
  '8A13': { 'id': 'c-8a13', 'grade': 8, 'name': 'Lớp 8A13' },
  '9A13': { 'id': 'c-9a13', 'grade': 9, 'name': 'Lớp 9A13' },
  '9A14': { 'id': 'c-9a14', 'grade': 9, 'name': 'Lớp 9A14' },
  '9A15': { 'id': 'c-9a15', 'grade': 9, 'name': 'Lớp 9A15' },
  '9A16': { 'id': 'c-9a16', 'grade': 9, 'name': 'Lớp 9A16' },
}

counts = {}
for s in raw_students:
    c = s['class']
    counts[c] = counts.get(c, 0) + 1

classes_ts = []
for k in sorted(classes_map.keys()):
    meta = classes_map[k]
    classes_ts.append({
        'id': meta['id'],
        'grade': meta['grade'],
        'name': meta['name'],
        'classCode': f"{k}-2026",
        'studentCount': counts.get(k, 0)
    })

students_ts = []
for i, s in enumerate(raw_students):
    c = s['class']
    meta = classes_map.get(c, { 'id': 'c-other', 'grade': 6, 'name': c })
    idx_str = str(i + 1).zfill(3)
    students_ts.append({
        'id': f"s-{c.lower()}-{idx_str}",
        'classId': meta['id'],
        'className': meta['name'],
        'studentCode': s['code'],
        'fullName': s['name'],
        'dob': s['dob'],
        'password': '123',
        'avatarUrl': f"https://api.dicebear.com/7.x/bottts/svg?seed={s['code']}",
        'totalXp': 500 + (i % 30) * 25,
        'level': 5,
        'streakDays': 7,
        'completedTasks': 10,
        'averageGrade': 8.5,
        'progressScore': 80,
        'codeScore': 85,
        'contributionScore': 80,
        'badgesCount': 1
    })

with open('temp_teacher/lib/mock-data.ts', 'r', encoding='utf-8') as f:
    content = f.read()

classes_json = json.dumps(classes_ts, ensure_ascii=False, indent=2)
students_json = json.dumps(students_ts, ensure_ascii=False, indent=2)

content = re.sub(
    r'export const MOCK_CLASSES: ClassItem\[\] = \[[\s\S]*?\];',
    f'export const MOCK_CLASSES: ClassItem[] = {classes_json};',
    content,
    count=1
)

content = re.sub(
    r'export const MOCK_STUDENTS: Student\[\] = \[[\s\S]*?\];',
    f'export const MOCK_STUDENTS: Student[] = {students_json};',
    content,
    count=1
)

with open('temp_teacher/lib/mock-data.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"DONE: Updated mock-data.ts with {len(classes_ts)} classes and {len(students_ts)} students!")
