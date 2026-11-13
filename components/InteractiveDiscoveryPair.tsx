'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Check,
  Users,
} from 'lucide-react';
import { CurriculumPeriod } from '@/lib/domain/types';
import { gradePairWorksheet } from '@/lib/domain/classroom-engine';

interface InteractiveDiscoveryPairProps {
  currentPeriod: CurriculumPeriod;
  student1Name: string;
  student2Name?: string;
  isLocked: boolean;
  onComplete: (score: number) => void;
}

export default function InteractiveDiscoveryPair({
  currentPeriod,
  student1Name,
  student2Name,
  isLocked,
  onComplete,
}: InteractiveDiscoveryPairProps) {
  const ws = currentPeriod.worksheet;
  const dragDrop = ws?.dragDrop;
  const fillBlanks = ws?.fillBlanks;
  const matchingPairs = ws?.matchingPairs;
  const wordBank = ws?.wordBank;

  const [bucketAssignments, setBucketAssignments] = useState<Record<string, string>>({});
  const [dropdownAnswers, setDropdownAnswers] = useState<Record<number, string>>({});
  const [selectedMatchingLeft, setSelectedMatchingLeft] = useState<string | null>(null);
  const [matchingConnections, setMatchingConnections] = useState<Record<string, string>>({});

  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [resultScore, setResultScore] = useState<number>(0);
  const [feedbackList, setFeedbackList] = useState<string[]>([]);
  const [currentRoleTurn, setCurrentRoleTurn] = useState<'A' | 'B'>('A');

  const handleAssignBucket = (itemText: string, bucketName: string) => {
    if (isSubmitted || isLocked) return;
    setBucketAssignments((prev) => ({
      ...prev,
      [itemText]: bucketName,
    }));
  };

  const handleSelectDropdown = (idx: number, answer: string) => {
    if (isSubmitted || isLocked) return;
    setDropdownAnswers((prev) => ({
      ...prev,
      [idx]: answer,
    }));
  };

  const handleSelectLeft = (leftItem: string) => {
    if (isSubmitted || isLocked) return;
    setSelectedMatchingLeft(leftItem);
  };

  const handleConnectRight = (rightItem: string) => {
    if (isSubmitted || isLocked || !selectedMatchingLeft) return;
    setMatchingConnections((prev) => ({
      ...prev,
      [selectedMatchingLeft]: rightItem,
    }));
    setSelectedMatchingLeft(null);
  };

  const handleSubmitWorksheet = () => {
    const graded = gradePairWorksheet(currentPeriod, {
      bucketAssignments,
      dropdownAnswers,
      matchingConnections,
    });
    setResultScore(graded.score);
    setFeedbackList(graded.feedback);
    setIsSubmitted(true);
    onComplete(graded.score);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-blue-300 uppercase tracking-wider">
              Khối {currentPeriod.grade} · Tiết {currentPeriod.period} · Hoạt động 1 (Khám phá cặp đôi)
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              {ws.title || `Khám phá kiến thức Tiết ${currentPeriod.period}: ${currentPeriod.title}`}
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              {currentPeriod.contentDesc} · Phần thưởng: +{ws.xpReward || 50} XP
            </p>
          </div>

          <div className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700 shrink-0 text-xs space-y-2 min-w-[260px]">
            <div className="font-bold flex items-center justify-between gap-3 text-slate-200">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Phân vai cặp đôi</span>
              </span>
              <button
                type="button"
                onClick={() => setCurrentRoleTurn((prev) => (prev === 'A' ? 'B' : 'A'))}
                className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold text-[11px] flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Đổi vai</span>
              </button>
            </div>
            <div className="space-y-1 text-[11px]">
              <div
                className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                  currentRoleTurn === 'A' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-300'
                }`}
              >
                <span>Kỹ thuật viên (Thao tác):</span>
                <strong>{student1Name}</strong>
              </div>
              <div
                className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                  currentRoleTurn === 'B' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-300'
                }`}
              >
                <span>Thư ký (Đối soát SGK):</span>
                <strong>{student2Name || 'Học cá nhân'}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {dragDrop && dragDrop.items && dragDrop.items.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span>Phân loại khái niệm vào 2 nhóm</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">Chọn nhóm cho từng thẻ bên dưới</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3 min-h-[120px]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-blue-900 uppercase tracking-wider">
                  {dragDrop.bucketA}
                </span>
                <span className="font-mono text-[11px] font-bold text-blue-700">
                  {Object.values(bucketAssignments).filter((b) => b === dragDrop.bucketA).length} mục
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {dragDrop.items
                  .filter((item) => bucketAssignments[item.text] === dragDrop.bucketA)
                  .map((item) => (
                    <span
                      key={item.text}
                      className="px-3 py-1.5 rounded-lg bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5"
                    >
                      <span>{item.text}</span>
                      {!isSubmitted && !isLocked && (
                        <button
                          type="button"
                          onClick={() => handleAssignBucket(item.text, '')}
                          className="hover:text-amber-200 font-bold ml-1"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3 min-h-[120px]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-900 uppercase tracking-wider">
                  {dragDrop.bucketB}
                </span>
                <span className="font-mono text-[11px] font-bold text-emerald-700">
                  {Object.values(bucketAssignments).filter((b) => b === dragDrop.bucketB).length} mục
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {dragDrop.items
                  .filter((item) => bucketAssignments[item.text] === dragDrop.bucketB)
                  .map((item) => (
                    <span
                      key={item.text}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5"
                    >
                      <span>{item.text}</span>
                      {!isSubmitted && !isLocked && (
                        <button
                          type="button"
                          onClick={() => handleAssignBucket(item.text, '')}
                          className="hover:text-amber-200 font-bold ml-1"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          {!isSubmitted && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
              {dragDrop.items
                .filter((item) => !bucketAssignments[item.text])
                .map((item) => (
                  <div
                    key={item.text}
                    className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-2"
                  >
                    <span>{item.text}</span>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleAssignBucket(item.text, dragDrop.bucketA)}
                      className="px-2 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 text-[11px] font-bold"
                    >
                      → Nhóm A
                    </button>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleAssignBucket(item.text, dragDrop.bucketB)}
                      className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold"
                    >
                      → Nhóm B
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {fillBlanks && fillBlanks.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-700 text-white flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span>Hoàn thiện định nghĩa cốt lõi SGK</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">Chọn từ thích hợp</span>
          </div>

          <div className="space-y-3">
            {fillBlanks.map((fb, idx) => {
              const parts = fb.statement.split('[___]');
              const currentChoice = dropdownAnswers[idx] || '';

              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed"
                >
                  <span className="font-bold text-blue-700 mr-1.5">{idx + 1}.</span>
                  <span>{parts[0]}</span>
                  <select
                    disabled={isSubmitted || isLocked}
                    value={currentChoice}
                    onChange={(e) => handleSelectDropdown(idx, e.target.value)}
                    className={`mx-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${
                      isSubmitted
                        ? currentChoice === fb.correctAnswer
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                          : 'bg-rose-50 border-rose-400 text-rose-800'
                        : 'bg-white border-blue-400 text-slate-900'
                    }`}
                  >
                    <option value="">-- Chọn đáp án --</option>
                    {(wordBank || [fb.correctAnswer, 'Khác']).map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                  <span>{parts[1] || ''}</span>

                  {isSubmitted && currentChoice !== fb.correctAnswer && (
                    <div className="mt-2 text-[11px] font-semibold text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      Đáp án đúng: <strong>{fb.correctAnswer}</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {matchingPairs && matchingPairs.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-700 text-white flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span>Nối cặp khái niệm tương ứng</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">Chọn vế trái rồi chọn vế phải</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {matchingPairs.map((pair) => {
                const isSelected = selectedMatchingLeft === pair.left;
                const connectedRight = matchingConnections[pair.left];
                return (
                  <button
                    key={pair.left}
                    type="button"
                    disabled={isSubmitted || isLocked}
                    onClick={() => handleSelectLeft(pair.left)}
                    className={`w-full p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-200'
                        : connectedRight
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-purple-300'
                    }`}
                  >
                    <span>{pair.left}</span>
                    {connectedRight && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              {matchingPairs.map((pair) => (
                <button
                  key={pair.right}
                  type="button"
                  disabled={isSubmitted || isLocked || !selectedMatchingLeft}
                  onClick={() => handleConnectRight(pair.right)}
                  className="w-full p-3 rounded-xl border text-left text-xs text-slate-700 bg-slate-50 border-slate-200 hover:bg-purple-50 hover:border-purple-300 transition-all font-medium"
                >
                  {pair.right}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="p-5 rounded-2xl bg-white border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        {isSubmitted ? (
          <div className="w-full space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Điểm Khám Phá Cặp Đôi:</span>
                  <span className="font-mono text-lg text-emerald-700 font-extrabold tabular-nums">
                    {resultScore} / 10 điểm
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Kết quả đã được đồng bộ về màn hình điều khiển của giáo viên.
                </p>
              </div>
              <span className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Đã hoàn thành Hoạt động 1</span>
              </span>
            </div>
            {feedbackList.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold">Điểm cần lưu ý theo SGK:</div>
                {feedbackList.slice(0, 4).map((fb, idx) => (
                  <div key={idx}>• {fb}</div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-600">
              Hai bạn cùng đối chiếu SGK và thống nhất toàn bộ đáp án trước khi nộp.
            </p>
            <button
              type="button"
              disabled={isLocked}
              onClick={handleSubmitWorksheet}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Nộp Phiếu Khám Phá (+{ws.xpReward || 50} XP)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
