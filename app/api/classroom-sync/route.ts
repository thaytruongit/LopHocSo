import { NextRequest, NextResponse } from 'next/server';
import {
  getAllServerTaughtPeriodsForTenant,
  getServerClassroomState,
  getServerTaughtPeriods,
  mutateServerAwardStar,
  mutateServerClassroomMachineScore,
  mutateServerHelpRequest,
  mutateServerResolveHelpRequest,
  setServerClassroomState,
  setServerTaughtPeriod,
} from '@/lib/server/realtime-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const tenantId = searchParams.get('tenantId') || 'mao-dien';
  const roomId = searchParams.get('roomId') || 'pm-1';
  const classId = searchParams.get('classId') || '';

  const state = getServerClassroomState(tenantId, roomId);
  const resolvedClassId = classId || state?.activeClassId || '';
  const taughtPeriods = resolvedClassId
    ? getServerTaughtPeriods(tenantId, resolvedClassId)
    : [];
  const taughtPeriodsByClass = getAllServerTaughtPeriodsForTenant(tenantId);

  return NextResponse.json(
    {
      state,
      taughtPeriods,
      taughtPeriodsByClass,
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
    const tenantId: string = body?.tenantId || 'mao-dien';
    const roomId: string = body?.roomId || 'pm-1';
    const action: string = body?.action || 'set_state';

    if (action === 'set_state' && body?.state) {
      const res = setServerClassroomState(
        tenantId,
        roomId,
        body.state,
        Boolean(body.markTaughtPeriod)
      );
      return NextResponse.json({
        ok: true,
        state: res.state,
        taughtPeriods: res.taughtPeriods,
      });
    }

    if (action === 'machine_score') {
      const state = mutateServerClassroomMachineScore({
        tenantId,
        roomId,
        machineId: Number(body.machineId),
        activity: body.activity,
        score: Number(body.score),
        practicalFileName: body.practicalFileName,
        comment: body.comment,
        fallbackState: body.fallbackState,
      });
      return NextResponse.json({ ok: true, state });
    }

    if (action === 'help_request' && body?.request) {
      const state = mutateServerHelpRequest({
        tenantId,
        roomId,
        request: body.request,
        fallbackState: body.fallbackState,
      });
      return NextResponse.json({ ok: true, state });
    }

    if (action === 'resolve_help' && body?.requestId) {
      const state = mutateServerResolveHelpRequest({
        tenantId,
        roomId,
        requestId: String(body.requestId),
      });
      return NextResponse.json({ ok: true, state });
    }

    if (action === 'award_star') {
      const state = mutateServerAwardStar({
        tenantId,
        roomId,
        machineId: Number(body.machineId),
        timeLabel: body.timeLabel,
      });
      return NextResponse.json({ ok: true, state });
    }

    if (action === 'set_taught_period') {
      const classId = String(body?.classId || '');
      const period = Number(body?.period || 0);
      if (!classId || period <= 0) {
        return NextResponse.json(
          { ok: false, error: 'Thiếu classId hoặc period hợp lệ' },
          { status: 400 }
        );
      }
      const taughtPeriods = setServerTaughtPeriod(
        tenantId,
        classId,
        period,
        typeof body.taught === 'boolean' ? body.taught : undefined
      );
      return NextResponse.json({ ok: true, classId, taughtPeriods });
    }

    return NextResponse.json({ ok: false, error: 'Unsupported action' }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 });
  }
}
