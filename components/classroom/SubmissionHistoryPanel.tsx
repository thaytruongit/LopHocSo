'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  FolderClock,
  Image as ImageIcon,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { getAssetUrl } from '@/lib/asset-path';
import { subscribeToSubmissionUpdates } from '@/lib/classroom-control';
import {
  getHomeworkSubmissions,
  getPracticalSubmissions,
} from '@/lib/domain/data-repository';
import { HomeworkSubmission, PracticalSubmission } from '@/lib/domain/types';

interface SubmissionHistoryPanelProps {
  tenantId: string;
  roomId: string;
  classId: string;
  className: string;
}

type UnifiedSubmissionItem = {
  id: string;
  kind: 'practical' | 'homework';
  studentCode: string;
  studentName: string;
  classId: string;
  className: string;
  period: number;
  title: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  submittedAt: string;
  sortTs: number;
  submissionCode?: string;
  fileDataUrl?: string;
  externalUrl?: string;
  note?: string;
  status: 'submitted' | 'graded';
  score?: number;
};

export default function SubmissionHistoryPanel({
  tenantId,
  roomId,
  classId,
  className,
}: SubmissionHistoryPanelProps) {
  const [items, setItems] = useState<UnifiedSubmissionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
  const [scope, setScope] = useState<'class' | 'all'>('class');
  const [kindFilter, setKindFilter] = useState<'all' | 'practical' | 'homework'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewItem, setPreviewItem] = useState<UnifiedSubmissionItem | null>(null);

  const mapUnified = (
    practicals: PracticalSubmission[],
    homeworks: HomeworkSubmission[]
  ): UnifiedSubmissionItem[] => {
    const mappedPractical: UnifiedSubmissionItem[] = practicals.map((p) => ({
      id: p.id,
      kind: 'practical',
      studentCode: p.studentCode,
      studentName: p.studentName,
      classId: p.classId,
      className: p.className,
      period: p.period,
      title: p.assignmentTitle,
      fileName: p.fileName,
      fileSize: p.fileSize,
      fileType: p.fileType || p.fileName.split('.').pop() || 'file',
      submittedAt: p.submittedAt,
      sortTs: p.submittedTimestamp || (Number(p.id.replace(/\D/g, '')) || 0),
      submissionCode: p.submissionCode,
      fileDataUrl: p.fileDataUrl,
      externalUrl: p.fileUrl,
      status: p.status,
      score: p.score,
    }));

    const mappedHomework: UnifiedSubmissionItem[] = homeworks.map((h) => ({
      id: h.id,
      kind: 'homework',
      studentCode: h.studentCode,
      studentName: h.studentName,
      classId: h.classId,
      className: h.className,
      period: h.period,
      title: h.homeworkTitle,
      fileName: h.fileName,
      fileSize: h.fileSize,
      fileType: h.fileType,
      submittedAt: h.submittedAt,
      sortTs: Number(h.id.replace(/\D/g, '')) || 0,
      fileDataUrl: h.fileDataUrl,
      externalUrl: h.driveUrl,
      note: h.note,
      status: h.status,
      score: h.score,
    }));

    return [...mappedPractical, ...mappedHomework].sort((a, b) => b.sortTs - a.sortTs);
  };

  const loadAllSubmissions = useCallback(async () => {
    try {
      // Fast path: fetch directly from shared server API first so UI never waits on IndexedDB seeding
      try {
        const qs = new URLSearchParams({ tenantId });
        const res = await fetch(`${getAssetUrl('/api/submissions/')}?${qs.toString()}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          const serverCombined = mapUnified(
            Array.isArray(data?.practicalSubmissions) ? data.practicalSubmissions : [],
            Array.isArray(data?.homeworkSubmissions) ? data.homeworkSubmissions : []
          );
          if (serverCombined.length > 0) {
            setItems(serverCombined);
            setLoading(false);
          }
        }
      } catch {
        // Ignore network transient
      }

      const [practicals, homeworks] = await Promise.all([
        getPracticalSubmissions(tenantId),
        getHomeworkSubmissions(tenantId),
      ]);
      setItems(mapUnified(practicals, homeworks));
      setLastSyncedAt(
        new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadAllSubmissions();
    const unsubSse = subscribeToSubmissionUpdates(tenantId, roomId, loadAllSubmissions);
    const pollId = setInterval(() => {
      loadAllSubmissions();
    }, 2000);

    return () => {
      clearInterval(pollId);
      unsubSse();
    };
  }, [tenantId, roomId, loadAllSubmissions]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (scope === 'class') {
        const matchClass =
          item.classId === classId ||
          item.className.replace(/^Lớp\s+/i, '').toLowerCase() ===
            className.replace(/^Lớp\s+/i, '').toLowerCase();
        if (!matchClass) return false;
      }
      if (kindFilter !== 'all' && item.kind !== kindFilter) return false;
      if (q) {
        const hay = `${item.studentName} ${item.studentCode} ${item.fileName} ${item.title} ${item.submissionCode || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, scope, classId, className, kindFilter, searchQuery]);

  const practicalCount = useMemo(
    () => filteredItems.filter((i) => i.kind === 'practical').length,
    [filteredItems]
  );

  const renderFileIcon = (fileName: string, fileType: string) => {
    const lower = `${fileName} ${fileType}`.toLowerCase();
    if (lower.includes('image') || /\.(png|jpg|jpeg|webp|gif)/.test(lower)) {
      return <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />;
    }
    if (lower.includes('xls') || lower.includes('sheet')) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-purple-600 shrink-0" />;
  };

  return (
    <div className="space-y-4">
      {/* HEADER BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <FolderClock className="w-4 h-4 text-blue-700" />
              <span>Lịch Sử Nộp Bài Thời Gian Thực ({filteredItems.length})</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
              Thực hành tại lớp: {practicalCount}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tự động cập nhật ngay khi học sinh tải tệp từ máy trạm phòng thực hành hoặc cổng BTVN
            {lastSyncedAt ? ` · Đồng bộ lúc ${lastSyncedAt}` : ''}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl font-bold">
            <button
              type="button"
              onClick={() => setScope('class')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                scope === 'class' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Chỉ {className}
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                scope === 'all' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Toàn trường
            </button>
          </div>

          <button
            type="button"
            onClick={loadAllSubmissions}
            className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: 'all', label: 'Tất cả bài nộp' },
              { id: 'practical', label: 'File Thực Hành Tại Lớp' },
              { id: 'homework', label: 'Bài Tập Về Nhà' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setKindFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                kindFilter === f.id
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm học sinh, tên file, mã máy..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs"
          />
        </div>
      </div>

      {/* SUBMISSIONS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500 font-semibold">
            Đang đồng bộ danh sách bài đã nộp...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            Chưa có tệp nào được học sinh nộp trong bộ lọc hiện tại. Khi học sinh nhấn nộp bài thực hành hoặc BTVN, tệp sẽ xuất hiện tại đây ngay lập tức.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center w-12">STT</th>
                  <th className="py-3 px-3">Thời Gian</th>
                  <th className="py-3 px-3">Học Sinh / Máy</th>
                  <th className="py-3 px-3">Lớp · Tiết</th>
                  <th className="py-3 px-4">Tên Tệp Đã Nộp</th>
                  <th className="py-3 px-3">Phân Loại</th>
                  <th className="py-3 px-3 text-right">Xem / Tải</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 text-center font-mono text-slate-500 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {item.submittedAt}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{item.studentName}</div>
                      <div className="text-[11px] font-mono text-blue-700">
                        {item.submissionCode ? `${item.submissionCode} · ` : ''}
                        {item.studentCode}
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{item.className}</div>
                      <div className="text-[11px] text-slate-500">Tiết {item.period}</div>
                    </td>
                    <td className="py-3 px-4 max-w-[260px]">
                      <div className="flex items-center gap-2">
                        {renderFileIcon(item.fileName, item.fileType)}
                        <div className="min-w-0">
                          <div className="font-mono font-bold text-slate-900 truncate">
                            {item.fileName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {item.fileSize} · {item.title}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          item.kind === 'practical'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {item.kind === 'practical' ? 'Thực hành lớp' : 'BTVN'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {item.fileDataUrl && (
                          <a
                            href={item.fileDataUrl}
                            download={item.fileName}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] inline-flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Tải về</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Chi tiết</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PREVIEW MODAL */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold text-blue-300">
                  {previewItem.studentName} · {previewItem.className} · Tiết {previewItem.period}
                </div>
                <div className="text-sm font-extrabold truncate">{previewItem.fileName}</div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-auto bg-slate-50 space-y-4 text-xs">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1.5">
                <div>
                  <strong>Nhiệm vụ:</strong> {previewItem.title}
                </div>
                <div>
                  <strong>Thời gian nộp:</strong> {previewItem.submittedAt}
                </div>
                <div>
                  <strong>Dung lượng:</strong> {previewItem.fileSize}
                </div>
                {previewItem.note && (
                  <div>
                    <strong>Ghi chú của học sinh:</strong> {previewItem.note}
                  </div>
                )}
              </div>

              {previewItem.fileDataUrl && previewItem.fileDataUrl.startsWith('data:image/') && (
                <div className="bg-white rounded-2xl border border-slate-200 p-3 flex justify-center">
                  <img
                    src={previewItem.fileDataUrl}
                    alt={previewItem.fileName}
                    className="max-h-[50vh] rounded-xl"
                  />
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                {previewItem.fileDataUrl && (
                  <a
                    href={previewItem.fileDataUrl}
                    download={previewItem.fileName}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải tệp ({previewItem.fileName})</span>
                  </a>
                )}
                {previewItem.externalUrl && !previewItem.externalUrl.startsWith('#') && (
                  <a
                    href={previewItem.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Mở liên kết Drive</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
