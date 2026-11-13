'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Radio,
  Lock,
  Unlock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  Sliders,
  Award,
  BookOpen,
  Trophy,
  BarChart3,
  Power,
  X,
  FolderClock,
} from 'lucide-react';
import {
  ClassItem,
  ClassroomActivityKey,
  ClassroomControlState,
  CurriculumPeriod,
  GradeLevel,
  LabMachineState,
  Student,
} from '@/lib/domain/types';
import { formatCountdown } from '@/lib/domain/exam-engine';
import { getActiveTenantContext } from '@/lib/auth';
import {
  awardStarToMachine,
  exitClassroomAndLockAll,
  getClassroomState,
  hydrateRoomRosterIfEmpty,
  resolveHelpRequest,
  selectPeriodForClassroom,
  setActivityDuration,
  setLiveBroadcast,
  setTaughtPeriodForClass,
  subscribeToClassroomState,
  subscribeToTaughtPeriods,
  toggleActivityLock,
  updateClassroomState,
  updateMachineScore,
} from '@/lib/classroom-control';
import { getCurriculumByGrade } from '@/lib/domain/data-repository';
import Virtual3DClassroom from './Virtual3DClassroom';
import HomeworkReviewPanel from './HomeworkReviewPanel';
import GradingPanel from './GradingPanel';
import SummaryReportPanel from './SummaryReportPanel';
import SubmissionHistoryPanel from './SubmissionHistoryPanel';

export type ClassroomSubTab =
  | 'control'
  | 'grid'
  | 'grading'
  | 'homework'
  | 'submissions'
  | 'ranking'
  | 'summary';

interface ClassroomCommandCenterProps {
  currentClass: ClassItem;
  classStudents: Student[];
  initialSubFeature?: ClassroomSubTab;
}

