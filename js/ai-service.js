/**
 * NoteD Web — AI Service
 * Mirrors iOS AIService.swift (OpenAI + Pollinations AI fallback)
 */
class AIService {
  constructor() {
    this.openAIEndpoint    = 'https://api.openai.com/v1/chat/completions';
    this.pollinationsEndpoint = 'https://text.pollinations.ai/';
  }

  get apiKey() { return storage.getSetting('api_key', ''); }
  get language() { return storage.getSetting('language', 'vi'); }

  // ── Generate Summary ──────────────────────────────────
  async generateSummary(transcript, language = null) {
    const lang = language || this.language;
    const token = storage.getToken();

    const resp = await fetch(`${storage.API_BASE_URL}/api/ai/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ transcript, language: lang })
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `Summary API error: ${resp.status}`);
    }

    const summaryData = await resp.json();
    return new AISummary({ ...summaryData, generatedAt: new Date() });
  }

  // ── Chat with Transcript ──────────────────────────────
  async chatWithTranscript(transcript, question) {
    const token = storage.getToken();

    const resp = await fetch(`${storage.API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ transcript, question })
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `Chat API error: ${resp.status}`);
    }

    const data = await resp.json();
    return data.answer;
  }

  // ── Private: Pollinations AI ──────────────────────────
  async _callPollinations(prompt, systemPrompt = 'You are a helpful assistant.') {
    const resp = await fetch(this.pollinationsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: prompt },
        ],
        model: 'openai',
      }),
    });
    if (!resp.ok) throw new Error(`Pollinations error: ${resp.status}`);
    const text = await resp.text();
    return text.trim();
  }

  // ── Private: Build summary prompt ─────────────────────
  _buildSummaryPrompt(transcript, language) {
    return `Phân tích transcript sau và trả về JSON với cấu trúc:
{
  "overview": "Tổng quan ngắn gọn về nội dung (2-3 câu)",
  "keyPoints": ["Điểm chính 1", "Điểm chính 2", ...],
  "actionItems": ["Việc cần làm 1", "Việc cần làm 2", ...],
  "meetingNotes": "Ghi chú cuộc họp chi tiết",
  "participants": ["Người tham gia (nếu phân biệt được)"]
}

Transcript:
${transcript}

Ngôn ngữ đầu ra: ${language === 'en' ? 'English' : 'Tiếng Việt'}`;
  }

  // ── Private: Parse summary from text response ─────────
  _parseSummaryFromText(text, transcript) {
    // Try to parse JSON
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    try {
      const json = JSON.parse(cleaned);
      return new AISummary({ ...json, generatedAt: new Date() });
    } catch {}

    // Fallback: extract lines
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const keyPoints = lines
      .filter(l => l.startsWith('-') || l.startsWith('*') || /^\d+\./.test(l))
      .map(l => l.replace(/^[-*\d.]\s*/, '').trim())
      .slice(0, 5);

    return new AISummary({
      overview: text.slice(0, 300),
      keyPoints: keyPoints.length ? keyPoints : ['Nội dung đã được phân tích'],
      actionItems: ['Cấu hình API Key trong Cài đặt để nhận kết quả chính xác hơn'],
      meetingNotes: text,
      participants: [],
      generatedAt: new Date(),
    });
  }

  // ── Private: Mock summary (offline fallback) ──────────
  _mockSummary(transcript, language = 'vi') {
    const sentences = this._parseSentences(transcript);
    const keyPoints = sentences.length <= 3
      ? sentences
      : [sentences[0], sentences[Math.floor(sentences.length/2)], sentences[sentences.length-1]];

    return new AISummary({
      overview: sentences.slice(0, 2).join(' ') || 'Không có nội dung tóm tắt.',
      keyPoints: keyPoints.length ? keyPoints : ['Không đủ dữ liệu phiên âm'],
      actionItems: ['Cấu hình API Key trong Cài đặt để sử dụng AI nâng cao'],
      meetingNotes: transcript,
      participants: [],
      generatedAt: new Date(),
    });
  }

  // ── Private: Mock chat response ───────────────────────
  _mockChatResponse(transcript, question, language = 'vi') {
    const sentences = this._parseSentences(transcript);
    const q = question.toLowerCase();

    if (q.includes('tóm tắt') || q.includes('ý chính') || q.includes('summary')) {
      if (!sentences.length) return 'Không có nội dung phiên âm để tóm tắt.';
      const pts = sentences.slice(0, 3);
      return `Dựa trên nội dung ghi âm, đây là các ý chính:\n${pts.map((p,i) => `${i+1}. ${p}`).join('\n')}\n\n_(Demo Mode - Cấu hình OpenAI API Key để nhận phân tích GPT-4)_`;
    }

    if (q.includes('việc cần làm') || q.includes('action') || q.includes('todo')) {
      const actions = sentences.slice(0, 2);
      return `Các việc cần làm đề xuất:\n${actions.map(a => `- ${a}`).join('\n')}\n\n_(Demo Mode)_`;
    }

    const best = sentences[0] || 'Không tìm thấy nội dung phù hợp.';
    return `Dựa trên nội dung ghi âm, đây là ý liên quan nhất: "${best}"\n\n_(Demo Mode - Cấu hình OpenAI API Key để nhận câu trả lời đầy đủ)_`;
  }

  // ── Private: Parse sentences ──────────────────────────
  _parseSentences(transcript) {
    return transcript
      .split(/[.!?;]+/)
      .map(s => s.trim())
      .filter(s => s.length > 5);
  }
}

const aiService = new AIService();
