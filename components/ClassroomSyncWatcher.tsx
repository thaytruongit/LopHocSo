'use client';

import { useState, useEffect } from 'react';
import {
  HelpCircle,
  Send,
  X,
  CheckCircle2,
  Megaphone,
  Award,
  MonitorPlay,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getCurrentUser, UserSession } from '@/lib/auth';
import { ClassroomControlState } from '@/lib/domain/types';
import {
  getClassroomState,
  subscribeToClassroomState,
  sendStudentHelpRequest,
} from '@/lib/classroom-control';

export default function ClassroomSyncWatcher() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<UserSession | null>(null);
  const [roomState, setRoomState] = useState<ClassroomControlState | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
  const [helpSentNotice, setHelpSentNotice] = useState(false);
  const [dismissedSpotlight, setDismissedSpotlight] = useState<string>('');
  const [dismissedBroadcast, setDismissedBroadcast] = useState<string>('');

  useEffect(() => {
    setMounted(true);

    const syncSessionAndRoom = () => {
      const current = getCurrentUser();
      setUser(current);
      setRoomState(getClassroomState(current.tenantId, current.roomId));
    };

    syncSessionAndRoom();
    window.addEventListener('thso_session_change', syncSessionAndRoom);

    return () => {
      window.removeEventListener('thso_session_change', syncSessionAndRoom);
    };
  }, []);

  const userTenantId = user?.tenantId;
  const userRoomId = user?.roomId;

  useEffect(() => {
    if (!userTenantId || !userRoomId) return;
    const unsub = subscribeToClassroomState(
      (st) => setRoomState(st),
      userTenantId,
      userRoomId
    );
    return () => unsub();
  }, [userTenantId, userRoomId]);

  if (!mounted || !user || user.role !== 'student' || !roomState) return null;

  const machineId = user.machineId || 1;
  const machineName = `Máy ${String(machineId).padStart(2, '0')}`;
  const studentDisplay = user.pairNames || user.studentName || 'Học sinh';
  const broadcastKey = `${roomState.broadcastTime}:${roomState.broadcastMessage}`;
  const spotlightKey = `${roomState.spotlightMachineId}:${roomState.spotlightTitle}`;

  const handleSendHelp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!helpMessage.trim()) return;
    sendStudentHelpRequest(
      machineId,
      machineName,
      studentDisplay,
      user.studentClass || roomState.activeClassName,
      helpMessage.trim()
    );
    setHelpMessage('');
    setShowHelpModal(false);
    setHelpSentNotice(true);
    setTimeout(() => setHelpSentNotice(false), 3500);
  };

  const quickMessages = [
    'Thưa Thầy, máy em chưa mở được tệp bài thực hành!',
    'Thưa Thầy, nhóm em xin gợi ý câu vận dụng trên phiếu khám phá ạ.',
    'Em bị mất kết nối mạng / cần kiểm tra lại bài nộp ạ.',
  ];

  return (
    <>
      {/* THÔNG BÁO PHÁT TRỰC TIẾP TỪ GIÁO VIÊN (TOAST MƯỢT) */}
      <AnimatePresence>
        {roomState.isLive &&
          roomState.broadcastMessage &&
          dismissedBroadcast !== broadcastKey && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="fixed top-20 right-4 z-40 max-w-sm bg-white border border-blue-200 rounded-2xl p-3.5 shadow-lg flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Megaphone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">{user.teacherName}</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {roomState.broadcastTime}
                  </span>
                </div>
                <p className="text-slate-600 mt-0.5 leading-snug">{roomState.broadcastMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setDismissedBroadcast(broadcastKey)}
                className="text-slate-400 hover:text-slate-700 p-1"
                aria-label="Đóng thông báo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
      </AnimatePresence>

      {/* CHIẾU GƯƠNG BÀI TỐT (SPOTLIGHT MODAL TỪ GIÁO VIÊN) */}
      <AnimatePresence>
        {roomState.spotlightMachineId &&
          roomState.spotlightTitle &&
          dismissedSpotlight !== spotlightKey && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.96, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 12 }}
                className="bg-white rounded-3xl border border-amber-300 shadow-2xl max-w-lg w-full overflow-hidden"
              >
                <div className="bg-amber-500 text-white px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MonitorPlay className="w-5 h-5" />
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider opacity-90">
                        Chiếu gương bài làm tiêu biểu toàn phòng máy
                      </div>
                      <h3 className="font-extrabold text-base">{roomState.spotlightTitle}</h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDismissedSpotlight(spotlightKey)}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                    <Award className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Tuyên dương: {roomState.spotlightStudentNames || `Máy ${roomState.spotlightMachineId}`}
                    </span>
                  </div>
                  {roomState.spotlightContent && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {roomState.spotlightContent}
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setDismissedSpotlight(spotlightKey)}
                      className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                    >
                      Đã xem bài mẫu
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* NÚT GIƠ TAY GỌI GIÁO VIÊN CỐ ĐỊNH GÓC DƯỚI PHẢI */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
        {helpSentNotice && (
          <div className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-lg flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Đã gửi tín hiệu hỗ trợ về bàn {user.teacherName}!</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowHelpModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Giơ tay hỏi Thầy ({machineName})</span>
        </button>
      </div>

      {/* MODAL GỬI CÂU HỎI HỖ TRỢ */}
      {showHelpModal && (
        <div
          className="fixed inset-0 z-[75] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowHelpModal(false)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Gửi Tín Hiệu Hỗ Trợ Tới Giáo Viên
                </h3>
                <p className="text-xs text-slate-500">
                  {machineName} · {studentDisplay} · {user.studentClass}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Chọn nhanh câu hỏi:</span>
              <div className="space-y-1.5">
                {quickMessages.map((msg) => (
                  <button
                    key={msg}
                    type="button"
                    onClick={() => setHelpMessage(msg)}
                    className="w-full text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-xs text-slate-700 font-medium transition-colors"
                  >
                    {msg}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSendHelp} className="space-y-3">
              <textarea
                rows={3}
                value={helpMessage}
                onChange={(e) => setHelpMessage(e.target.value)}
                placeholder="Nhập nội dung cần thầy hỗ trợ..."
                className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi tới bàn giáo viên</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
