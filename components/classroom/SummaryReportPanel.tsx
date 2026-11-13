'use client';

import { FileSpreadsheet, Star, Trophy, CheckCircle2 } from 'lucide-react';
import { ClassroomControlState, Student } from '@/lib/domain/types';
import { exportStudentsToExcel } from '@/lib/export-excel';

interface SummaryReportPanelProps {
  roomState: ClassroomControlState;
  classStudents: Student[];
  schoolName: string;
  teacherName: string;
}

export default function SummaryReportPanel({
  roomState,
  classStudents,
  schoolName,
  teacherName,
}: SummaryReportPanelProps) {
  const scoredMachines = roomState.machines.filter((m) => typeof m.totalScore === 'number');
  const avgScore =
    scoredMachines.length > 0
      ? (
          scoredMachines.reduce((acc, m) => acc + (m.totalScore || 0), 0) / scoredMachines.length
        ).toFixed(1)
      : '—';
  const totalStars = roomState.machines.reduce((acc, m) => acc + m.starsEarned, 0);
  const completedCount = roomState.machines.filter((m) => m.status === 'submitted').length;

  const ranked = [...roomState.machines]
    .filter((m) => m.student1Code)
    .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0) || b.starsEarned - a.starsEarned);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-500">Điểm Trung Bình Tiết Học</div>
          <div className="text-2xl font-extrabold font-mono text-blue-700 mt-1 tabular-nums">
            {avgScore} / 10
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Trên {scoredMachines.length} máy đã có điểm
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-500">Tổng Sao Thưởng Cấp Phát</div>
          <div className="text-2xl font-extrabold font-mono text-amber-600 mt-1 flex items-center gap-1.5 tabular-nums">
            <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
            <span>{totalStars}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Ghi nhận trực tiếp vào Bảng Vàng</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Trạm Máy Hoàn Thành Đủ</div>
            <div className="text-2xl font-extrabold font-mono text-emerald-700 mt-1 flex items-center gap-1.5 tabular-nums">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{completedCount} / 24</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              exportStudentsToExcel(
                classStudents,
                `Bao_Cao_Tiet_${roomState.activePeriod}_${roomState.activeClassName}.xls`,
                schoolName,
                teacherName
              )
            }
            className="mt-3 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất Danh Sách Excel</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-600" />
          <span>Bảng Xếp Hạng Thi Đua Trong Tiết · {roomState.activeClassName}</span>
        </h3>
        <div className="divide-y divide-slate-100">
          {ranked.slice(0, 12).map((m, idx) => (
            <div key={m.machineId} className="py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-slate-100 font-mono font-bold text-slate-700 flex items-center justify-center tabular-nums">
                  {idx + 1}
                </span>
                <span className="font-mono font-bold text-blue-700">{m.machineName}</span>
                <span className="font-bold text-slate-900 truncate">
                  {m.student1Name}
                  {m.student2Name ? ` & ${m.student2Name}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 font-mono">
                <span className="text-amber-600 font-bold tabular-nums">★ {m.starsEarned}</span>
                <span className="font-extrabold text-slate-900 tabular-nums">
                  {m.totalScore ?? '—'}đ
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
