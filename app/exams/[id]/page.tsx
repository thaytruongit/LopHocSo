import fs from 'node:fs';
import path from 'node:path';
import ExamClient from './ExamClient';

export function generateStaticParams() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'exams.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const exams = JSON.parse(raw) as { id: string }[];
    return exams.map((e) => ({ id: e.id }));
  } catch {
    return [
      { id: 'exam-mid-6' },
      { id: 'exam-final-6' },
      { id: 'exam-mid-7' },
      { id: 'exam-final-7' },
      { id: 'exam-mid-8' },
      { id: 'exam-final-8' },
      { id: 'exam-mid-9' },
      { id: 'exam-final-9' },
    ];
  }
}

export default function ExamPage() {
  return <ExamClient />;
}
