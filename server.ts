import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import mammoth from 'mammoth';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Support larger payload for document uploads
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Helper to normalize timings to exact total minutes
function normalizeSectionTimings(sections: any[], totalMinutes: number): any[] {
  if (!sections || sections.length === 0) return [];
  
  let currentSum = sections.reduce((acc, s) => acc + (Number(s.allocatedMinutes) || 0), 0);
  if (currentSum <= 0) {
    const split = Math.max(1, Math.floor(totalMinutes / sections.length));
    sections.forEach((s, idx) => {
      s.allocatedMinutes = idx === sections.length - 1 ? totalMinutes - split * (sections.length - 1) : split;
    });
    return sections;
  }

  // Scale proportionally to fit totalMinutes
  let allocated = 0;
  sections.forEach((s, idx) => {
    if (idx === sections.length - 1) {
      s.allocatedMinutes = Math.max(1, totalMinutes - allocated);
    } else {
      const share = Math.max(1, Math.round(((Number(s.allocatedMinutes) || 1) / currentSum) * totalMinutes));
      s.allocatedMinutes = share;
      allocated += share;
    }
  });

  return sections;
}

// Parse document endpoint for extracting text from .docx, .txt, .md
app.post('/api/parse-doc', async (req: Request, res: Response) => {
  try {
    const { base64Data, fileName, mimeType } = req.body;
    if (!base64Data) {
      res.status(400).json({ error: 'No document data provided' });
      return;
    }

    const buffer = Buffer.from(base64Data, 'base64');
    let extractedText = '';

    const lowerName = (fileName || '').toLowerCase();
    const isDocx = lowerName.endsWith('.docx') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (isDocx) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else {
      // Treat as UTF-8 text/markdown
      extractedText = buffer.toString('utf-8');
    }

    res.json({ text: extractedText, charCount: extractedText.length });
  } catch (err: any) {
    console.error('Error parsing document:', err);
    res.status(500).json({ error: err.message || 'Failed to parse document' });
  }
});

