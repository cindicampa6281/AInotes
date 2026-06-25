/**
 * NoteD Web — Data Models
 * Mirrors iOS Swift models exactly
 */

// ── Recording Status ──────────────────────────────────
const RecordingStatus = {
  RECORDING:    'recording',
  RECORDED:     'recorded',
  UPLOADING:    'uploading',
  TRANSCRIBING: 'transcribing',
  SUMMARIZING:  'summarizing',
  COMPLETED:    'completed',
  FAILED:       'failed',
};

const STATUS_DISPLAY = {
  [RecordingStatus.RECORDING]:    'Đang ghi âm',
  [RecordingStatus.RECORDED]:     'Đã ghi âm',
  [RecordingStatus.UPLOADING]:    'Đang tải lên',
  [RecordingStatus.TRANSCRIBING]: 'Đang phân tích',
  [RecordingStatus.SUMMARIZING]:  'Đang tóm tắt',
  [RecordingStatus.COMPLETED]:    'Hoàn thành',
  [RecordingStatus.FAILED]:       'Thất bại',
};

const STATUS_COLOR = {
  [RecordingStatus.RECORDING]:    'var(--color-red)',
  [RecordingStatus.RECORDED]:     'var(--color-orange)',
  [RecordingStatus.UPLOADING]:    'var(--color-accent)',
  [RecordingStatus.TRANSCRIBING]: 'var(--color-purple)',
  [RecordingStatus.SUMMARIZING]:  'var(--color-accent)',
  [RecordingStatus.COMPLETED]:    'var(--color-green)',
  [RecordingStatus.FAILED]:       'var(--color-red)',
};

// ── TranscriptSegment ─────────────────────────────────
class TranscriptSegment {
  constructor({ id, startTime, endTime, text, speaker } = {}) {
    this.id        = id        || crypto.randomUUID();
    this.startTime = startTime || 0;
    this.endTime   = endTime   || 0;
    this.text      = text      || '';
    this.speaker   = speaker   || null;
  }

  get formattedStartTime() {
    const m = Math.floor(this.startTime / 60);
    const s = Math.floor(this.startTime % 60);
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
}

// ── AISummary ─────────────────────────────────────────
class AISummary {
  constructor({ overview, keyPoints, actionItems, meetingNotes, participants, generatedAt } = {}) {
    this.overview     = overview     || '';
    this.keyPoints    = keyPoints    || [];
    this.actionItems  = actionItems  || [];
    this.meetingNotes = meetingNotes || '';
    this.participants = participants || [];
    this.generatedAt  = generatedAt  ? new Date(generatedAt) : new Date();
  }
}

// ── RecordingModel ────────────────────────────────────
class RecordingModel {
  constructor({
    id, title, status, duration, createdAt,
    audioFileName, audioBlob, transcriptSegments,
    fullTranscript, summary, language
  } = {}) {
    this.id                 = id                 || crypto.randomUUID();
    this.title              = title              || 'Ghi âm mới';
    this.status             = status             || RecordingStatus.RECORDING;
    this.duration           = duration           || 0;
    this.createdAt          = createdAt          ? new Date(createdAt) : new Date();
    this.audioFileName      = audioFileName      || '';
    this.audioBlob          = audioBlob          || null; // in-memory only
    this.transcriptSegments = (transcriptSegments || []).map(s => s instanceof TranscriptSegment ? s : new TranscriptSegment(s));
    this.fullTranscript     = fullTranscript     || '';
    this.summary            = summary            ? (summary instanceof AISummary ? summary : new AISummary(summary)) : null;
    this.language           = language           || 'auto';

    // Reactive listeners
    this._listeners = [];
  }

  onChange(fn) { this._listeners.push(fn); return () => { this._listeners = this._listeners.filter(l => l !== fn); }; }
  _notify()    { this._listeners.forEach(fn => fn(this)); }

  set(key, value) {
    this[key] = value;
    this._notify();
    return this;
  }

