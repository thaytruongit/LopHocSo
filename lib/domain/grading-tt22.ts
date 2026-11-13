import { OfficialGradeRow, Student, TT22Rank } from './types';

/**
 * Công thức chuẩn Thông tư 22/2021/TT-BGDĐT:
 * ĐTBmhk = (TĐĐGtx + 2 * ĐĐGgk + 3 * ĐĐGck) / (Số ĐĐGtx + 5)
 * Với 4 đầu điểm ĐĐGtx -> mẫu số = 4 + 2 + 3 = 9
 */
export function computeTT22Average(scores: {
  tx1: number;
  tx2: number;
  tx3: number;
  tx4: number;
  gk: number;
  ck: number;
}): number {
  const clamp = (v: number) => Math.max(0, Math.min(10, Number.isFinite(v) ? v : 0));
  const tx1 = clamp(scores.tx1);
  const tx2 = clamp(scores.tx2);
  const tx3 = clamp(scores.tx3);
  const tx4 = clamp(scores.tx4);
  const gk = clamp(scores.gk);
  const ck = clamp(scores.ck);

  const raw = (tx1 + tx2 + tx3 + tx4 + 2 * gk + 3 * ck) / 9;
  return Number(raw.toFixed(1));
}

export function classifyTT22Rank(dtb: number): TT22Rank {
  if (dtb < 5.0) return 'Chưa đạt';
  if (dtb < 6.5) return 'Đạt';
  if (dtb < 8.0) return 'Khá';
  return 'Tốt';
}

export function generateTT22Comment(rank: TT22Rank): string {
  switch (rank) {
    case 'Chưa đạt':
      return 'Cần tăng cường rèn luyện thao tác máy tính tại phòng thực hành và ôn lại kiến thức cơ bản.';
    case 'Đạt':
      return 'Hoàn thành các yêu cầu cần đạt, cần chủ động luyện tập thêm bài tập vận dụng.';
    case 'Khá':
      return 'Thao tác nhanh nhẹn, nắm chắc lý thuyết và hoàn thành tốt bài thực hành trên lớp.';
    case 'Tốt':
      return 'Xuất sắc, tư duy tin học logic, hoàn thành tốt các nhiệm vụ khám phá và thực hành số.';
  }
}

export function buildBaselineGradeRow(
  student: Student,
  semester: 'hk1' | 'hk2' | 'year' = 'hk1'
): OfficialGradeRow {
  // Deterministic baseline derived cleanly from student profile scores (no random jitter)
  const base = Math.max(5.5, Math.min(9.8, Number(student.averageGrade || 8.0)));
  const progress = Math.max(5.5, Math.min(10, Number(student.progressScore || base)));
  const contrib = Math.max(5.5, Math.min(10, Number(student.contributionScore || base)));

  const shift = semester === 'hk2' ? 0.2 : semester === 'year' ? 0.1 : 0;
  const round1 = (n: number) => Number(Math.max(0, Math.min(10, n)).toFixed(1));

  const tx1 = round1(base + shift);
  const tx2 = round1(progress + shift);
  const tx3 = round1(contrib + shift);
  const tx4 = round1((base + progress) / 2 + shift);
  const gk = round1(base + shift);
  const ck = round1((base * 0.6 + progress * 0.4) + shift);

  const dtb = computeTT22Average({ tx1, tx2, tx3, tx4, gk, ck });
  const rank = classifyTT22Rank(dtb);

  return {
    tenantId: student.tenantId,
    studentCode: student.studentCode,
    fullName: student.fullName,
    classId: student.classId,
    className: student.className,
    semester,
    tx1,
    tx2,
    tx3,
    tx4,
    gk,
    ck,
    dtb,
    rank,
    comment: generateTT22Comment(rank),
  };
}

export function updateGradeRowScores(
  row: OfficialGradeRow,
  patch: Partial<Pick<OfficialGradeRow, 'tx1' | 'tx2' | 'tx3' | 'tx4' | 'gk' | 'ck' | 'comment'>>
): OfficialGradeRow {
  const tx1 = patch.tx1 !== undefined ? patch.tx1 : row.tx1;
  const tx2 = patch.tx2 !== undefined ? patch.tx2 : row.tx2;
  const tx3 = patch.tx3 !== undefined ? patch.tx3 : row.tx3;
  const tx4 = patch.tx4 !== undefined ? patch.tx4 : row.tx4;
  const gk = patch.gk !== undefined ? patch.gk : row.gk;
  const ck = patch.ck !== undefined ? patch.ck : row.ck;

  const dtb = computeTT22Average({ tx1, tx2, tx3, tx4, gk, ck });
  const rank = classifyTT22Rank(dtb);

  return {
    ...row,
    tx1,
    tx2,
    tx3,
    tx4,
    gk,
    ck,
    dtb,
    rank,
    comment: patch.comment !== undefined ? patch.comment : generateTT22Comment(rank),
    updatedAt: new Date().toISOString(),
  };
}

export interface ClassGradeStats {
  total: number;
  tot: number;
  kha: number;
  dat: number;
  chuaDat: number;
  avgDtb: number;
}

export function computeClassGradeStats(rows: OfficialGradeRow[]): ClassGradeStats {
  const total = rows.length;
  if (total === 0) {
    return { total: 0, tot: 0, kha: 0, dat: 0, chuaDat: 0, avgDtb: 0 };
  }

  let tot = 0;
  let kha = 0;
  let dat = 0;
  let chuaDat = 0;
  let sum = 0;

  for (const r of rows) {
    if (r.rank === 'Tốt') tot++;
    else if (r.rank === 'Khá') kha++;
    else if (r.rank === 'Đạt') dat++;
    else chuaDat++;
    sum += r.dtb;
  }

  return {
    total,
    tot,
    kha,
    dat,
    chuaDat,
    avgDtb: Number((sum / total).toFixed(1)),
  };
}
