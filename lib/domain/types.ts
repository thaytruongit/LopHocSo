export type GradeLevel = 6 | 7 | 8 | 9;

export interface LabRoom {
  id: string;
  name: string;
  capacity: number;
}

export interface SchoolTenant {
  id: string;
  code: string;
  name: string;
  shortName: string;
  province: string;
  teacherName: string;
  teacherEmail: string;
  academicYear: string;
  rooms: LabRoom[];
  studentDefaultPass: string;
  teacherPasscode: string;
  studentCount: number;
  classCount: number;
  isDefault?: boolean;
  gasWebAppUrl?: string;
}

export interface ClassItem {
  id: string;
  tenantId: string;
  grade: GradeLevel;
  name: string;
  classCode: string;
  studentCount: number;
}

export interface Student {
  id: string;
  tenantId: string;
  classId: string;
  className: string;
  studentCode: string;
  fullName: string;
  dob?: string;
  totalXp: number;
  level: number;
  streakDays: number;
  completedTasks: number;
  averageGrade: number;
  progressScore: number;
  contributionScore: number;
  badgesCount: number;
}

export interface UserSession {
  isLoggedIn: boolean;
  role: 'student' | 'teacher' | 'guest';
  tenantId: string;
  tenantName: string;
  roomId: string;
  roomName: string;
  teacherName: string;
  studentId?: string;
  studentCode?: string;
  studentName?: string;
  studentClass?: string;
  studentGrade?: GradeLevel;
  machineId?: number;
  isPair?: boolean;
  partnerId?: string;
  partnerCode?: string;
  partnerName?: string;
  pairNames?: string;
}

export type CognitiveLevel = 'Nhận biết' | 'Thông hiểu' | 'Vận dụng' | 'Vận dụng cao';

export interface Question {
  id: string;
  type?: 'mcq' | 'boolean' | 'fill' | 'essay' | string;
  content: string;
  options?: string[];
  correctAnswer: number | string | boolean;
  explanation?: string;
  points: number;
  level?: CognitiveLevel | string;
}

export interface Exam {
  id: string;
  grade: GradeLevel;
  title: string;
  examType: 'thường xuyên' | 'giữa kỳ' | 'cuối kỳ';
  durationMin: number;
  questionsCount: number;
  questions: Question[];
  isLocked: boolean;
}

export interface ExamResult {
  id: string;
  tenantId: string;
  examId: string;
  examTitle: string;
  studentCode: string;
  studentName: string;
  className: string;
  grade: GradeLevel;
  score: number;
  maxScore: number;
  correctCount: number;
  totalQuestions: number;
  durationSec: number;
  tabSwitches: number;
  answers: Record<string, number>;
  submittedAt: string;
}

export interface Badge {
  id: string;
  code: 'EXCELLENT' | 'HARD_WORK' | 'CREATIVE' | 'TEAM_PLAYER';
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  xpBonus: number;
}

export interface PracticeFile {
  id: string;
  title: string;
  grade: GradeLevel;
  fileName: string;
  fileSize: string;
  fileUrl: string;
  description: string;
  topics: string[];
  badge: string;
}

export interface VideoLecture {
  id: string;
  title: string;
  grade: GradeLevel;
  videoUrl: string;
  duration: string;
  topic: string;
  description: string;
  keyTakeaways: string[];
  author: string;
}

export interface DragDropItem {
  text: string;
  bucket: string;
  explanation?: string;
}

export interface FillBlankItem {
  statement: string;
  correctAnswer: string;
  filledSentence: string;
}

export interface MatchingPairItem {
  left: string;
  right: string;
}

