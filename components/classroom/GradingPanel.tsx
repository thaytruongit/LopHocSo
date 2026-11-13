'use client';

import { useState } from 'react';
import { Award, CheckCircle2, FileCheck2 } from 'lucide-react';
import { ClassroomActivityKey, LabMachineState } from '@/lib/domain/types';

interface GradingPanelProps {
  machines: LabMachineState[];
  isPracticalPeriod: boolean;
  onScoreMachine: (
    machineId: number,
    activity: ClassroomActivityKey,
    score: number,
    comment?: string
  ) => void;
}

export default function GradingPanel({
  machines,
  isPracticalPeriod,
  onScoreMachine,
}: GradingPanelProps) {
  const [editingMachine, setEditingMachine] = useState<number | null>(null);
  const [activity, setActivity] = useState<ClassroomActivityKey>(
    isPracticalPeriod ? 'lab' : 'discovery'
  );
  const [score, setScore] = useState<string>('9');
  const [comment, setComment] = useState<string>('Thao tác chuẩn xác, hoàn thành đúng thời gian.');

  const activeMachines = machines.filter((m) => Boolean(m.student1Code));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-700" />
            <span>Bảng Chấm Điểm Quá Trình Tại Phòng Máy</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cập nhật điểm trực tiếp từng trạm máy cho HĐ1 (Khám phá), HĐ2 (7 câu) và HĐ3 (Thực hành).
          </p>
        </div>
        <span className="text-xs font-bold text-slate-600 font-mono tabular-nums">
          {activeMachines.length} / {machines.length} máy có học sinh
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Trạm Máy</th>
              <th className="py-3 px-4">Cặp Đôi Học Sinh</th>
              <th className="py-3 px-3 text-center">HĐ1</th>
              <th className="py-3 px-3 text-center">HĐ2</th>
              <th className="py-3 px-3 text-center">HĐ3</th>
              <th className="py-3 px-3 text-center">Tổng</th>
              <th className="py-3 px-4">Sản Phẩm Thực Hành</th>
              <th className="py-3 px-4 text-right">Chấm Điểm</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {machines.map((m) => (
              <tr key={m.machineId} className="hover:bg-slate-50/80">
                <td className="py-3 px-4 font-mono font-bold text-slate-900 tabular-nums">
                  {m.machineName}
                </td>
                <td className="py-3 px-4">
                  <div className="font-bold text-slate-900">{m.student1Name}</div>
                  {m.student2Name && (
                    <div className="text-[11px] text-slate-500">&amp; {m.student2Name}</div>
                  )}
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold tabular-nums">
                  {m.scoreH1 ?? '—'}
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold tabular-nums">
                  {m.scoreH2 ?? '—'}
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold tabular-nums">
                  {m.scoreH3 ?? '—'}
                </td>
                <td className="py-3 px-3 text-center font-mono font-extrabold text-blue-700 tabular-nums">
                  {m.totalScore ?? '—'}
                </td>
                <td className="py-3 px-4">
                  {m.practicalFileName ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[160px]">{m.practicalFileName}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">Chưa nộp tệp</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  {editingMachine === m.machineId ? (
                    <div className="inline-flex items-center gap-1.5">
                      <select
                        value={activity}
                        onChange={(e) => setActivity(e.target.value as ClassroomActivityKey)}
                        className="px-2 py-1 rounded-lg border border-slate-300 text-[11px]"
                      >
                        <option value="discovery">HĐ1</option>
                        <option value="practice">HĐ2</option>
                        <option value="lab">HĐ3</option>
                      </select>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="10"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        className="w-16 px-2 py-1 rounded-lg border border-slate-300 font-mono font-bold text-center"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          onScoreMachine(m.machineId, activity, parseFloat(score) || 0, comment);
                          setEditingMachine(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Lưu</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMachine(m.machineId);
                        setComment(m.comment || 'Hoàn thành tốt nhiệm vụ tiết học.');
                      }}
                      className="px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-[11px]"
                    >
                      Nhập điểm
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
