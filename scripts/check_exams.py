with open('c:/Users/manht/Documents/Data_in/temp_teacher/lib/mock-data.ts', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('export const MOCK_EXAMS')
print(text[pos:pos+2000])