export default function ClassroomCommandCenter({
  currentClass,
  classStudents,
  initialSubFeature = 'control',
}: ClassroomCommandCenterProps) {
  const ctx = getActiveTenantContext();
  const [subTab, setSubTab] = useState<ClassroomSubTab>(initialSubFeature);
  const [roomState, setRoomState] = useState<ClassroomControlState>(() =>
    getClassroomState(ctx.tenantId, ctx.roomId)
  );
  const [periods, setPeriods] = useState<CurriculumPeriod[]>([]);
  const [taughtPeriods, setTaughtPeriods] = useState<number[]>([]);
  const [timerTickSec, setTimerTickSec] = useState<number>(0);
  const [notice, setNotice] = useState<string>('');
  const [broadcastInput, setBroadcastInput] = useState<string>('');

  useEffect(() => {
    setSubTab(initialSubFeature);
  }, [initialSubFeature]);

  useEffect(() => {
    hydrateRoomRosterIfEmpty(ctx.tenantId, ctx.roomId).then(setRoomState).catch(() => {});
    const unsub = subscribeToClassroomState(setRoomState, ctx.tenantId, ctx.roomId);
    return () => unsub();
  }, [ctx.tenantId, ctx.roomId]);

  useEffect(() => {
    if (!currentClass?.id) return;
    const unsubTaught = subscribeToTaughtPeriods(
      ctx.tenantId,
      currentClass.id,
      setTaughtPeriods
    );
    return () => unsubTaught();
  }, [ctx.tenantId, currentClass?.id]);

  useEffect(() => {
    const grade = (currentClass?.grade || roomState.activeGrade || 7) as GradeLevel;
    getCurriculumByGrade(grade).then(setPeriods).catch(() => {});
  }, [currentClass?.grade, roomState.activeGrade]);

  // Sync live countdown timer against timerEndTimestamp
  useEffect(() => {
    const updateClock = () => {
      if (roomState.isTimerRunning && roomState.timerEndTimestamp > 0) {
        const diff = Math.max(0, Math.floor((roomState.timerEndTimestamp - Date.now()) / 1000));
        setTimerTickSec(diff);
      } else {
        setTimerTickSec(roomState.timerRemainingSeconds || 0);
      }
    };
    updateClock();
    const id = setInterval(updateClock, 1000);
    return () => clearInterval(id);
  }, [roomState.isTimerRunning, roomState.timerEndTimestamp, roomState.timerRemainingSeconds]);

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  const pendingHelpRequests = useMemo(
    () => roomState.helpRequests.filter((r) => r.status === 'pending'),
    [roomState.helpRequests]
  );

  const handleSpotlight = (machine: LabMachineState) => {
    updateClassroomState((prev) => ({
      ...prev,
      spotlightMachineId: machine.machineId,
      spotlightTitle: `Bài làm tiêu biểu · ${machine.machineName}`,
      spotlightStudentNames: machine.student2Name
        ? `${machine.student1Name} & ${machine.student2Name}`
        : machine.student1Name,
      spotlightContent:
        machine.comment ||
        `Nhóm ${machine.machineName} hoàn thành xuất sắc ${prev.lessonTitle || 'nhiệm vụ tiết học'} (${machine.totalScore ?? 9.5} điểm).`,
    }));
    showToast(`Đang chiếu gương ${machine.machineName} lên toàn bộ 24 máy.`);
  };

  const subTabs: { id: ClassroomSubTab; label: string; icon: any }[] = [
    { id: 'control', label: 'Điều Khiển Tiết Dạy', icon: Sliders },
    { id: 'grid', label: 'Sơ Đồ 24 Máy', icon: Monitor },
    { id: 'grading', label: 'Chấm Thực Hành', icon: Award },
    { id: 'homework', label: 'Bài Tập Về Nhà', icon: BookOpen },
    { id: 'submissions', label: 'Lịch sử nộp bài', icon: FolderClock },
    { id: 'ranking', label: 'Bảng Vàng Lớp', icon: Trophy },
    { id: 'summary', label: 'Tổng Kết Excel', icon: BarChart3 },
  ];

  const activePeriodObj = periods.find((p) => p.period === roomState.activePeriod);

  return (
    <div className="space-y-4">
      {notice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button type="button" onClick={() => setNotice('')} className="text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TOP COMMAND HEADER */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
              <span>{ctx.tenantName}</span>
              <span>·</span>
              <span>{ctx.roomName}</span>
              <span>·</span>
              <span>{currentClass.name} ({classStudents.length} HS)</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
              {roomState.activePeriod > 0
                ? `Tiết ${roomState.activePeriod}: ${roomState.lessonTitle || activePeriodObj?.title || 'Đang tải tên bài...'}`
                : `Chưa chọn tiết dạy cho ${currentClass.name}`}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 flex items-center gap-2 text-xs">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="font-mono font-extrabold text-sm tabular-nums">
                {formatCountdown(timerTickSec)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                const next = setLiveBroadcast(!roomState.isLive);
                setRoomState(next);
                showToast(next.isLive ? 'Đã BẬT phát trực tiếp tới 24 máy!' : 'Đã TẠM DỪNG phát trực tiếp.');
              }}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors ${
                roomState.isLive
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>{roomState.isLive ? 'Đang Phát Trực Tiếp' : 'Phát Trực Tiếp Ngay'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRoomState(exitClassroomAndLockAll());
                showToast('Đã kết thúc tiết học và khóa toàn bộ hoạt động.');
              }}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Power className="w-4 h-4" />
              <span>Kết Thúc Tiết</span>
            </button>
          </div>
        </div>

        {/* PENDING HELP REQUESTS ALERT */}
        {pendingHelpRequests.length > 0 && (
          <div className="bg-rose-950/70 border border-rose-500/60 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-rose-200 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                {pendingHelpRequests[0].machineName} ({pendingHelpRequests[0].studentName}): &ldquo;
                {pendingHelpRequests[0].message}&rdquo;
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                resolveHelpRequest(pendingHelpRequests[0].id);
                showToast(`Đã xác nhận hỗ trợ ${pendingHelpRequests[0].machineName}.`);
              }}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold shrink-0"
            >
              Đã hỗ trợ ({pendingHelpRequests.length})
            </button>
          </div>
        )}

        {/* SUB-FEATURE TAB BAR */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {subTabs.map((t) => {
            const Icon = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  active
                    ? 'bg-white text-slate-900'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: CONTROL */}
      {subTab === 'control' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: PERIOD PICKER */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-slate-900">
                Chọn Tiết Dạy ({periods.length} Tiết · Khối {currentClass.grade})
              </h3>
              <span className="font-mono text-[11px] font-bold text-emerald-700">
                Đã dạy {taughtPeriods.length}/{periods.length}
              </span>
            </div>

            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
              {periods.map((p) => {
                const isSelected = roomState.activePeriod === p.period;
                const isTaught = taughtPeriods.includes(p.period);
                return (
                  <div
                    key={p.id}
                    className={`w-full p-2.5 rounded-xl border text-xs transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const next = selectPeriodForClassroom({
                          period: p.period,
                          lessonTitle: p.title,
                          grade: currentClass.grade,
                          isPractical: Boolean(p.isPractice || p.practicalTask),
                          classId: currentClass.id,
                          className: currentClass.name,
                          autoLive: true,
                        });
                        setRoomState(next);
                        showToast(`Đã phát Tiết ${p.period}: ${p.title} & mở BTVN cho ${currentClass.name}.`);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-blue-700">
                          Tiết {p.period} · {p.isPractice ? 'Thực hành' : 'Lý thuyết'}
                        </span>
                        {isTaught && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Đã dạy
                          </span>
                        )}
                      </div>
                      <div className="truncate font-semibold">{p.title}</div>
                    </button>

                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const nextList = await setTaughtPeriodForClass(
                          ctx.tenantId,
                          currentClass.id,
                          p.period,
                          !isTaught
                        );
                        setTaughtPeriods(nextList);
                        showToast(
                          !isTaught
                            ? `Đã đánh dấu Tiết ${p.period} là ĐÃ DẠY (Mở BTVN cho ${currentClass.name}).`
                            : `Đã khóa BTVN Tiết ${p.period} của ${currentClass.name} (Chưa dạy).`
                        );
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 border transition-colors ${
                        isTaught
                          ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                      title={
                        isTaught
                          ? 'Bấm để đánh dấu chưa dạy & khóa BTVN tiết này'
                          : 'Bấm để đánh dấu đã dạy & mở BTVN tiết này'
                      }
                    >
                      {isTaught ? 'Đã dạy ✓' : 'Chưa dạy'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: ACTIVITY GATES & LIVE BROADCAST */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900">
                Điều Phối 3 Hoạt Động Học Tập Trong Tiết
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(
                  [
                    {
                      key: 'discovery' as ClassroomActivityKey,
                      title: 'HĐ1 · Khám Phá',
                      desc: 'Phiếu học tập cặp đôi 2 HS/máy',
                    },
                    {
                      key: 'practice' as ClassroomActivityKey,
                      title: 'HĐ2 · Luyện Tập',
                      desc: '7 câu củng cố (3-2-2)',
                    },
                    {
                      key: 'lab' as ClassroomActivityKey,
                      title: 'HĐ3 · Thực Hành',
                      desc: 'Nộp sản phẩm về Drive/IDB',
                    },
                  ] as const
                ).map((act) => {
                  const isOpen = roomState.activityLocks[act.key];
                  const durMin = roomState.activityDurations[act.key] || 10;
                  return (
                    <div
                      key={act.key}
                      className={`p-4 rounded-2xl border space-y-3 ${
                        isOpen ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">{act.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{act.desc}</div>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-600 font-semibold">Phút:</span>
                        <input
                          type="number"
                          min={1}
                          max={45}
                          value={durMin}
                          onChange={(e) =>
                            setRoomState(setActivityDuration(act.key, Number(e.target.value) || 5))
                          }
                          className="w-16 px-2 py-1 rounded-lg border border-slate-300 bg-white text-center font-mono font-bold"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const next = toggleActivityLock(act.key);
                          setRoomState(next);
                          showToast(
                            `${next.activityLocks[act.key] ? 'Đã MỞ' : 'Đã KHÓA'} ${act.title}`
                          );
                        }}
                        className={`w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 ${
                          isOpen
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {isOpen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        <span>{isOpen ? 'Đang Mở' : 'Đang Khóa'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {activePeriodObj && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 space-y-1">
                  <div className="font-bold">Nội dung trọng tâm Tiết {activePeriodObj.period}:</div>
                  <p className="text-blue-900">{activePeriodObj.contentDesc}</p>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!broadcastInput.trim()) return;
                const timeLabel = new Date().toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                setRoomState(
                  updateClassroomState((prev) => ({
                    ...prev,
                    broadcastMessage: broadcastInput.trim(),
                    broadcastTime: timeLabel,
                  }))
                );
                setBroadcastInput('');
                showToast('Đã phát thông điệp xuống toàn bộ máy học sinh.');
              }}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2.5"
            >
              <label className="text-xs font-extrabold text-slate-900 block">
                Gửi Thông Điệp Nhắc Nhở Toàn Phòng Máy
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={broadcastInput}
                  onChange={(e) => setBroadcastInput(e.target.value)}
                  placeholder="Ví dụ: Còn 3 phút nữa các nhóm hoàn thành phiếu và nộp bài..."
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shrink-0"
                >
                  Phát thông báo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: 3D/ZIGZAG 24 MACHINE GRID */}
      {subTab === 'grid' && (
        <Virtual3DClassroom
          machines={roomState.machines}
          className={currentClass.name}
          onAwardStar={(mId) => {
            setRoomState(awardStarToMachine(mId));
            showToast(`Đã thưởng +1 Sao cho Máy ${String(mId).padStart(2, '0')}.`);
          }}
          onSpotlight={handleSpotlight}
          onResolveHelpByMachine={(mId) => {
            const req = pendingHelpRequests.find((r) => r.machineId === mId);
            if (req) {
              setRoomState(resolveHelpRequest(req.id));
              showToast(`Đã xử lý yêu cầu hỗ trợ Máy ${String(mId).padStart(2, '0')}.`);
            }
          }}
        />
      )}

      {/* TAB 3: PRACTICAL GRADING */}
      {subTab === 'grading' && (
        <GradingPanel
          machines={roomState.machines}
          isPracticalPeriod={roomState.isPracticalPeriod}
          onScoreMachine={(mId, act, sc, cmt) => {
            setRoomState(updateMachineScore(mId, act, sc, undefined, cmt));
            showToast(`Đã cập nhật điểm Máy ${String(mId).padStart(2, '0')} (${sc} điểm).`);
          }}
        />
      )}

      {/* TAB 4: HOMEWORK */}
      {subTab === 'homework' && (
        <HomeworkReviewPanel
          tenantId={ctx.tenantId}
          classId={currentClass.id}
          className={currentClass.name}
          onNotice={showToast}
        />
      )}

      {/* TAB 5: REALTIME SUBMISSION HISTORY */}
      {subTab === 'submissions' && (
        <SubmissionHistoryPanel
          tenantId={ctx.tenantId}
          roomId={ctx.roomId}
          classId={currentClass.id}
          className={currentClass.name}
        />
      )}

      {/* TAB 6 & 7: RANKING / SUMMARY */}
      {(subTab === 'ranking' || subTab === 'summary') && (
        <SummaryReportPanel
          roomState={roomState}
          classStudents={classStudents}
          schoolName={ctx.tenantName}
          teacherName={ctx.teacherName}
        />
      )}
    </div>
  );
}
