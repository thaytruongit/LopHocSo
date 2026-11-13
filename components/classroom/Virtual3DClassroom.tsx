'use client';

import { useState } from 'react';
import {
  Monitor,
  Star,
  HelpCircle,
  CheckCircle2,
  Award,
  MonitorPlay,
  X,
} from 'lucide-react';
import { LabMachineState } from '@/lib/domain/types';
import { ZIGZAG_CLASSROOM_ROWS } from '@/lib/domain/classroom-engine';

interface Virtual3DClassroomProps {
  machines: LabMachineState[];
  className: string;
  onAwardStar: (machineId: number) => void;
  onSpotlight: (machine: LabMachineState) => void;
  onResolveHelpByMachine?: (machineId: number) => void;
}

export default function Virtual3DClassroom({
  machines,
  className,
  onAwardStar,
  onSpotlight,
  onResolveHelpByMachine,
}: Virtual3DClassroomProps) {
  const [selectedMachine, setSelectedMachine] = useState<LabMachineState | null>(null);

  const machineMap = new Map<number, LabMachineState>();
  for (const m of machines) machineMap.set(m.machineId, m);

  return (
    <div className="space-y-5">
      <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-blue-300 font-bold uppercase tracking-wider">
              Sơ đồ 24 trạm máy chữ Z · {className}
            </div>
            <div className="text-sm font-extrabold">
              Bục Giảng Giáo Viên (Phía Trước Phòng Máy)
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Đã nộp đủ
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            Đang hoạt động
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            Cần hỗ trợ
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {ZIGZAG_CLASSROOM_ROWS.map((row) => (
          <div key={row.rowNum} className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
              Dãy bàn số {row.rowNum}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {row.machineIds.map((mId) => {
                const m = machineMap.get(mId);
                if (!m) return null;

                const statusStyles = m.hasHelpRequest
                  ? 'border-rose-400 bg-rose-50/70'
                  : m.status === 'submitted'
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : m.student1Code
                  ? 'border-slate-200 bg-white hover:border-blue-400'
                  : 'border-dashed border-slate-200 bg-slate-50/60';

                return (
                  <div
                    key={mId}
                    onClick={() => setSelectedMachine(m)}
                    className={`rounded-2xl border p-3.5 cursor-pointer transition-all space-y-2.5 ${statusStyles}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-extrabold text-slate-900 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 tabular-nums">
                        {m.machineName}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {m.hasHelpRequest && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1">
                            <HelpCircle className="w-3 h-3" />
                            <span>Hỏi</span>
                          </span>
                        )}
                        {m.starsEarned > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-0.5 tabular-nums">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            <span>{m.starsEarned}</span>
                          </span>
                        )}
                        {typeof m.totalScore === 'number' && (
                          <span className="font-mono text-xs font-extrabold text-emerald-700 tabular-nums">
                            {m.totalScore}đ
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs space-y-0.5 min-h-[34px]">
                      <div className="font-bold text-slate-900 truncate">{m.student1Name}</div>
                      {m.student2Name && (
                        <div className="text-[11px] text-slate-600 truncate">
                          &amp; {m.student2Name}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                        <span>Tiến độ tiết học</span>
                        <span className="font-mono tabular-nums">{m.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            m.status === 'submitted' ? 'bg-emerald-600' : 'bg-blue-600'
                          }`}
                          style={{ width: `${m.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAwardStar(m.machineId);
                        }}
                        className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold flex items-center gap-1"
                      >
                        <Star className="w-3 h-3 text-amber-600" />
                        <span>+1 Sao</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSpotlight(m);
                        }}
                        className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold flex items-center gap-1"
                      >
                        <MonitorPlay className="w-3 h-3" />
                        <span>Chiếu gương</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedMachine && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedMachine(null)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-mono font-bold text-blue-700 uppercase">
                  {selectedMachine.machineName} · {className}
                </span>
                <h4 className="font-extrabold text-base text-slate-900 mt-0.5">
                  {selectedMachine.student1Name}
                  {selectedMachine.student2Name ? ` & ${selectedMachine.student2Name}` : ''}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMachine(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 font-semibold">HĐ1 Khám phá</div>
                <div className="font-mono font-extrabold text-slate-900 text-sm mt-0.5 tabular-nums">
                  {selectedMachine.scoreH1 ?? '—'}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 font-semibold">HĐ2 Luyện tập</div>
                <div className="font-mono font-extrabold text-slate-900 text-sm mt-0.5 tabular-nums">
                  {selectedMachine.scoreH2 ?? '—'}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 font-semibold">HĐ3 Thực hành</div>
                <div className="font-mono font-extrabold text-slate-900 text-sm mt-0.5 tabular-nums">
                  {selectedMachine.scoreH3 ?? '—'}
                </div>
              </div>
            </div>

            {selectedMachine.practicalFileName && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="truncate font-semibold">
                  Tệp thực hành: {selectedMachine.practicalFileName}
                </span>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              {selectedMachine.hasHelpRequest && onResolveHelpByMachine && (
                <button
                  type="button"
                  onClick={() => {
                    onResolveHelpByMachine(selectedMachine.machineId);
                    setSelectedMachine(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  Đánh dấu đã hỗ trợ
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onAwardStar(selectedMachine.machineId);
                  setSelectedMachine(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Thưởng +1 Sao</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSpotlight(selectedMachine);
                  setSelectedMachine(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold"
              >
                Chiếu gương cả lớp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