// Heuristic fallback synthesizer when Gemini API key is not configured or in case of network fallback
function synthesizeFallbackAgenda(text: string, fileName: string, totalMinutes: number, meetingGoal: string, includeBuffer: boolean) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const headings = lines.filter((l) => l.startsWith('#') || (l.length < 60 && l.endsWith(':')));
  
  const extractedSections: any[] = [];
  const extractedStakeholders: any[] = [];
  const extractedActions: any[] = [];

  // Extract stakeholders mentioned in doc
  const stakeholderKeywords = ['Lead', 'Architect', 'Manager', 'Director', 'Owner', 'Officer', 'Engineer', 'SRE'];
  lines.forEach((line) => {
    if (line.toLowerCase().includes('owner:') || line.toLowerCase().includes('lead:') || line.toLowerCase().includes('stakeholder')) {
      const match = line.match(/(?:Owner|Lead|Stakeholder)s?:\s*([^,\n\)]+)/i);
      if (match && match[1]) {
        const nameOrRole = match[1].trim();
        if (!extractedStakeholders.some((s) => s.nameOrRole === nameOrRole)) {
          extractedStakeholders.push({
            id: `sh_${extractedStakeholders.length}`,
            nameOrRole,
            roleDescription: 'Key project participant identified in document context.',
            isKeyDecisionMaker: extractedStakeholders.length === 0,
          });
        }
      }
    }
  });

  if (extractedStakeholders.length === 0) {
    extractedStakeholders.push(
      { id: 'sh_0', nameOrRole: 'Meeting Facilitator', roleDescription: 'Guides discussion pace & decision resolution', isKeyDecisionMaker: true },
      { id: 'sh_1', nameOrRole: 'Project Lead', roleDescription: 'Presents background context and deliverables', isKeyDecisionMaker: true },
      { id: 'sh_2', nameOrRole: 'Core Team Members', roleDescription: 'Provide feedback and take ownership of action items', isKeyDecisionMaker: false }
    );
  }

  // Find sections from headings or paragraphs
  const cleanHeadings = headings.map((h) => h.replace(/^#+\s*/, '').replace(/:$/, '').trim()).filter((h) => h.length > 3);
  const sectionTitles = cleanHeadings.length >= 3 ? cleanHeadings.slice(0, 6) : [
    'Document Context & Objective Alignment',
    'Core Proposal & Key Findings Review',
    'Technical & Operational Constraints',
    'Action Items, Resource Allocation & Next Steps'
  ];

  if (includeBuffer) {
    sectionTitles.push('Final Wrap-up & Decision Confirmation');
  }

  const baseMinutes = Math.max(2, Math.floor(totalMinutes / sectionTitles.length));

  sectionTitles.forEach((title, idx) => {
    const isBuffer = idx === sectionTitles.length - 1 && includeBuffer;
    const isIntro = idx === 0;

    const actionItems: any[] = [];
    if (!isBuffer) {
      actionItems.push({
        id: `act_${idx}_0`,
        task: `Review & finalize sign-off on ${title.toLowerCase()}`,
        owner: extractedStakeholders[idx % extractedStakeholders.length]?.nameOrRole || 'Unassigned',
        priority: (idx === 1 ? 'high' : 'medium') as 'high' | 'medium',
        completed: false,
      });
    }

    extractedSections.push({
      id: `sec_${idx}`,
      title,
      allocatedMinutes: baseMinutes,
      summary: isBuffer
        ? 'Reserved buffer to recap all finalized decisions, confirm ticket owners, and agree on follow-up schedule.'
        : isIntro
        ? 'Align all participants on the meeting goals, background document context, and expected decisions today.'
        : `Detailed review and debate on ${title.toLowerCase()} based on documented analysis.`,
      keyDiscussionPoints: isBuffer
        ? ['Confirm assigned action items and deadlines', 'Schedule required follow-ups', 'Review open blockers']
        : [`Discuss scope and implications of ${title}`, 'Identify dependency risks or resource bottlenecks', 'Achieve team alignment and decision'],
      leadStakeholder: extractedStakeholders[idx % extractedStakeholders.length]?.nameOrRole || 'Facilitator',
      timingAdvice: isBuffer
        ? 'Hard stop: do not open new debate topics. Recap decisions and dismiss on time.'
        : isIntro
        ? 'Keep brief: spend 2-3 mins setting the stage; jump straight into meat of the topic.'
        : `Strictly allocate time: 3 min presentation, remaining minutes focused on resolving blockers.`,
      actionItems,
    });
  });

  const normalized = normalizeSectionTimings(extractedSections, totalMinutes);

  return {
    id: `agenda_${Date.now()}`,
    title: `${fileName.replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' ')} - Agenda`,
    docName: fileName,
    totalDurationMinutes: totalMinutes,
    meetingGoal,
    overallSummary: lines.slice(0, 4).join(' ').replace(/^[#\s]+/, '').slice(0, 300) || `Meeting synthesized from ${fileName} to align team on core objectives within ${totalMinutes} minutes.`,
    prepNotes: [
      `Review ${fileName} prior to the call`,
      'Prepare questions regarding key dependencies and delivery timeline',
      'Ensure primary decision makers are present for the allocated discussion slots'
    ],
    stakeholders: extractedStakeholders,
    sections: normalized,
    globalActionItems: extractedSections.flatMap((s) => s.actionItems),
    createdAt: new Date().toISOString(),
  };
}

// Agenda Generation using Gemini 3.8 Flash
app.post('/api/generate-agenda', async (req: Request, res: Response) => {
  try {
    const {
      documentText,
      documentBase64,
      mimeType,
      fileName = 'Document',
      totalMinutes = 45,
      meetingGoal = 'Decision-Making & Consensus',
      includeBuffer = true,
    } = req.body;

    if (!documentText && !documentBase64) {
      res.status(400).json({ error: 'Please provide either document text or an uploaded file.' });
      return;
    }

    let textToAnalyze = documentText || '';

    // If docx was uploaded as base64 and text wasn't extracted yet:
    if (!textToAnalyze && documentBase64) {
      const lowerName = fileName.toLowerCase();
      if (lowerName.endsWith('.docx') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const buffer = Buffer.from(documentBase64, 'base64');
        const mammothResult = await mammoth.extractRawText({ buffer });
        textToAnalyze = mammothResult.value;
      } else if (mimeType !== 'application/pdf' && !lowerName.endsWith('.pdf')) {
        // Assume text / markdown
        const buffer = Buffer.from(documentBase64, 'base64');
        textToAnalyze = buffer.toString('utf-8');
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const hasValidKey = apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 5;

    if (!hasValidKey) {
      console.log('No GEMINI_API_KEY detected. Utilizing built-in document heuristic synthesizer.');
      const fallbackAgenda = synthesizeFallbackAgenda(textToAnalyze || fileName, fileName, totalMinutes, meetingGoal, includeBuffer);
      res.json({ agenda: fallbackAgenda });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Determine content parts
    const parts: any[] = [];
    if (!textToAnalyze && documentBase64 && (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf'))) {
      parts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: documentBase64,
        },
      });
    }

    const promptText = `
You are "Agenda Architect", an executive facilitator and meeting design expert.
Your job is to read the attached document and synthesize an actionable, impeccably timed meeting agenda.

CRITICAL INSTRUCTIONS:
1. TOTAL MEETING TIME: Exactly ${totalMinutes} minutes.
2. PRIMARY MEETING GOAL / STYLE: "${meetingGoal}".
3. BUFFER TIME: ${includeBuffer ? 'Include a dedicated wrap-up / buffer section (typically 3-5 minutes) for final decisions and next steps' : 'Distribute time tightly across discussion topics'}.
4. THE SUM OF ALL SECTION "allocatedMinutes" MUST EQUAL EXACTLY ${totalMinutes} MINUTES.
5. Extract key stakeholders/roles mentioned or implied by the document. Identify who needs to be in the room and who owns each topic.
6. Summarize each topic clearly based on the document facts.
7. Provide concrete "timingAdvice" for each topic on how the facilitator should run and time the section (e.g. "Spend 2 min summarizing doc findings, 5 min open debate, cap at decision rubric").
8. Pull out explicit action items, decisions required, and follow-ups with suggested owners and priority (high, medium, low).

Document Name: "${fileName}"
${textToAnalyze ? `\n--- DOCUMENT CONTENT ---\n${textToAnalyze.slice(0, 50000)}\n--- END DOCUMENT CONTENT ---` : ''}

Generate the response in valid JSON matching this schema:
{
  "title": "Meeting Title",
  "meetingGoal": "Clear, concise objective statement for this meeting",
  "overallSummary": "Executive summary of the document context and why this meeting is taking place (2-4 sentences)",
  "prepNotes": ["Item 1 to review prior to the call", "Item 2..."],
  "stakeholders": [
    {
      "nameOrRole": "e.g. Lead Architect / Sarah M.",
      "roleDescription": "Why they need to attend and their role in the meeting",
      "isKeyDecisionMaker": true
    }
  ],
  "sections": [
    {
      "title": "Topic or Section Title",
      "allocatedMinutes": 10,
      "summary": "Specific summary of this topic from the document",
      "keyDiscussionPoints": ["Discussion point 1", "Discussion point 2"],
      "leadStakeholder": "Owner/Lead for this topic",
      "timingAdvice": "Facilitator advice: how to pace and time this section strictly",
      "actionItems": [
        {
          "task": "Specific task or decision needed",
          "owner": "Role or name",
          "priority": "high"
        }
      ]
    }
  ],
  "globalActionItems": [
    {
      "task": "Concrete follow-up task",
      "owner": "Assigned stakeholder",
      "priority": "high"
    }
  ]
}
`;

    parts.push({ text: promptText });

    const candidateModels = ['gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.8-flash'];
    let responseText = '';
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        console.log(`Attempting agenda generation with ${modelName}...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: parts.length === 1 ? parts[0].text : { parts },
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3,
            systemInstruction: 'You are Agenda Architect. You create structured, realistic, expertly timed meeting agendas from raw business, technical, and project documents. Always return pristine, valid JSON with exact minute allocations.',
          },
        });

        if (response.text && response.text.trim()) {
          responseText = response.text;
          console.log(`Successfully generated agenda using ${modelName}`);
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} returned error: ${err.message || err}`);
        lastError = err;
      }
    }

    if (!responseText) {
      console.warn('All candidate Gemini models returned errors, using heuristic synthesizer:', lastError?.message);
      const fallbackAgenda = synthesizeFallbackAgenda(textToAnalyze || fileName, fileName, totalMinutes, meetingGoal, includeBuffer);
      res.json({ agenda: fallbackAgenda, isSynthesizedFallback: true });
      return;
    }
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      // Fallback regex extraction if wrapped in backticks
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Failed to parse model response into JSON');
      }
    }

    // Normalize sections timings
    const normalizedSections = normalizeSectionTimings(parsed.sections || [], totalMinutes);

    // Format final agenda structure
    const agenda = {
      id: `agenda_${Date.now()}`,
      title: parsed.title || `${fileName.replace(/\.[^/.]+$/, '')} - Meeting Agenda`,
      docName: fileName,
      totalDurationMinutes: totalMinutes,
      meetingGoal: parsed.meetingGoal || meetingGoal,
      overallSummary: parsed.overallSummary || '',
      prepNotes: parsed.prepNotes || [],
      stakeholders: (parsed.stakeholders || []).map((s: any, idx: number) => ({
        id: `sh_${idx}`,
        nameOrRole: s.nameOrRole || 'Stakeholder',
        roleDescription: s.roleDescription || '',
        isKeyDecisionMaker: !!s.isKeyDecisionMaker,
      })),
      sections: normalizedSections.map((sec: any, idx: number) => ({
        id: `sec_${idx}`,
        title: sec.title || `Topic ${idx + 1}`,
        allocatedMinutes: sec.allocatedMinutes,
        summary: sec.summary || '',
        keyDiscussionPoints: sec.keyDiscussionPoints || [],
        leadStakeholder: sec.leadStakeholder || 'Facilitator',
        timingAdvice: sec.timingAdvice || 'Keep discussion focused on agreed agenda goals.',
        actionItems: (sec.actionItems || []).map((a: any, aIdx: number) => ({
          id: `act_${idx}_${aIdx}`,
          task: a.task,
          owner: a.owner || 'Unassigned',
          priority: (a.priority === 'high' || a.priority === 'low') ? a.priority : 'medium',
          completed: false,
        })),
      })),
      globalActionItems: (parsed.globalActionItems || []).map((a: any, idx: number) => ({
        id: `gact_${idx}`,
        task: a.task,
        owner: a.owner || 'Unassigned',
        priority: (a.priority === 'high' || a.priority === 'low') ? a.priority : 'medium',
        completed: false,
      })),
      createdAt: new Date().toISOString(),
    };

    res.json({ agenda });
  } catch (err: any) {
    console.error('Error generating agenda:', err);
    res.status(500).json({
      error: err.message || 'An error occurred while generating the meeting agenda.',
    });
  }
});

// Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Agenda Architect server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
