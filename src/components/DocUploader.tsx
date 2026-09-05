import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Clock,
  Target,
  Sparkles,
  FileCode,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { SAMPLE_DOCS, SampleDoc } from '../data/sampleDocs';

interface DocUploaderProps {
  onGenerate: (params: {
    documentText?: string;
    documentBase64?: string;
    mimeType?: string;
    fileName: string;
    totalMinutes: number;
    meetingGoal: string;
    includeBuffer: boolean;
  }) => Promise<void>;
  isLoading: boolean;
}

const DURATION_PRESETS = [
  { label: '15m', minutes: 15, sub: 'Lightning Sync' },
  { label: '30m', minutes: 30, sub: 'Standard Sync' },
  { label: '45m', minutes: 45, sub: 'Strategic Review' },
  { label: '60m', minutes: 60, sub: 'Deep Dive' },
  { label: '90m', minutes: 90, sub: 'Workshop' },
];

const GOAL_PRESETS = [
  'Decision-Making & Consensus',
  'Status Update & Team Alignment',
  'Technical Review & Problem Solving',
  'Brainstorming & Solution Design',
  'Client Kickoff & Governance',
];

export const DocUploader: React.FC<DocUploaderProps> = ({ onGenerate, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'samples'>('upload');
  
  // Document State
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [fileText, setFileText] = useState<string>('');
  const [fileBase64, setFileBase64] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Meeting Settings
  const [totalMinutes, setTotalMinutes] = useState<number>(45);
  const [customDuration, setCustomDuration] = useState<string>('45');
  const [isCustomDuration, setIsCustomDuration] = useState<boolean>(false);
  const [meetingGoal, setMeetingGoal] = useState<string>('Decision-Making & Consensus');
  const [customGoal, setCustomGoal] = useState<string>('');
  const [isCustomGoal, setIsCustomGoal] = useState<boolean>(false);
  const [includeBuffer, setIncludeBuffer] = useState<boolean>(true);

  // Loading Step simulation
  const [loadingStep, setLoadingStep] = useState<string>('Analyzing document structure...');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    setErrorMsg('');
    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');
    setMimeType(file.type || 'text/plain');

    const lower = file.name.toLowerCase();
    const isTextLike =
      lower.endsWith('.md') ||
      lower.endsWith('.markdown') ||
      lower.endsWith('.txt') ||
      file.type === 'text/markdown' ||
      file.type === 'text/plain';

    if (isTextLike) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = (e.target?.result as string) || '';
        setFileText(content);
        setFileBase64('');
      };
      reader.onerror = () => {
        setErrorMsg('Failed to read text file.');
      };
      reader.readAsText(file);
    } else {
      // PDF or DOCX or DOC
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = (e.target?.result as string) || '';
        // Extract base64 part
        const base64 = dataUrl.split(',')[1] || '';
        setFileBase64(base64);
        setFileText(''); // server will parse or pass to Gemini
      };
      reader.onerror = () => {
        setErrorMsg('Failed to read file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleSelectSample = (sample: SampleDoc) => {
    setFileName(sample.name);
    setFileSize(`${(sample.content.length / 1024).toFixed(1)} KB`);
    setFileText(sample.content);
    setFileBase64('');
    setMimeType('text/markdown');
    setTotalMinutes(sample.defaultMinutes);
    setCustomDuration(sample.defaultMinutes.toString());
    setIsCustomDuration(false);
    setErrorMsg('');
  };

  const handleDurationChange = (mins: number) => {
    setTotalMinutes(mins);
    setCustomDuration(mins.toString());
    setIsCustomDuration(false);
  };

  const handleCustomDurationInput = (val: string) => {
    setCustomDuration(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 5 && parsed <= 480) {
      setTotalMinutes(parsed);
      setIsCustomDuration(true);
    }
  };

  const handleSubmit = async () => {
    if (!fileText && !fileBase64) {
      setErrorMsg('Please upload a document, paste notes, or select a sample document first.');
      return;
    }

    const effectiveGoal = isCustomGoal && customGoal.trim() ? customGoal.trim() : meetingGoal;

    try {
      setLoadingStep('Analyzing document context & stakeholders...');
      const timer1 = setTimeout(() => setLoadingStep('Extracting discussion topics & action items...'), 2200);
      const timer2 = setTimeout(() => setLoadingStep(`Calculating precise timing for ${totalMinutes} minutes...`), 4500);

      await onGenerate({
        documentText: fileText || undefined,
        documentBase64: fileBase64 || undefined,
        mimeType: mimeType || undefined,
        fileName: fileName || 'Uploaded_Document',
        totalMinutes,
        meetingGoal: effectiveGoal,
        includeBuffer,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating agenda');
    }
  };

  const wordCount = fileText
    ? fileText.trim().split(/\s+/).filter(Boolean).length
    : fileBase64
    ? 'Document Binary'
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      {/* Intro hero banner */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-800 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5 text-orange-600" />
          <span>Intelligent Meeting Synthesis</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
          Turn any document into a <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-indigo-600 bg-clip-text text-transparent">
            flawlessly timed meeting agenda
          </span>
        </h1>
        <p className="mt-3 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
          Upload any Markdown, Word doc, or PDF. Specify your meeting duration, and Agenda Architect synthesizes topic summaries, stakeholders, action items, and minute-by-minute pacing.
        </p>
      </div>

      {/* Main Configuration Card */}
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
        {/* Source Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'upload'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Upload className="w-4 h-4 mr-2 text-orange-600" />
            Upload Document (.md, .docx, .pdf, .txt)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'paste'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <FileCode className="w-4 h-4 mr-2 text-indigo-600" />
            Paste Text or Notes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'samples'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <BookOpen className="w-4 h-4 mr-2 text-amber-600" />
            Instant Sample Docs
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Tab 1: Upload */}
          {activeTab === 'upload' && (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".md,.markdown,.txt,.docx,.doc,.pdf"
                className="hidden"
              />
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
                  isDragOver
                    ? 'border-orange-500 bg-orange-50/50 scale-[0.99]'
                    : fileName
                    ? 'border-emerald-300 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-orange-400 hover:bg-slate-50/50'
                }`}
              >
                <div className="mx-auto w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4 shadow-sm">
                  {fileName ? (
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  ) : (
                    <Upload className="w-7 h-7" />
                  )}
                </div>
                {fileName ? (
                  <div>
                    <p className="text-base font-bold text-slate-900 mb-1">{fileName}</p>
                    <p className="text-xs text-slate-500">
                      Size: {fileSize} • {typeof wordCount === 'number' ? `${wordCount} words detected` : 'Binary document ready'}
                    </p>
                    <p className="mt-3 text-xs font-semibold text-orange-600 hover:underline">
                      Click or drag to replace file
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-base font-semibold text-slate-800">
                      Drop your document here, or <span className="text-orange-600 underline">browse</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports Markdown (.md), Microsoft Word (.docx), PDF (.pdf), or Plain Text (.txt)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Paste */}
          {activeTab === 'paste' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Paste Document Content or Meeting Notes
              </label>
              <textarea
                value={fileText}
                onChange={(e) => {
                  setFileText(e.target.value);
                  setFileBase64('');
                  if (!fileName) setFileName('Pasted_Meeting_Notes.md');
                  setFileSize(`${(e.target.value.length / 1024).toFixed(1)} KB`);
                }}
                rows={9}
                placeholder="Paste raw markdown, meeting briefs, project requirements, architectural specs, or incident reports..."
                className="w-full rounded-xl border border-slate-300 p-4 text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-slate-50/50"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1.5">
                <span>{typeof wordCount === 'number' ? `${wordCount} words` : ''}</span>
                <span>Supports markdown formatting</span>
              </div>
            </div>
          )}

          {/* Tab 3: Sample Docs */}
          {activeTab === 'samples' && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Select a ready-to-test business document:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {SAMPLE_DOCS.map((sample) => (
                  <div
                    key={sample.id}
                    onClick={() => handleSelectSample(sample)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      fileName === sample.name
                        ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {sample.category}
                      </span>
                      <span className="text-xs font-semibold text-orange-600 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {sample.defaultMinutes}m
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mb-1 line-clamp-1">{sample.name}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{sample.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected File Confirmation Bar */}
          {fileName && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-3 overflow-hidden">
                <FileText className="w-5 h-5 text-orange-600 flex-shrink-0" />
                <div className="truncate">
                  <span className="text-xs font-bold text-slate-800">{fileName}</span>
                  <span className="text-xs text-slate-500 ml-2">({fileSize})</span>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex-shrink-0">
                Ready to Architect
              </span>
            </div>
          )}

          {/* Section: Meeting Pacing & Total Time */}
          <div className="pt-2 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <label className="text-sm font-bold text-slate-900">
                  Total Meeting Duration
                </label>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-800">
                {totalMinutes} Minutes Total
              </span>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.minutes}
                  type="button"
                  onClick={() => handleDurationChange(preset.minutes)}
                  className={`py-3 px-3 rounded-xl border text-center transition-all ${
                    !isCustomDuration && totalMinutes === preset.minutes
                      ? 'border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/25 font-bold'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-base font-extrabold">{preset.label}</div>
                  <div
                    className={`text-[11px] truncate mt-0.5 ${
                      !isCustomDuration && totalMinutes === preset.minutes
                        ? 'text-orange-100'
                        : 'text-slate-400'
                    }`}
                  >
                    {preset.sub}
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Minutes Slider / Input */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
              <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                Or custom duration:
              </span>
              <input
                type="range"
                min={10}
                max={180}
                step={5}
                value={totalMinutes}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setTotalMinutes(val);
                  setCustomDuration(val.toString());
                  setIsCustomDuration(true);
                }}
                className="w-full accent-orange-600"
              />
              <div className="flex items-center space-x-1.5 flex-shrink-0">
                <input
                  type="number"
                  min={5}
                  max={480}
                  value={customDuration}
                  onChange={(e) => handleCustomDurationInput(e.target.value)}
                  className="w-16 px-2 py-1 text-sm font-bold text-center border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <span className="text-xs font-semibold text-slate-500">mins</span>
              </div>
            </div>
          </div>

          {/* Section: Meeting Objective / Style */}
          <div className="pt-2 border-t border-slate-100 space-y-4">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-indigo-600" />
              <label className="text-sm font-bold text-slate-900">
                Meeting Objective & Pacing Archetype
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {GOAL_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setMeetingGoal(preset);
                    setIsCustomGoal(false);
                  }}
                  className={`text-xs px-3.5 py-2 rounded-xl font-medium transition-all ${
                    !isCustomGoal && meetingGoal === preset
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCustomGoal(!isCustomGoal)}
                className={`text-xs px-3.5 py-2 rounded-xl font-medium transition-all border ${
                  isCustomGoal
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                + Custom Goal
              </button>
            </div>

            {isCustomGoal && (
              <input
                type="text"
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)}
                placeholder="Specify exact meeting purpose (e.g., Finalize vendor contract terms before EOD)"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
          </div>

          {/* Buffer Checkbox */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-orange-50/50 border border-orange-200/60">
            <div className="flex items-center space-x-3">
              <input
                id="includeBufferCheck"
                type="checkbox"
                checked={includeBuffer}
                onChange={(e) => setIncludeBuffer(e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
              />
              <label htmlFor="includeBufferCheck" className="text-xs font-semibold text-slate-800 cursor-pointer">
                Reserve 3–5 min wrap-up buffer for action items & decisions
              </label>
            </div>
            <span className="text-[11px] font-medium text-orange-700 hidden sm:inline">
              Recommended for tight meetings
            </span>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* CTA Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isLoading || (!fileText && !fileBase64)}
              onClick={handleSubmit}
              className={`w-full py-4 px-6 rounded-xl font-bold text-white text-base shadow-lg transition-all flex items-center justify-center space-x-3 ${
                isLoading || (!fileText && !fileBase64)
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500 shadow-none'
                  : 'bg-gradient-to-r from-orange-600 via-amber-600 to-indigo-600 hover:from-orange-700 hover:via-amber-700 hover:to-indigo-700 shadow-orange-500/25 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-white text-sm font-semibold">{loadingStep}</span>
                </div>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-white" />
                  <span>Architect Agenda ({totalMinutes} Minutes)</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="text-center text-xs text-slate-400 mt-2.5">
              Generates topic summaries, stakeholder ownership, action items, and minute-level pacing advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
