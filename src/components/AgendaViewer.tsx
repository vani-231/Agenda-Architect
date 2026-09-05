import React, { useState } from 'react';
import {
  Clock,
  User,
  Users,
  CheckSquare,
  Square,
  Sparkles,
  Calendar,
  FileText,
  Play,
  Copy,
  Check,
  Download,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
} from 'lucide-react';
import { MeetingAgenda, AgendaSection, ActionItem } from '../types';
import { agendaToMarkdown, downloadCalendarEvent } from '../utils/agendaExport';

interface AgendaViewerProps {
  agenda: MeetingAgenda;
  onUpdateAgenda: (updated: MeetingAgenda) => void;
  onOpenRunner: () => void;
  onReset: () => void;
}

// Visual color palette for timeline sections
const TIMELINE_COLORS = [
  'bg-amber-500',
  'bg-orange-500',
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-blue-500',
  'bg-rose-500',
  'bg-purple-500',
  'bg-teal-500',
];

export const AgendaViewer: React.FC<AgendaViewerProps> = ({
  agenda,
  onUpdateAgenda,
  onOpenRunner,
  onReset,
}) => {
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [newActionTask, setNewActionTask] = useState<string>('');
  const [newActionOwner, setNewActionOwner] = useState<string>('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  // Copy Markdown handler
  const handleCopyMarkdown = async () => {
    const md = agendaToMarkdown(agenda);
    await navigator.clipboard.writeText(md);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  // Toggle action item completed status
  const handleToggleAction = (sectionId: string, actionId: string) => {
    const updatedSections = agenda.sections.map((sec) => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          actionItems: sec.actionItems.map((act) =>
            act.id === actionId ? { ...act, completed: !act.completed } : act
          ),
        };
      }
      return sec;
    });

    onUpdateAgenda({
      ...agenda,
      sections: updatedSections,
    });
  };

  // Toggle global action item
  const handleToggleGlobalAction = (actionId: string) => {
    const updated = agenda.globalActionItems.map((act) =>
      act.id === actionId ? { ...act, completed: !act.completed } : act
    );
    onUpdateAgenda({
      ...agenda,
      globalActionItems: updated,
    });
  };

  // Update section allocated minutes
  const handleUpdateSectionMinutes = (sectionId: string, delta: number) => {
    const sectionIndex = agenda.sections.findIndex((s) => s.id === sectionId);
    if (sectionIndex === -1) return;

    const currentMins = agenda.sections[sectionIndex].allocatedMinutes;
    const nextMins = Math.max(1, currentMins + delta);
    if (nextMins === currentMins) return;

    const diff = nextMins - currentMins;

    const updatedSections = [...agenda.sections];
    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      allocatedMinutes: nextMins,
    };

    onUpdateAgenda({
      ...agenda,
      totalDurationMinutes: agenda.totalDurationMinutes + diff,
      sections: updatedSections,
    });
  };

  // Add a new action item to global list
  const handleAddGlobalAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionTask.trim()) return;

    const newItem: ActionItem = {
      id: `custom_act_${Date.now()}`,
      task: newActionTask.trim(),
      owner: newActionOwner.trim() || 'Unassigned',
      priority: 'medium',
      completed: false,
    };

    onUpdateAgenda({
      ...agenda,
      globalActionItems: [...agenda.globalActionItems, newItem],
    });

    setNewActionTask('');
    setNewActionOwner('');
  };

  // Calculate cumulative start and end minutes for each section
  let cumulative = 0;
  const sectionTimingRanges = agenda.sections.map((sec) => {
    const start = cumulative;
    const end = cumulative + sec.allocatedMinutes;
    cumulative = end;
    return { start, end };
  });

  const totalCalculatedMinutes = agenda.sections.reduce(
    (acc, s) => acc + (Number(s.allocatedMinutes) || 0),
    0
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Banner: Meeting Header & Primary Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800">
                {agenda.totalDurationMinutes} Minutes
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 flex items-center">
                <FileText className="w-3 h-3 mr-1 text-slate-500" />
                {agenda.docName}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                {agenda.meetingGoal}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {agenda.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Architected on {new Date(agenda.createdAt).toLocaleDateString()} • {agenda.sections.length} Discussion Topics • {agenda.stakeholders.length} Key Stakeholders
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenRunner}
              className="py-2.5 px-4 rounded-xl font-bold text-white text-xs sm:text-sm bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md shadow-orange-500/20 flex items-center space-x-2 transition-all hover:scale-[1.02]"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Run Live Meeting</span>
            </button>

            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="py-2.5 px-3.5 rounded-xl font-semibold text-xs sm:text-sm text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm flex items-center space-x-1.5 transition-colors"
            >
              {hasCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => downloadCalendarEvent(agenda)}
              className="py-2.5 px-3.5 rounded-xl font-semibold text-xs sm:text-sm text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm flex items-center space-x-1.5 transition-colors"
              title="Download .ics file for Google Calendar or Outlook"
            >
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Add to Calendar (.ics)</span>
            </button>
          </div>
        </div>

        {/* Visual Timeline Pacing Bar */}
        <div className="pt-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span className="flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1.5 text-orange-600" />
              Timeline Pacing Breakdown ({totalCalculatedMinutes} mins total)
            </span>
            <span>Click section below to jump</span>
          </div>

          {/* Stacked Percentage Bar */}
          <div className="w-full h-8 rounded-xl overflow-hidden flex shadow-inner border border-slate-200">
            {agenda.sections.map((sec, idx) => {
              const pct = (sec.allocatedMinutes / totalCalculatedMinutes) * 100;
              const color = TIMELINE_COLORS[idx % TIMELINE_COLORS.length];
              const range = sectionTimingRanges[idx];
              return (
                <div
                  key={sec.id}
                  style={{ width: `${Math.max(4, pct)}%` }}
                  className={`${color} relative group cursor-pointer transition-all hover:opacity-90 flex items-center justify-center text-white text-[11px] font-bold px-1 overflow-hidden`}
                  onClick={() => {
                    const el = document.getElementById(sec.id);
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  title={`${sec.title} (${sec.allocatedMinutes}m, Min ${range.start}-${range.end})`}
                >
                  <span className="truncate hidden sm:inline">{sec.allocatedMinutes}m</span>
                </div>
              );
            })}
          </div>

          {/* Timeline markers */}
          <div className="flex justify-between text-[11px] text-slate-400 font-mono px-1">
            <span>00:00</span>
            <span>{Math.floor(totalCalculatedMinutes / 2)}:00</span>
            <span>{totalCalculatedMinutes}:00</span>
          </div>
        </div>
      </div>

      {/* Grid: Executive Summary & Stakeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Executive Summary & Pre-read */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Document Synthesis
            </span>
            <h3 className="text-lg font-bold text-slate-900">Executive Summary</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {agenda.overallSummary}
            </p>
          </div>

          {agenda.prepNotes && agenda.prepNotes.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Required Pre-Reading & Attendee Prep
              </span>
              <ul className="space-y-2">
                {agenda.prepNotes.map((note, idx) => (
                  <li key={idx} className="flex items-start text-xs sm:text-sm text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 mr-2.5 flex-shrink-0" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Stakeholders Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Participants
              </span>
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <Users className="w-4 h-4 mr-2 text-indigo-600" />
                Key Stakeholders
              </h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {agenda.stakeholders.length}
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-96 pr-1">
            {agenda.stakeholders.map((sh) => (
              <div
                key={sh.id}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 flex items-center">
                    <User className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {sh.nameOrRole}
                  </span>
                  {sh.isKeyDecisionMaker && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      Decision Maker
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-normal">{sh.roleDescription}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sections: Detailed Timed Topics */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Timed Agenda Sections
            </h2>
            <p className="text-xs text-slate-500">
              Structured topics with summaries, pacing advice, and action items
            </p>
          </div>
          <div className="text-xs text-slate-500">
            Use <span className="font-bold">+</span> / <span className="font-bold">-</span> to adjust allocated minutes
          </div>
        </div>

        <div className="space-y-4">
          {agenda.sections.map((sec, idx) => {
            const range = sectionTimingRanges[idx];
            const color = TIMELINE_COLORS[idx % TIMELINE_COLORS.length];

            return (
              <div
                key={sec.id}
                id={sec.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm transition-all hover:border-slate-300"
              >
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`w-8 h-8 rounded-xl ${color} text-white flex items-center justify-center text-xs font-extrabold flex-shrink-0`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {sec.title}
                      </h3>
                      <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-mono">
                          Min {range.start.toString().padStart(2, '0')}:00 – {range.end.toString().padStart(2, '0')}:00
                        </span>
                        <span>•</span>
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1 text-slate-400" />
                          Lead: {sec.leadStakeholder}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Minute adjuster */}
                  <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleUpdateSectionMinutes(sec.id, -1)}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700"
                      title="Decrease allocated minutes"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono font-bold px-2 text-slate-800">
                      {sec.allocatedMinutes} mins
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateSectionMinutes(sec.id, 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700"
                      title="Increase allocated minutes"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Body Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
                  {/* Topic Summary & Discussion Points */}
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Topic Summary
                      </span>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {sec.summary}
                      </p>
                    </div>

                    {sec.keyDiscussionPoints && sec.keyDiscussionPoints.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                          Key Discussion Points
                        </span>
                        <ul className="space-y-1.5">
                          {sec.keyDiscussionPoints.map((point, pIdx) => (
                            <li key={pIdx} className="text-xs sm:text-sm text-slate-600 flex items-start">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 mr-2 flex-shrink-0" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Right: Facilitator Timing Advice & Section Actions */}
                  <div className="space-y-4">
                    {/* Facilitator Timing Advice Box */}
                    <div className="p-4 rounded-xl bg-orange-50 border border-orange-200/80">
                      <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-orange-900 mb-1">
                        <Lightbulb className="w-3.5 h-3.5 text-orange-600" />
                        <span>How to Time this Section</span>
                      </div>
                      <p className="text-xs text-orange-950/90 leading-relaxed">
                        {sec.timingAdvice}
                      </p>
                    </div>

                    {/* Section Action Items */}
                    {sec.actionItems && sec.actionItems.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                          Section Actions
                        </span>
                        <div className="space-y-2">
                          {sec.actionItems.map((act) => (
                            <div
                              key={act.id}
                              onClick={() => handleToggleAction(sec.id, act.id)}
                              className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-start space-x-2 transition-colors ${
                                act.completed
                                  ? 'bg-slate-50 border-slate-200 text-slate-400'
                                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                              }`}
                            >
                              <div className="mt-0.5 flex-shrink-0">
                                {act.completed ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-slate-400" />
                                )}
                              </div>
                              <div className="flex-1">
                                <span className={act.completed ? 'line-through' : ''}>{act.task}</span>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  Owner: {act.owner}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Consolidated Action Items Register */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Deliverables & Next Steps
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              Consolidated Action Items Register
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {agenda.globalActionItems.filter((a) => a.completed).length} of{' '}
            {agenda.globalActionItems.length} completed
          </span>
        </div>

        <div className="space-y-2">
          {agenda.globalActionItems.map((act) => (
            <div
              key={act.id}
              onClick={() => handleToggleGlobalAction(act.id)}
              className={`p-3.5 rounded-xl border text-sm cursor-pointer flex items-center justify-between transition-colors ${
                act.completed
                  ? 'bg-slate-50 border-slate-200 text-slate-400'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                {act.completed ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
                <span className={act.completed ? 'line-through text-slate-400' : 'font-medium'}>
                  {act.task}
                </span>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {act.owner}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    act.priority === 'high'
                      ? 'bg-red-100 text-red-800'
                      : act.priority === 'low'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {act.priority}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Add new action form */}
        <form onSubmit={handleAddGlobalAction} className="pt-3 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Add new action item or decision..."
            value={newActionTask}
            onChange={(e) => setNewActionTask(e.target.value)}
            className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <input
            type="text"
            placeholder="Owner (e.g. Maya)"
            value={newActionOwner}
            onChange={(e) => setNewActionOwner(e.target.value)}
            className="w-full sm:w-36 text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center justify-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Action</span>
          </button>
        </form>
      </div>
    </div>
  );
};
