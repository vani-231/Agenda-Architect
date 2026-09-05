import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Plus,
  Volume2,
  VolumeX,
  CheckCircle2,
  Clock,
  User,
  Lightbulb,
  CheckSquare,
  Square,
  AlertTriangle,
} from 'lucide-react';
import { MeetingAgenda, AgendaSection } from '../types';

interface MeetingRunnerModalProps {
  agenda: MeetingAgenda;
  onClose: () => void;
  onToggleActionItem: (sectionId: string, actionId: string) => void;
}

export const MeetingRunnerModal: React.FC<MeetingRunnerModalProps> = ({
  agenda,
  onClose,
  onToggleActionItem,
}) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Section timer in seconds
  const currentSection = agenda.sections[currentSectionIndex] || agenda.sections[0];
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    (currentSection?.allocatedMinutes || 10) * 60
  );
  const [totalSecondsElapsed, setTotalSecondsElapsed] = useState<number>(0);

  // Audio Context reference for gentle reminder chimes without external asset dependencies
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playChime = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.warn('Audio chime unsupported or blocked', e);
    }
  };

  // Switch section handler
  const handleSelectSection = (index: number) => {
    if (index >= 0 && index < agenda.sections.length) {
      setCurrentSectionIndex(index);
      setSecondsRemaining(agenda.sections[index].allocatedMinutes * 60);
    }
  };

  // Add 2 minutes to the current section
  const handleAddMinutes = (mins: number) => {
    setSecondsRemaining((prev) => prev + mins * 60);
  };

  // Timer effect
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev === 60) {
            // 1 minute warning
            playChime();
          } else if (prev === 1) {
            // Time is up chime
            playChime();
          }
          return prev - 1;
        });
        setTotalSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, soundEnabled]);

  // Format time display
  const formatTime = (totalSecs: number) => {
    const isNegative = totalSecs < 0;
    const absSecs = Math.abs(totalSecs);
    const mins = Math.floor(absSecs / 60);
    const secs = absSecs % 60;
    return `${isNegative ? '+' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isOvertime = secondsRemaining < 0;
  const isWarning = secondsRemaining <= 60 && secondsRemaining >= 0;

  const totalMeetingSecs = agenda.totalDurationMinutes * 60;
  const totalMeetingProgress = Math.min(100, Math.round((totalSecondsElapsed / totalMeetingSecs) * 100));

  const sectionTotalSecs = currentSection.allocatedMinutes * 60;
  const sectionSecsUsed = sectionTotalSecs - secondsRemaining;
  const sectionProgress = Math.min(100, Math.max(0, Math.round((sectionSecsUsed / sectionTotalSecs) * 100)));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl text-white">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm sm:text-base text-white truncate max-w-md">
                  {agenda.title}
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Live Meeting Mode
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Objective: {agenda.meetingGoal}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg border transition-colors ${
                soundEnabled
                  ? 'border-slate-700 text-slate-300 hover:text-white bg-slate-800'
                  : 'border-red-900 text-red-400 bg-red-950/50'
              }`}
              title={soundEnabled ? 'Mute chimes' : 'Enable chimes'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Meeting Mode"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Meeting Progress Ribbon */}
        <div className="w-full bg-slate-800/80 h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${totalMeetingProgress}%` }}
          />
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Interactive Section Details */}
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6">
            {/* Header of Active Section */}
            <div>
              <div className="flex items-center space-x-2 text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1">
                <span>Section {currentSectionIndex + 1} of {agenda.sections.length}</span>
                <span>•</span>
                <span className="flex items-center text-slate-400">
                  <User className="w-3.5 h-3.5 mr-1" />
                  Lead: {currentSection.leadStakeholder}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {currentSection.title}
              </h2>
            </div>

            {/* Facilitation / Timing Advice Tip Box */}
            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start space-x-3">
              <Lightbulb className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-orange-300 block mb-0.5">
                  Facilitator Pacing Advice
                </span>
                <p className="text-xs sm:text-sm text-orange-100/90 leading-relaxed">
                  {currentSection.timingAdvice}
                </p>
              </div>
            </div>

            {/* Topic Summary */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Topic Summary
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                {currentSection.summary}
              </p>
            </div>

            {/* Key Discussion Points */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Key Discussion Points to Cover
              </h4>
              <ul className="space-y-2">
                {currentSection.keyDiscussionPoints.map((point, idx) => (
                  <li
                    key={idx}
                    className="flex items-start text-sm text-slate-200 bg-slate-800/30 p-2.5 rounded-lg border border-slate-800/70"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 mr-2.5 flex-shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Section Action Items & Decisions */}
            {currentSection.actionItems && currentSection.actionItems.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Action Items & Required Decisions
                </h4>
                <div className="space-y-2">
                  {currentSection.actionItems.map((action) => (
                    <div
                      key={action.id}
                      onClick={() => onToggleActionItem(currentSection.id, action.id)}
                      className={`flex items-start p-3 rounded-xl border cursor-pointer transition-colors ${
                        action.completed
                          ? 'bg-slate-800/20 border-slate-800 text-slate-500'
                          : 'bg-slate-800/60 border-slate-700 text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      <div className="mt-0.5 mr-3 flex-shrink-0">
                        {action.completed ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 text-xs sm:text-sm">
                        <span className={action.completed ? 'line-through text-slate-500' : ''}>
                          {action.task}
                        </span>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                            Owner: {action.owner}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              action.priority === 'high'
                                ? 'bg-red-950 text-red-400 border border-red-800/50'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {action.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Timer Hub & Agenda Outline */}
          <div className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-950/60 p-6 flex flex-col justify-between space-y-6">
            {/* Big Countdown Timer Card */}
            <div
              className={`p-6 rounded-2xl border text-center transition-all ${
                isOvertime
                  ? 'bg-red-950/40 border-red-800/80 text-red-200 animate-pulse'
                  : isWarning
                  ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                  : 'bg-slate-900 border-slate-800 text-white'
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-center space-x-1.5">
                {isOvertime && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                <span>
                  {isOvertime
                    ? 'Section Overtime'
                    : isWarning
                    ? '1 Minute Warning'
                    : 'Time Remaining in Topic'}
                </span>
              </div>
              <div className="text-5xl font-mono font-extrabold tracking-tight my-2">
                {formatTime(secondsRemaining)}
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                <div
                  className={`h-full transition-all duration-300 ${
                    isOvertime
                      ? 'bg-red-500'
                      : isWarning
                      ? 'bg-amber-500'
                      : 'bg-orange-500'
                  }`}
                  style={{ width: `${sectionProgress}%` }}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center space-x-2 mt-5">
                <button
                  type="button"
                  disabled={currentSectionIndex === 0}
                  onClick={() => handleSelectSection(currentSectionIndex - 1)}
                  className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Previous Section"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="py-2.5 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md shadow-orange-500/20 flex items-center space-x-2"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-white" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>Resume</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={currentSectionIndex === agenda.sections.length - 1}
                  onClick={() => handleSelectSection(currentSectionIndex + 1)}
                  className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Next Section"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-center space-x-2 mt-3">
                <button
                  type="button"
                  onClick={() => handleAddMinutes(2)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>+2 mins</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddMinutes(5)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>+5 mins</span>
                </button>
              </div>
            </div>

            {/* Agenda Sections Track List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Agenda Sections:
              </span>
              {agenda.sections.map((sec, idx) => {
                const isCurrent = idx === currentSectionIndex;
                const isPassed = idx < currentSectionIndex;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => handleSelectSection(idx)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                      isCurrent
                        ? 'border-orange-500 bg-orange-500/10 text-white font-bold'
                        : isPassed
                        ? 'border-slate-800 bg-slate-900/40 text-slate-400'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/20 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      {isPassed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${
                            isCurrent ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      )}
                      <span className="truncate">{sec.title}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono ml-2 flex-shrink-0">
                      {sec.allocatedMinutes}m
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Next Up Topic Preview */}
            {currentSectionIndex < agenda.sections.length - 1 && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Next Topic:
                </span>
                <p className="text-xs font-semibold text-slate-200 truncate mt-0.5">
                  {agenda.sections[currentSectionIndex + 1].title} (
                  {agenda.sections[currentSectionIndex + 1].allocatedMinutes}m)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
