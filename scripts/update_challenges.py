import re

NEW_CHALLENGES_CODE = '''export const MOCK_PROGRAMMING_CHALLENGES: ProgrammingChallenge[] = [
  {
    id: 'prog-8-01',
    language: 'Python',
    title: 'Bài 11: Tính tổng hai số nguyên A và B',
    gradeLevel: 'Khối 8',
    difficulty: 'Cơ bản',
    description: 'Nhập vào từ bàn phím hai số nguyên A và B trên cùng một dòng, cách nhau bởi dấu cách. Hãy viết chương trình Python tính và in ra tổng S = A + B.',
    inputFormat: 'Một dòng chứa hai số nguyên A và B cách nhau bởi dấu cách (-10^9 <= A, B <= 10^9).',
    outputFormat: 'In ra một số nguyên duy nhất là tổng của A và B.',
    sampleInput: '15 27',
    sampleOutput: '42',
    initialCode: `# Nhập hai số nguyên A và B từ bàn phím
a, b = map(int, input().split())

# Tính tổng và in kết quả
tong = a + b
print(tong)
`,
    xpReward: 50,
    testCases: [
      { input: '15 27', expectedOutput: '42' },
      { input: '-10 25', expectedOutput: '15' },
      { input: '1000 2000', expectedOutput: '3000', isSecret: true },
      { input: '0 0', expectedOutput: '0', isSecret: true }
    ]
  },
  {
    id: 'prog-8-02',
    language: 'Python',
    title: 'Bài 12: Tính chu vi và diện tích hình chữ nhật',
    gradeLevel: 'Khối 8',
    difficulty: 'Cơ bản',
    description: 'Cho chiều dài a và chiều rộng b của hình chữ nhật (a, b > 0) trên một dòng. Viết chương trình Python tính chu vi và diện tích.',
    inputFormat: 'Hai số nguyên dương a và b cách nhau dấu cách.',
    outputFormat: 'Dòng 1: "Chu vi: P". Dòng 2: "Dien tich: S".',
    sampleInput: '4 5',
    sampleOutput: 'Chu vi: 18\\nDien tich: 20',
    initialCode: `a, b = map(int, input().split())
p = (a + b) * 2
s = a * b
print(f"Chu vi: {p}")
print(f"Dien tich: {s}")
`,
    xpReward: 50,
    testCases: [
      { input: '4 5', expectedOutput: 'Chu vi: 18\\nDien tich: 20' },
      { input: '10 20', expectedOutput: 'Chu vi: 60\\nDien tich: 200' },
      { input: '7 3', expectedOutput: 'Chu vi: 20\\nDien tich: 21', isSecret: true }
    ]
  },
  {
    id: 'prog-8-03',
    language: 'Python',
    title: 'Bài 13: Kiểm tra số chẵn lẻ và dấu của số nguyên',
    gradeLevel: 'Khối 8',
    difficulty: 'Cơ bản',
    description: 'Nhập vào số nguyên n. In ra "CHAN DUONG", "CHAN AM", "LE DUONG", "LE AM", hoặc "KHONG".',
    inputFormat: 'Một số nguyên n duy nhất.',
    outputFormat: 'Xâu thông báo kết quả tương ứng.',
    sampleInput: '8',
    sampleOutput: 'CHAN DUONG',
    initialCode: `n = int(input())

if n == 0:
    print("KHONG")
else:
    loai = "CHAN" if n % 2 == 0 else "LE"
    dau = "DUONG" if n > 0 else "AM"
    print(f"{loai} {dau}")
`,
    xpReward: 60,
    testCases: [
      { input: '8', expectedOutput: 'CHAN DUONG' },
      { input: '-7', expectedOutput: 'LE AM' },
      { input: '0', expectedOutput: 'KHONG' },
      { input: '-4', expectedOutput: 'CHAN AM', isSecret: true },
      { input: '9', expectedOutput: 'LE DUONG', isSecret: true }
    ]
  },
  {
    id: 'prog-8-04',
    language: 'Python',
    title: 'Bài 14: Tính tổng S = 1 + 2 + ... + N',
    gradeLevel: 'Khối 8',
    difficulty: 'Cơ bản',
    description: 'Nhập vào số nguyên dương n (1 <= n <= 10^5). Sử dụng vòng lặp for hoặc công thức để tính tổng từ 1 đến n.',
    inputFormat: 'Một số nguyên dương n.',
    outputFormat: 'Tổng S từ 1 đến n.',
    sampleInput: '5',
    sampleOutput: '15',
    initialCode: `n = int(input())
tong = sum(range(1, n + 1))
print(tong)
`,
    xpReward: 60,
    testCases: [
      { input: '5', expectedOutput: '15' },
      { input: '10', expectedOutput: '55' },
      { input: '100', expectedOutput: '5050', isSecret: true }
    ]
  },
  {
    id: 'prog-8-05',
    language: 'Python',
    title: 'Bài 15: Tìm số lớn nhất và nhỏ nhất trong danh sách (List)',
    gradeLevel: 'Khối 8',
    difficulty: 'Trung bình',
    description: 'Dòng đầu chứa số lượng phần tử N. Dòng thứ hai chứa N số nguyên cách nhau dấu cách. Hãy in ra giá trị lớn nhất (Max) và nhỏ nhất (Min).',
    inputFormat: 'Dòng 1 chứa N. Dòng 2 chứa N số nguyên.',
    outputFormat: 'Dòng 1: "Max: <giá_trị>". Dòng 2: "Min: <giá_trị>".',
    sampleInput: '5\\n3 9 1 7 4',
    sampleOutput: 'Max: 9\\nMin: 1',
    initialCode: `n = int(input())
arr = list(map(int, input().split()))

print(f"Max: {max(arr)}")
print(f"Min: {min(arr)}")
`,
    xpReward: 70,
    testCases: [
      { input: '5\\n3 9 1 7 4', expectedOutput: 'Max: 9\\nMin: 1' },
      { input: '4\\n-5 -2 -9 -1', expectedOutput: 'Max: -1\\nMin: -9' },
      { input: '3\\n100 100 100', expectedOutput: 'Max: 100\\nMin: 100', isSecret: true }
    ]
  },
  {
    id: 'prog-9-01',
    language: 'Python',
    title: 'Khối 9: Viết hàm kiểm tra số nguyên tố',
    gradeLevel: 'Khối 9',
    difficulty: 'Trung bình',
    description: 'Nhập vào số nguyên dương n. Viết hàm kiem_tra_nguyen_to(n) trả về True nếu n là số nguyên tố, ngược lại False. In ra "YES" hoặc "NO".',
    inputFormat: 'Một số nguyên dương n (1 <= n <= 10^7).',
    outputFormat: 'In "YES" nếu là số nguyên tố, "NO" nếu không phải.',
    sampleInput: '7',
    sampleOutput: 'YES',
    initialCode: `def kiem_tra_nguyen_to(n):
    if n < 2:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True

n = int(input())
if kiem_tra_nguyen_to(n):
    print("YES")
else:
    print("NO")
`,
    xpReward: 80,
    testCases: [
      { input: '7', expectedOutput: 'YES' },
      { input: '12', expectedOutput: 'NO' },
      { input: '2', expectedOutput: 'YES' },
      { input: '1', expectedOutput: 'NO', isSecret: true },
      { input: '97', expectedOutput: 'YES', isSecret: true }
    ]
  },
  {
    id: 'prog-9-02',
    language: 'Python',
    title: 'Khối 9: Đếm số ước số của số nguyên dương N',
    gradeLevel: 'Khối 9',
    difficulty: 'Trung bình',
    description: 'Nhập vào số nguyên dương n. Hãy đếm số lượng các ước số nguyên dương của n.',
    inputFormat: 'Một số nguyên dương n.',
    outputFormat: 'Một số nguyên duy nhất là số ước số của n.',
    sampleInput: '12',
    sampleOutput: '6',
    initialCode: `n = int(input())
count = 0
for i in range(1, int(n**0.5) + 1):
    if n % i == 0:
        count += 1
        if i * i != n:
            count += 1
print(count)
`,
    xpReward: 80,
    testCases: [
      { input: '12', expectedOutput: '6' },
      { input: '7', expectedOutput: '2' },
      { input: '100', expectedOutput: '9', isSecret: true },
      { input: '1', expectedOutput: '1', isSecret: true }
    ]
  },
  {
    id: 'prog-9-03',
    language: 'Python',
    title: 'Khối 9: Kiểm tra xâu đối xứng (Palindrome)',
    gradeLevel: 'Khối 9',
    difficulty: 'Trung bình',
    description: 'Nhập vào một xâu ký tự s (không chứa dấu cách). In "YES" nếu xâu đọc xuôi đọc ngược đều giống nhau, ngược lại in "NO".',
    inputFormat: 'Một dòng chứa xâu ký tự s.',
    outputFormat: 'In "YES" hoặc "NO".',
    sampleInput: 'radar',
    sampleOutput: 'YES',
    initialCode: `s = input().strip()
if s == s[::-1]:
    print("YES")
else:
    print("NO")
`,
    xpReward: 75,
    testCases: [
      { input: 'radar', expectedOutput: 'YES' },
      { input: 'maodien', expectedOutput: 'NO' },
      { input: 'A', expectedOutput: 'YES', isSecret: true },
      { input: '12321', expectedOutput: 'YES', isSecret: true }
    ]
  },
  {
    id: 'prog-9-04',
    language: 'Python',
    title: 'Khối 9: Sắp xếp dãy số tăng dần',
    gradeLevel: 'Khối 9',
    difficulty: 'Trung bình',
    description: 'Nhập vào số lượng phần tử N và dãy N số nguyên. Hãy sắp xếp dãy số theo thứ tự tăng dần và in các phần tử cách nhau bởi dấu cách.',
    inputFormat: 'Dòng 1: N. Dòng 2: N số nguyên.',
    outputFormat: 'Dãy số sau khi sắp xếp tăng dần cách nhau dấu cách.',
    sampleInput: '5\\n4 2 5 1 3',
    sampleOutput: '1 2 3 4 5',
    initialCode: `n = int(input())
arr = list(map(int, input().split()))
arr.sort()
print(*(arr))
`,
    xpReward: 75,
    testCases: [
      { input: '5\\n4 2 5 1 3', expectedOutput: '1 2 3 4 5' },
      { input: '3\\n10 5 8', expectedOutput: '5 8 10' },
      { input: '4\\n-1 -5 0 2', expectedOutput: '-5 -1 0 2', isSecret: true }
    ]
  },
  {
    id: 'prog-hsg-01',
    language: 'Python',
    title: 'HSG: Tìm số Fibonacci thứ N',
    gradeLevel: 'Bồi dưỡng HSG',
    difficulty: 'Nâng cao',
    description: 'Dãy số Fibonacci được định nghĩa: F(1) = 1, F(2) = 1, F(n) = F(n-1) + F(n-2) với n >= 3. Cho số nguyên dương n (1 <= n <= 50). Hãy tìm số F(n).',
    inputFormat: 'Số nguyên dương n.',
    outputFormat: 'Giá trị F(n).',
    sampleInput: '6',
    sampleOutput: '8',
    initialCode: `n = int(input())
if n <= 2:
    print(1)
else:
    a, b = 1, 1
    for _ in range(3, n + 1):
        a, b = b, a + b
    print(b)
`,
    xpReward: 100,
    testCases: [
      { input: '6', expectedOutput: '8' },
      { input: '10', expectedOutput: '55' },
      { input: '15', expectedOutput: '610', isSecret: true },
      { input: '1', expectedOutput: '1', isSecret: true }
    ]
  },
  {
    id: 'prog-hsg-02',
    language: 'Python',
    title: 'HSG: Đếm số từ trong văn bản',
    gradeLevel: 'Bồi dưỡng HSG',
    difficulty: 'Nâng cao',
    description: 'Cho một đoạn văn bản gồm nhiều từ cách nhau bởi một hoặc nhiều khoảng trắng. Hãy đếm xem có bao nhiêu từ trong đoạn văn bản.',
    inputFormat: 'Một dòng văn bản.',
    outputFormat: 'Số nguyên là số từ đếm được.',
    sampleInput: 'Truong THCS Mao Dien que huong toi',
    sampleOutput: '7',
    initialCode: `s = input().strip()
words = s.split()
print(len(words))
`,
    xpReward: 90,
    testCases: [
      { input: 'Truong THCS Mao Dien que huong toi', expectedOutput: '7' },
      { input: 'Tin hoc that la tuyet voi', expectedOutput: '6' },
      { input: '  mot   hai   ba  ', expectedOutput: '3', isSecret: true }
    ]
  },
  {
    id: 'prog-cpp-01',
    language: 'C++',
    title: 'HSG C++: Ước chung lớn nhất (GCD) hai số',
    gradeLevel: 'Bồi dưỡng HSG',
    difficulty: 'Trung bình',
    description: 'Cho hai số nguyên dương a và b. Tìm ước chung lớn nhất của a và b bằng thuật toán Euclid.',
    inputFormat: 'Hai số nguyên dương a và b cách nhau dấu cách.',
    outputFormat: 'Ước chung lớn nhất của a và b.',
    sampleInput: '24 36',
    sampleOutput: '12',
    initialCode: `#include <iostream>
using namespace std;

long long gcd(long long a, long long b) {
    while (b != 0) {
        long long r = a % b;
        a = b;
        b = r;
    }
    return a;
}

int main() {
    long long a, b;
    if (cin >> a >> b) {
        cout << gcd(a, b);
    }
    return 0;
}
`,
    xpReward: 85,
    testCases: [
      { input: '24 36', expectedOutput: '12' },
      { input: '17 19', expectedOutput: '1' },
      { input: '100 25', expectedOutput: '25', isSecret: true }
    ]
  }
];'''

with open('c:/Users/manht/Documents/Data_in/temp_teacher/lib/mock-data.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Thay thế khối MOCK_PROGRAMMING_CHALLENGES
pattern = r'export const MOCK_PROGRAMMING_CHALLENGES: ProgrammingChallenge\[\] = \[.*?\];'
match = re.search(pattern, content, re.DOTALL)
if match:
    new_content = content[:match.start()] + NEW_CHALLENGES_CODE + content[match.end():]
    with open('c:/Users/manht/Documents/Data_in/temp_teacher/lib/mock-data.ts', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Đã cập nhật thành công 12 bài lập trình chuẩn SGK vào MOCK_PROGRAMMING_CHALLENGES!")
else:
    print("Không tìm thấy vị trí MOCK_PROGRAMMING_CHALLENGES để thay thế.")

