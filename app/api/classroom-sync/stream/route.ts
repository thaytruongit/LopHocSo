import { NextRequest } from 'next/server';
import {
  getServerClassroomState,
  getServerTaughtPeriods,
  RealtimeEvent,
  subscribeRealtimeEvents,
} from '@/lib/server/realtime-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const tenantId = searchParams.get('tenantId') || 'mao-dien';
  const roomId = searchParams.get('roomId') || 'pm-1';
  const classId = searchParams.get('classId') || '';

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const sendEvent = (eventName: string, data: unknown) => {
        if (closed) return;
        try {
          const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          closed = true;
        }
      };

      const initialState = getServerClassroomState(tenantId, roomId);
      const targetClassId = classId || initialState?.activeClassId || '';
      const initialTaught = targetClassId
        ? getServerTaughtPeriods(tenantId, targetClassId)
        : [];

      if (initialState) {
        sendEvent('classroom_state', {
          type: 'classroom_state',
          tenantId,
          roomId,
          state: initialState,
          taughtPeriods: initialTaught,
        });
      } else if (targetClassId) {
        sendEvent('taught_periods', {
          type: 'taught_periods',
          tenantId,
          classId: targetClassId,
          taughtPeriods: initialTaught,
        });
      }

      const unsubscribe = subscribeRealtimeEvents(tenantId, (ev: RealtimeEvent) => {
        if (ev.type === 'classroom_state' && ev.roomId !== roomId) return;
        sendEvent(ev.type, ev);
      });

      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          closed = true;
        }
      }, 15000);

      const onAbort = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      };

      req.signal.addEventListener('abort', onAbort);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
