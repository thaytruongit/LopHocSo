'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileText,
  Sparkles,
  Laptop,
  ArrowRight,
  AlertCircle,
  X,
} from 'lucide-react';
import { CurriculumPeriod } from '@/lib/domain/types';

interface CurriculumPeriodModalProps {
  period: CurriculumPeriod | null;
  onClose: () => void;
  activeFocusSection?: 'worksheet' | 'reinforcement' | 'practice' | 'all';
}

export default function CurriculumPeriodModal({
  period,
  onClose,
  activeFocusSection = 'all',
}: CurriculumPeriodModalProps) {
  if (!period) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">
              Khối {period.grade} · Tiết {period.period} · {period.topic}
            </div>
            <h3 className="text-lg font-extrabold mt-0.5 text-white">{period.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-1">
            <span className="font-bold text-blue-900 uppercase text-[11px]">Mục tiêu bài học:</span>
            <p className="text-slate-700 leading-relaxed font-medium">
              {period.contentDesc || 'Nắm vững kiến thức trọng tâm và thực hành trên máy tính.'}
            </p>
            {period.digitalCompetency && (
              <p className="text-[11px] text-blue-800 pt-1">
                <strong>Năng lực số:</strong> {period.digitalCompetency}
              </p>
            )}
          </div>

          <div className={`space-y-3 rounded-2xl ${activeFocusSection === 'worksheet' ? 'ring-2 ring-blue-500 p-3 bg-blue-50/20' : ''}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>1. Phiếu học tập điện tử (Khám phá cặp đôi)</span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  Thời lượng: {period.worksheet.timeLimitMin || 10} phút · Thưởng: +{period.worksheet.xpReward || 50} XP
                </span>
              </div>
              <Link
                href={`/in-class?grade=${period.grade}&period=${period.period}&tab=worksheet`}
                className="px-3.5 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 shrink-0"
              >
                <span>Mở phiếu cặp đôi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900">Tình huống khởi động:</span>
              <p className="text-slate-700 leading-relaxed">
                {period.worksheet.phase1_khoi_dong || period.worksheet.phase2_kham_pha}
              </p>
            </div>

            {period.worksheet.fillBlanks && period.worksheet.fillBlanks.length > 0 && (
              <div className="space-y-1.5">
                {period.worksheet.fillBlanks.map((fb, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-slate-800 font-medium">
                      <strong>Câu {idx + 1}:</strong> {fb.statement}
                    </p>
                    <p className="text-emerald-700 font-semibold text-[11px]">
                      Đáp án SGK: {fb.correctAnswer}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`space-y-3 rounded-2xl ${activeFocusSection === 'reinforcement' ? 'ring-2 ring-amber-500 p-3 bg-amber-50/20' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>2. Củng cố 7 câu ({period.reinforcement.matrix || '3 Biết - 2 Hiểu - 2 Vận dụng'})</span>
              </h4>
              <Link
                href={`/in-class?grade=${period.grade}&period=${period.period}&tab=reinforcement`}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0"
              >
                <span>Luyện tập 7 câu</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {period.reinforcement.questions.map((q, qIdx) => (
                <div key={q.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">
                      Câu {qIdx + 1}: {q.question}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 shrink-0">
                      {q.level}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold">
                    Đáp án đúng: {q.options[q.correctIndex]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`space-y-3 rounded-2xl ${activeFocusSection === 'practice' ? 'ring-2 ring-purple-500 p-3 bg-purple-50/20' : ''}`}>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-purple-600" />
                <span>3. Thực hành phòng máy &amp; Rubric 10 điểm</span>
              </h4>
              {period.isPractice && period.practicalTask && (
                <Link
                  href={`/in-class?grade=${period.grade}&period=${period.period}&tab=practice`}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <span>Mở khu vực Thực hành</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {period.isPractice && period.practicalTask ? (
              <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 space-y-3">
                <p className="font-bold text-purple-950 text-sm">{period.practicalTask.title}</p>
                <div className="space-y-1 bg-white p-3 rounded-xl border border-purple-100">
                  {period.practicalTask.steps.map((st, sIdx) => (
                    <div key={sIdx} className="text-slate-700 text-xs flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {sIdx + 1}
                      </span>
                      <span>{st}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-slate-600 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <p>
                  Tiết Lý thuyết &amp; Khám phá: trọng tâm vào Phiếu học tập cặp đôi và 7 câu củng cố.
                </p>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 uppercase text-[11px]">
              4. Nhiệm vụ Bài tập về nhà:
            </span>
            <p className="text-slate-700">{period.homework.description}</p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">Hệ sinh thái học tập số Tin học THCS</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
