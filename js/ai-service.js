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
    const systemPrompt = 'Bạn là trợ lý AI chuyên phân tích và tóm tắt nội dung ghi âm, cuộc họp. Hãy trả về JSON theo đúng format được yêu cầu.';
    const userPrompt = this._buildSummaryPrompt(transcript, lang);

    if (!this.apiKey) {
      // Use Pollinations AI (free, no key)
      try {
        const text = await this._callPollinations(userPrompt, systemPrompt);
        return this._parseSummaryFromText(text, transcript);
      } catch (e) {
        console.warn('Pollinations AI failed, using mock:', e);
        return this._mockSummary(transcript, lang);
      }
    }

    // Use OpenAI
    const body = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    };

    const resp = await fetch(this.openAIEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) throw new Error(`OpenAI error: ${resp.status}`);
    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content || '{}';
    const summaryData = JSON.parse(content);
    return new AISummary({ ...summaryData, generatedAt: new Date() });
  }

  // ── Chat with Transcript ──────────────────────────────
  async chatWithTranscript(transcript, question) {
    const lang = this.language;
    const systemPrompt = lang === 'en'
      ? 'You are an AI assistant analyzing audio recording transcripts. Answer the user\'s questions based on the provided transcript. Be direct and natural in English.'
      : 'Bạn là trợ lý phân tích nội dung ghi âm. Hãy trả lời câu hỏi dựa trên nội dung transcript được cung cấp. Hãy trả lời trực tiếp và tự nhiên bằng tiếng Việt.';

    const userMessage = `Transcript:\n${transcript}\n\nCâu hỏi: ${question}`;

    if (!this.apiKey) {
      try {
        return await this._callPollinations(userMessage, systemPrompt);
      } catch (e) {
        console.warn('Pollinations AI chat failed, using mock:', e);
        return this._mockChatResponse(transcript, question, lang);
      }
    }

    const body = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.5,
    };

    const resp = await fetch(this.openAIEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) throw new Error(`OpenAI error: ${resp.status}`);
    const json = await resp.json();
    return json.choices?.[0]?.message?.content || '';
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
