with open('c:/Users/manht/Documents/Data_in/temp_teacher/lib/mock-data.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
pos = text.find('MOCK_PROGRAMMING_CHALLENGES')
if pos != -1:
    snippet = text[pos:pos+4000]
    titles = re.findall(r"title:\s*['\"](.*?)['\"]", snippet)
    print("Found titles:", len(titles))
    for t in titles:
        print(" -", t)

