import json

with open("c:/Users/manht/Documents/Data_in/temp_teacher/lib/curriculum_116_data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

missing = []
for g, plist in data.items():
    for p in plist:
        ws = p.get("worksheet", {})
        dd = bool(ws.get("dragDrop"))
        fb = len(ws.get("fillBlanks", [])) > 0
        mp = len(ws.get("matchingPairs", [])) > 0
        q7 = len(p.get("reinforcement", {}).get("questions", [])) == 7
        if not (dd and fb and mp and q7):
            missing.append((g, p.get("period"), dd, fb, mp, q7))

print(f"Total periods checked: {sum(len(v) for v in data.values())}")
print(f"Missing full interactive or 7 questions: {len(missing)}")
if missing:
    for item in missing[:5]:
        print(f"Khối {item[0]} Tiết {item[1]}: dd={item[2]}, fb={item[3]}, mp={item[4]}, q7={item[5]}")
else:
    print("Xác nhận: TẤT CẢ 116 TIẾT ĐỀU CÓ ĐỦ DRAG-DROP, DROPDOWN CLOZE, MATCHING PAIRS VÀ 7 CÂU TRẮC NGHIỆM!")
