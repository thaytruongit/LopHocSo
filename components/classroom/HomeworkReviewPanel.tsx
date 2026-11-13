'use client';

import { useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Eye,
  FileText,
  Image as ImageIcon,
  RotateCw,
  ZoomIn,
  ZoomOut,
  X,
  ExternalLink,
} from 'lucide-react';
import { HomeworkSubmission } from '@/lib/domain/types';
import {
  getHomeworkSubmissions,
  saveHomeworkSubmission,
} from '@/lib/domain/data-repository';

interface HomeworkReviewPanelProps {
  tenantId: string;
  classId: string;
  className: string;
  onNotice: (msg: string) => void;
}

export default function HomeworkReviewPanel({
  tenantId,
  classId,
  className,
  onNotice,
}: HomeworkReviewPanelProps) {
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [filterScope, setFilterScope] = useState<'class' | 'all'>('class');
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [evalMode, setEvalMode] = useState<'tt22' | 'score'>('tt22');
  const [tt22Rank, setTt22Rank] = useState<'Đạt' | 'Chưa đạt'>('Đạt');
  const [scoreInput, setScoreInput] = useState<string>('9.5');
  const [feedbackInput, setFeedbackInput] = useState<string>(
    'Bài làm tốt, trình bày rõ ràng và đúng yêu cầu.'
  );

  const [previewSub, setPreviewSub] = useState<HomeworkSubmission | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  useEffect(() => {
    getHomeworkSubmissions(tenantId).then(setSubmissions).catch(() => {});
  }, [tenantId]);

  const displayed = submissions.filter((s) =>
    filterScope === 'all' ? true : s.classId === classId || s.className === className
  );

  const handleSaveGrade = async (sub: HomeworkSubmission) => {
    const score =
      evalMode === 'tt22'
        ? tt22Rank === 'Đạt'
          ? 9.5
          : 4.5
        : Math.max(0, Math.min(10, parseFloat(scoreInput) || 8));

    const updated: HomeworkSubmission = {
      ...sub,
      score,
      tt22Rank: evalMode === 'tt22' ? tt22Rank : score >= 5 ? 'Đạt' : 'Chưa đạt',
      feedback: feedbackInput.trim(),
      status: 'graded',
    };

    await saveHomeworkSubmission(updated);
    setSubmissions((prev) => prev.map((p) => (p.id === sub.id ? updated : p)));
    setGradingId(null);
    onNotice(`Đã lưu chấm BTVN cho ${sub.studentName} (${updated.tt22Rank} · ${score}đ).`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-700" />
            <span>Bài Tập Về Nhà Đã Nộp ({displayed.length})</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Chấm ảnh vở chụp (đã nén WebP), tệp Excel/Word hoặc bài gõ trực tiếp theo chuẩn Thông tư 22.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setFilterScope('class')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterScope === 'class' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Chỉ {className}
          </button>
          <button
            type="button"
            onClick={() => setFilterScope('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterScope === 'all' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Toàn trường
          </button>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-500">
          Chưa có bài tập về nhà nào trong bộ lọc hiện tại. Học sinh có thể nộp bài tại mục BTVN.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayed.map((sub) => {
            const isGrading = gradingId === sub.id;
            return (
              <div
                key={sub.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-500">
                      {sub.className} · Khối {sub.grade} · {sub.submittedAt}
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900 truncate">
                      {sub.studentName}{' '}
                      <span className="font-mono text-xs text-blue-700">({sub.studentCode})</span>
                    </h4>
                    <div className="text-xs font-semibold text-slate-700 mt-0.5 truncate">
                      {sub.homeworkTitle}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                      sub.status === 'graded'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {sub.status === 'graded'
                      ? `${sub.tt22Rank || 'Đạt'} · ${sub.score ?? 9}đ`
                      : 'Chờ chấm'}
                  </span>
                </div>

                {sub.note && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    &ldquo;{sub.note}&rdquo;
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 text-xs pt-1">
                  <div className="flex items-center gap-2 min-w-0 text-slate-600">
                    {sub.fileType === 'image' ? (
                      <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <span className="truncate font-mono text-[11px]">
                      {sub.fileName} ({sub.fileSize})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewSub(sub);
                        setZoom(1);
                        setRotation(0);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem bài</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGradingId(isGrading ? null : sub.id);
                        setScoreInput(String(sub.score ?? 9.5));
                        setFeedbackInput(
                          sub.feedback || 'Bài làm tốt, trình bày rõ ràng và đúng yêu cầu.'
                        );
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-[11px]"
                    >
                      {isGrading ? 'Đóng' : 'Chấm điểm'}
                    </button>
                  </div>
                </div>

                {sub.feedback && !isGrading && (
                  <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{sub.feedback}</span>
                  </div>
                )}

                {isGrading && (
                  <div className="pt-3 border-t border-slate-100 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEvalMode('tt22')}
                        className={`px-2.5 py-1 rounded-lg font-bold ${
                          evalMode === 'tt22'
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Đạt / Chưa đạt (TT22)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEvalMode('score')}
                        className={`px-2.5 py-1 rounded-lg font-bold ${
                          evalMode === 'score'
                            ? 'bg-blue-700 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Thang điểm 10
                      </button>
                    </div>

                    {evalMode === 'tt22' ? (
                      <div className="flex gap-2">
                        {(['Đạt', 'Chưa đạt'] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setTt22Rank(r)}
                            className={`px-3 py-1.5 rounded-lg font-bold border ${
                              tt22Rank === r
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="10"
                        value={scoreInput}
                        onChange={(e) => setScoreInput(e.target.value)}
                        className="w-28 px-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold"
                      />
                    )}

                    <textarea
                      rows={2}
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                      placeholder="Lời nhận xét của giáo viên..."
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSaveGrade(sub)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                      >
                        Lưu đánh giá
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {previewSub && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewSub(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold text-blue-300">{previewSub.studentName}</div>
                <div className="text-sm font-extrabold truncate">{previewSub.fileName}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(2.4, z + 0.2))}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20"
                  title="Phóng to"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20"
                  title="Xoay ảnh"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSub(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100 p-6 flex items-center justify-center min-h-[300px]">
              {previewSub.fileDataUrl ? (
                <img
                  src={previewSub.fileDataUrl}
                  alt={previewSub.fileName}
                  style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                  className="max-h-[65vh] rounded-xl shadow-md transition-transform"
                />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md text-center space-y-3">
                  <FileText className="w-10 h-10 text-blue-600 mx-auto" />
                  <div className="text-sm font-bold text-slate-900">{previewSub.fileName}</div>
                  <p className="text-xs text-slate-600">{previewSub.note || 'Bài nộp đã lưu trong kho bài tập lớp học.'}</p>
                  {previewSub.driveUrl && (
                    <a
                      href={previewSub.driveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mở tệp trên Google Drive</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
