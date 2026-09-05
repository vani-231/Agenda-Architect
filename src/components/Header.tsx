import React from 'react';
import { Layers, Play, ArrowLeft, Download, Copy, Check, Printer } from 'lucide-react';
import { MeetingAgenda } from '../types';

interface HeaderProps {
  agenda: MeetingAgenda | null;
  onReset: () => void;
  onOpenRunner?: () => void;
  onExportMarkdown?: () => void;
  hasCopied?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  agenda,
  onReset,
  onOpenRunner,
  onExportMarkdown,
  hasCopied,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onReset}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">Agenda Architect</span>
              <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                AI Powered
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Precision Meeting Design & Timed Agendas
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {agenda ? (
            <>
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                title="Create a new agenda from another document"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                New Agenda
              </button>

              {onExportMarkdown && (
                <button
                  type="button"
                  onClick={onExportMarkdown}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                  title="Copy formatted Markdown"
                >
                  {hasCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      Copy MD
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="hidden md:inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                title="Print or save as PDF"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                Print
              </button>

              {onOpenRunner && (
                <button
                  type="button"
                  onClick={onOpenRunner}
                  className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-lg shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Play className="w-3.5 h-3.5 mr-1.5 fill-white" />
                  Run Meeting
                </button>
              )}
            </>
          ) : (
            <div className="text-xs text-slate-400 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Ready for document</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
