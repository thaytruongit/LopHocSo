import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gradeExamSubmission } from './exam-engine';
import { ClassItem, CurriculumPeriod, Exam, SchoolTenant, Student } from './types';

test('Multi-tenant datasets preserve 670 students, 15 classes, 116 periods, 812 questions, and 8 exams', () => {
  const root = process.cwd();
  const tenants: SchoolTenant[] = JSON.parse(
    fs.readFileSync(path.join(root, 'public/data/tenants.json'), 'utf8')
  );
  const classes: ClassItem[] = JSON.parse(
    fs.readFileSync(path.join(root, 'public/data/classes.json'), 'utf8')
  );
  const students: Student[] = JSON.parse(
    fs.readFileSync(path.join(root, 'public/data/students.json'), 'utf8')
  );
  const exams: Exam[] = JSON.parse(
    fs.readFileSync(path.join(root, 'public/data/exams.json'), 'utf8')
  );

  assert.ok(tenants.length >= 2);
  const maoDienClasses = classes.filter((c) => c.tenantId === 'mao-dien');
  const maoDienStudents = students.filter((s) => s.tenantId === 'mao-dien');

  assert.equal(maoDienClasses.length, 15);
  assert.equal(maoDienStudents.length, 670);
  assert.equal(exams.length, 8);

  let totalPeriods = 0;
  let totalQuestions = 0;
  for (const grade of [6, 7, 8, 9]) {
    const periods: CurriculumPeriod[] = JSON.parse(
      fs.readFileSync(path.join(root, `public/data/curriculum/grade-${grade}.json`), 'utf8')
    );
    assert.equal(periods.length, 29, `Grade ${grade} must have 29 periods`);
    totalPeriods += periods.length;
    for (const p of periods) {
      assert.equal(p.reinforcement.questions.length, 7, `Period ${p.id} must have 7 questions`);
      totalQuestions += p.reinforcement.questions.length;
    }
  }

  assert.equal(totalPeriods, 116);
  assert.equal(totalQuestions, 812);
});

test('gradeExamSubmission scores real exam correctly', () => {
  const root = process.cwd();
  const exams: Exam[] = JSON.parse(
    fs.readFileSync(path.join(root, 'public/data/exams.json'), 'utf8')
  );
  const firstExam = exams[0];
  const allCorrect: Record<string, number> = {};
  for (const q of firstExam.questions) {
    allCorrect[q.id] = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
  }

  const res = gradeExamSubmission(firstExam, allCorrect);
  assert.equal(res.score, 10);
  assert.equal(res.correctCount, firstExam.questions.length);
});

test('Programming/code-judging files are completely removed', () => {
  const root = process.cwd();
  assert.equal(fs.existsSync(path.join(root, 'app/programming/page.tsx')), false);
  assert.equal(fs.existsSync(path.join(root, 'lib/pyodide-runner.ts')), false);
});