  get formattedDuration() {
    const total = Math.floor(this.duration);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h${String(m).padStart(2,'0')}m${String(s).padStart(2,'0')}s`;
    return `${m}m${String(s).padStart(2,'0')}s`;
  }

  get formattedDate() {
    return this.createdAt.toLocaleString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }

  get statusDisplay() { return STATUS_DISPLAY[this.status] || this.status; }
  get statusColor()   { return STATUS_COLOR[this.status] || 'var(--color-accent)'; }

  // Serialize for storage (exclude audioBlob and listeners)
  toJSON() {
    return {
      id:                 this.id,
      title:              this.title,
      status:             this.status,
      duration:           this.duration,
      createdAt:          this.createdAt.toISOString(),
      audioFileName:      this.audioFileName,
      transcriptSegments: this.transcriptSegments,
      fullTranscript:     this.fullTranscript,
      summary:            this.summary,
      language:           this.language,
    };
  }

  static fromJSON(data) { return new RecordingModel(data); }
}

// ── Sample Data (mirrors iOS StorageService.insertSampleData) ──
function createSampleRecordings() {
  return [
    new RecordingModel({
      id: 'sample-1',
      title: 'Cuộc họp dự án Q4',
      status: RecordingStatus.COMPLETED,
      duration: 1842,
      createdAt: new Date(Date.now() - 3600 * 1000),
      audioFileName: '',
      transcriptSegments: [
        { startTime: 0,  endTime: 5,  text: 'Xin chào mọi người, hôm nay chúng ta họp về kế hoạch Q4.' },
        { startTime: 5,  endTime: 12, text: 'Mục tiêu chính là tăng doanh thu 30% so với Q3.' },
        { startTime: 12, endTime: 20, text: 'Nhóm marketing sẽ chạy chiến dịch mới vào tuần tới.' },
        { startTime: 20, endTime: 28, text: 'Chúng ta cần hoàn thành module thanh toán trước ngày 15.' },
      ],
      fullTranscript: 'Xin chào mọi người, hôm nay chúng ta họp về kế hoạch Q4. Mục tiêu chính là tăng doanh thu 30% so với Q3. Nhóm marketing sẽ chạy chiến dịch mới vào tuần tới. Chúng ta cần hoàn thành module thanh toán trước ngày 15.',
      summary: {
        overview: 'Cuộc họp về kế hoạch quý 4 với mục tiêu tăng trưởng doanh thu 30%.',
        keyPoints: ['Tăng doanh thu 30%', 'Chiến dịch marketing mới', 'Hoàn thành module thanh toán'],
        actionItems: ['Marketing chạy campaign tuần tới', 'Dev hoàn thành payment module trước ngày 15'],
        meetingNotes: 'Team align về Q4 roadmap. Tập trung revenue growth và product completion.',
        participants: ['Team Lead', 'Marketing', 'Dev'],
        generatedAt: new Date().toISOString(),
      },
    }),
    new RecordingModel({
      id: 'sample-2',
      title: 'Ghi chú ý tưởng sản phẩm',
      status: RecordingStatus.COMPLETED,
      duration: 342,
      createdAt: new Date(Date.now() - 86400 * 1000),
      audioFileName: '',
      transcriptSegments: [
        { startTime: 0, endTime: 8,  text: 'Ý tưởng về tính năng AI chat với transcript.' },
        { startTime: 8, endTime: 15, text: 'Người dùng có thể hỏi đáp về nội dung ghi âm.' },
      ],
      fullTranscript: 'Ý tưởng về tính năng AI chat với transcript. Người dùng có thể hỏi đáp về nội dung ghi âm.',
      summary: null,
    }),
    new RecordingModel({
      id: 'sample-3',
      title: 'Bài giảng Lập trình Swift',
      status: RecordingStatus.TRANSCRIBING,
      duration: 5400,
      createdAt: new Date(Date.now() - 7200 * 1000),
      audioFileName: '',
      transcriptSegments: [],
      fullTranscript: '',
    }),
  ];
}
