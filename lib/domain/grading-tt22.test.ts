import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBaselineGradeRow,
  classifyTT22Rank,
  computeClassGradeStats,
  computeTT22Average,
  updateGradeRowScores,
} from './grading-tt22';
import { Student } from './types';

test('computeTT22Average follows (TX1+TX2+TX3+TX4 + 2*GK + 3*CK)/9', () => {
  const avg = computeTT22Average({
    tx1: 9,
    tx2: 8,
    tx3: 9,
    tx4: 10,
    gk: 8.5,
    ck: 9,
  });
  // (36 + 17 + 27) / 9 = 80 / 9 = 8.888 -> 8.9
  assert.equal(avg, 8.9);
});

test('classifyTT22Rank maps boundaries accurately', () => {
  assert.equal(classifyTT22Rank(4.9), 'Chưa đạt');
  assert.equal(classifyTT22Rank(5.0), 'Đạt');
  assert.equal(classifyTT22Rank(6.4), 'Đạt');
  assert.equal(classifyTT22Rank(6.5), 'Khá');
  assert.equal(classifyTT22Rank(7.9), 'Khá');
  assert.equal(classifyTT22Rank(8.0), 'Tốt');
  assert.equal(classifyTT22Rank(10.0), 'Tốt');
});

test('updateGradeRowScores recalculates DTB, rank, and preserves tenantId', () => {
  const sampleStudent: Student = {
    id: 's-1',
    tenantId: 'mao-dien',
    classId: 'c-7a11',
    className: 'Lớp 7A11',
    studentCode: 'HS7A1101',
    fullName: 'Lê Thị Bảo An',
    totalXp: 350,
    level: 4,
    streakDays: 5,
    completedTasks: 9,
    averageGrade: 9.0,
    progressScore: 9.0,
    contributionScore: 9.0,
    badgesCount: 3,
  };

  const base = buildBaselineGradeRow(sampleStudent, 'hk1');
  assert.equal(base.tenantId, 'mao-dien');
  assert.equal(base.rank, 'Tốt');

  const updated = updateGradeRowScores(base, {
    tx1: 5.0,
    tx2: 5.0,
    tx3: 5.0,
    tx4: 5.0,
    gk: 6.0,
    ck: 6.0,
  });
  // (20 + 12 + 18) / 9 = 50/9 = 5.6
  assert.equal(updated.dtb, 5.6);
  assert.equal(updated.rank, 'Đạt');
});

test('computeClassGradeStats aggregates distribution and average accurately', () => {
  const mkStudent = (code: string, avg: number): Student => ({
    id: code,
    tenantId: 'mao-dien',
    classId: 'c-6a10',
    className: 'Lớp 6A10',
    studentCode: code,
    fullName: code,
    totalXp: 100,
    level: 1,
    streakDays: 1,
    completedTasks: 1,
    averageGrade: avg,
    progressScore: avg,
    contributionScore: avg,
    badgesCount: 1,
  });

  const rows = [
    buildBaselineGradeRow(mkStudent('S1', 9.0)),
    buildBaselineGradeRow(mkStudent('S2', 7.0)),
    buildBaselineGradeRow(mkStudent('S3', 5.5)),
  ];

  const stats = computeClassGradeStats(rows);
  assert.equal(stats.total, 3);
  assert.equal(stats.tot, 1);
  assert.equal(stats.kha, 1);
  assert.equal(stats.dat, 1);
  assert.equal(stats.chuaDat, 0);
  assert.equal(stats.avgDtb, 7.2);
});
