import { NextRequest, NextResponse } from 'next/server';
import {
  getServerSubmissions,
  upsertServerHomeworkSubmission,
  upsertServerPracticalSubmission,
} from '@/lib/server/realtime-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const tenantId = searchParams.get('tenantId') || 'mao-dien';
  const classId = searchParams.get('classId') || '';

  const data = getServerSubmissions(tenantId);
  const practical = classId
    ? data.practicalSubmissions.filter((s) => s.classId === classId)
    : data.practicalSubmissions;
  const homework = classId
    ? data.homeworkSubmissions.filter((s) => s.classId === classId)
    : data.homeworkSubmissions;

  return NextResponse.json(
    {
      practicalSubmissions: practical,
      homeworkSubmissions: homework,
      serverTime: Date.now(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const kind = body?.kind === 'homework' ? 'homework' : 'practical';
    const submission = body?.submission;

    if (!submission || !submission.id || !submission.tenantId) {
      return NextResponse.json(
        { ok: false, error: 'Thiếu dữ liệu bài nộp hợp lệ' },
        { status: 400 }
      );
    }

    if (kind === 'homework') {
      const homeworkSubmissions = upsertServerHomeworkSubmission(submission);
      return NextResponse.json({ ok: true, homeworkSubmissions });
    }

    const practicalSubmissions = upsertServerPracticalSubmission(submission);
    return NextResponse.json({ ok: true, practicalSubmissions });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 });
  }
}
