const fs = require('fs');
const path = require('path');

const rawStudents = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'students.json'), 'utf8'));

const classesMap = {
  '6A10': { id: 'c-6a10', grade: 6, name: 'Lớp 6A10' },
  '6A11': { id: 'c-6a11', grade: 6, name: 'Lớp 6A11' },
  '6A12': { id: 'c-6a12', grade: 6, name: 'Lớp 6A12' },
  '6A13': { id: 'c-6a13', grade: 6, name: 'Lớp 6A13' },
  '7A10': { id: 'c-7a10', grade: 7, name: 'Lớp 7A10' },
  '7A11': { id: 'c-7a11', grade: 7, name: 'Lớp 7A11' },
  '7A12': { id: 'c-7a12', grade: 7, name: 'Lớp 7A12' },
  '7A13': { id: 'c-7a13', grade: 7, name: 'Lớp 7A13' },
  '8A11': { id: 'c-8a11', grade: 8, name: 'Lớp 8A11' },
  '8A12': { id: 'c-8a12', grade: 8, name: 'Lớp 8A12' },
  '8A13': { id: 'c-8a13', grade: 8, name: 'Lớp 8A13' },
  '9A13': { id: 'c-9a13', grade: 9, name: 'Lớp 9A13' },
  '9A14': { id: 'c-9a14', grade: 9, name: 'Lớp 9A14' },
  '9A15': { id: 'c-9a15', grade: 9, name: 'Lớp 9A15' },
  '9A16': { id: 'c-9a16', grade: 9, name: 'Lớp 9A16' },
};

const counts = {};
rawStudents.forEach(s => {
  counts[s.class] = (counts[s.class] || 0) + 1;
});

const classesTs = Object.keys(classesMap).sort().map(k => ({
  id: classesMap[k].id,
  grade: classesMap[k].grade,
  name: classesMap[k].name,
  classCode: `${k}-2026`,
  studentCount: counts[k] || 0
}));

const studentsTs = rawStudents.map((s, i) => {
  const meta = classesMap[s.class] || { id: 'c-other', grade: 6, name: s.class };
  return {
    id: `s-${s.class.toLowerCase()}-${String(i + 1).padStart(3, '0')}`,
    classId: meta.id,
    className: meta.name,
    studentCode: s.code,
    fullName: s.name,
    dob: s.dob,
    password: '123',
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${s.code}`,
    totalXp: 500 + (i % 30) * 25,
    level: 5,
    streakDays: 7,
    completedTasks: 10,
    averageGrade: 8.5,
    progressScore: 80,
    codeScore: 85,
    contributionScore: 80,
    badgesCount: 1
  };
});

// Read existing mock-data.ts
const mockDataPath = path.join(__dirname, 'lib', 'mock-data.ts');
let mockDataContent = fs.readFileSync(mockDataPath, 'utf8');

// Replace MOCK_CLASSES
const classesJson = JSON.stringify(classesTs, null, 2);
mockDataContent = mockDataContent.replace(
  /export const MOCK_CLASSES: ClassItem\[\] = \[[\s\S]*?\];/,
  `export const MOCK_CLASSES: ClassItem[] = ${classesJson};`
);

// Replace MOCK_STUDENTS
const studentsJson = JSON.stringify(studentsTs, null, 2);
mockDataContent = mockDataContent.replace(
  /export const MOCK_STUDENTS: Student\[\] = \[[\s\S]*?\];/,
  `export const MOCK_STUDENTS: Student[] = ${studentsJson};`
);

fs.writeFileSync(mockDataPath, mockDataContent, 'utf8');
console.log(`Updated mock-data.ts with ${classesTs.length} classes and ${studentsTs.length} students!`);