export interface ReinforcementQuestion {
  id: string;
  level: 'Nhận biết' | 'Thông hiểu' | 'Vận dụng';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface CurriculumPeriod {
  id: string;
  grade: number;
  period: number;
  title: string;
  topic: string;
  isPractice: boolean;
  contentDesc: string;
  digitalCompetency: string;
  worksheet: {
    title: string;
    phase1_khoi_dong: string;
    phase2_kham_pha: string;
    phase3_luyen_tap: string;
    phase4_van_dung: string;
    xpReward: number;
    timeLimitMin: number;
    wordBank?: string[];
    dragDrop?: {
      bucketA: string;
      bucketB: string;
      items: DragDropItem[];
    };
    fillBlanks?: FillBlankItem[];
    matchingPairs?: MatchingPairItem[];
    discussionPrompt?: string;
  };
  reinforcement: {
    questionsCount: 7;
    matrix: string;
    questions: ReinforcementQuestion[];
  };
  practicalTask?: {
    title: string;
    sampleFileName: string;
    sampleFileUrl: string;
    steps: string[];
    rubric: { criterion: string; maxPoints: number; note: string }[];
  };
  homework: {
    title: string;
    description: string;
    acceptedFormats: ('image' | 'xlsx' | 'docx')[];
    dueInDays: number;
  };
}

export interface PracticalSubmission {
  id: string;
  tenantId: string;
  submissionCode: string;
  studentCode: string;
  studentName: string;
  classId: string;
  className: string;
  grade?: GradeLevel;
  roomId?: string;
  machineId?: number;
  period: number;
  assignmentTitle: string;
  fileName: string;
  fileSize: string;
  fileType?: string;
  fileDataUrl?: string;
  submittedAt: string;
  submittedTimestamp?: number;
  fileUrl?: string;
  score?: number;
  teacherFeedback?: string;
  status: 'submitted' | 'graded';
}

export interface HomeworkSubmission {
  id: string;
  tenantId: string;
  homeworkId: string;
  homeworkTitle: string;
  period: number;
  grade: number;
  studentCode: string;
  studentName: string;
  classId: string;
  className: string;
  fileType: 'image' | 'xlsx' | 'docx' | 'text' | 'other';
  fileName: string;
  fileSize: string;
  fileDataUrl?: string;
  driveUrl?: string;
  note?: string;
  submittedAt: string;
  score?: number;
  tt22Rank?: 'Đạt' | 'Chưa đạt';
  feedback?: string;
  status: 'submitted' | 'graded';
}

export type ClassroomActivityKey = 'discovery' | 'practice' | 'lab';

export interface HelpRequest {
  id: string;
  machineId: number;
  machineName: string;
  studentName: string;
  className: string;
  message: string;
  createdAt: string;
  status: 'pending' | 'resolved';
}

export interface LabMachineState {
  machineId: number;
  machineName: string;
  student1Name: string;
  student1Code?: string;
  student2Name?: string;
  student2Code?: string;
  progress: number;
  completedTasks: number;
  totalTasks: number;
  starsEarned: number;
  status: 'active' | 'idle' | 'submitted';
  hasHelpRequest?: boolean;
  scoreH1?: number;
  scoreH2?: number;
  scoreH3?: number;
  totalScore?: number;
  comment?: string;
  practicalFileName?: string;
  practicalFileUrl?: string;
}

export interface ClassroomControlState {
  tenantId: string;
  roomId: string;
  roomName: string;
  isLive: boolean;
  activeGrade: GradeLevel;
  activeClassId: string;
  activeClassName: string;
  activePeriod: number;
  lessonTitle: string;
  isPracticalPeriod: boolean;
  activityLocks: {
    discovery: boolean;
    practice: boolean;
    lab: boolean;
  };
  activityDurations: {
    discovery: number;
    practice: number;
    lab: number;
  };
  currentActivity: ClassroomActivityKey;
  timerRemainingSeconds: number;
  timerDurationSeconds: number;
  timerEndTimestamp: number;
  isTimerRunning: boolean;
  isTimeUp: boolean;
  spotlightMachineId?: number | null;
  spotlightTitle?: string;
  spotlightStudentNames?: string;
  spotlightContent?: string;
  broadcastMessage: string;
  broadcastTime: string;
  machines: LabMachineState[];
  helpRequests: HelpRequest[];
  updatedAt: number;
}

export type TT22Rank = 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt';

export interface OfficialGradeRow {
  tenantId: string;
  studentCode: string;
  fullName: string;
  classId: string;
  className: string;
  semester: 'hk1' | 'hk2' | 'year';
  tx1: number;
  tx2: number;
  tx3: number;
  tx4: number;
  gk: number;
  ck: number;
  dtb: number;
  rank: TT22Rank;
  comment: string;
  updatedAt?: string;
}
