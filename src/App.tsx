/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DocUploader } from './components/DocUploader';
import { AgendaViewer } from './components/AgendaViewer';
import { MeetingRunnerModal } from './components/MeetingRunnerModal';
import { MeetingAgenda } from './types';
import { agendaToMarkdown } from './utils/agendaExport';

export default function App() {
  const [agenda, setAgenda] = useState<MeetingAgenda | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRunnerOpen, setIsRunnerOpen] = useState<boolean>(false);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  // Load last agenda from local storage if available for persistence
  useEffect(() => {
    try {
      const saved = localStorage.getItem('agenda_architect_active');
      if (saved) {
        setAgenda(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load saved agenda', e);
    }
  }, []);

  // Save changes to local storage
  const handleUpdateAgenda = (updated: MeetingAgenda) => {
    setAgenda(updated);
    try {
      localStorage.setItem('agenda_architect_active', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save agenda', e);
    }
  };

  const handleGenerate = async (params: {
    documentText?: string;
    documentBase64?: string;
    mimeType?: string;
    fileName: string;
    totalMinutes: number;
    meetingGoal: string;
    includeBuffer: boolean;
  }) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/generate-agenda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to architect meeting agenda');
      }

      if (data.agenda) {
        setAgenda(data.agenda);
        try {
          localStorage.setItem('agenda_architect_active', JSON.stringify(data.agenda));
        } catch (e) {
          console.warn('Could not cache agenda', e);
        }
      } else {
        throw new Error('No agenda returned by service.');
      }
    } catch (err: any) {
      console.error('Error generating agenda:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setAgenda(null);
    try {
      localStorage.removeItem('agenda_architect_active');
    } catch (e) {
      // ignore
    }
  };

  const handleExportMarkdown = async () => {
    if (!agenda) return;
    const md = agendaToMarkdown(agenda);
    await navigator.clipboard.writeText(md);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleToggleActionItem = (sectionId: string, actionId: string) => {
    if (!agenda) return;
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

    handleUpdateAgenda({
      ...agenda,
      sections: updatedSections,
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* Top Navigation */}
      <Header
        agenda={agenda}
        onReset={handleReset}
        onOpenRunner={() => setIsRunnerOpen(true)}
        onExportMarkdown={handleExportMarkdown}
        hasCopied={hasCopied}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {!agenda ? (
          <DocUploader onGenerate={handleGenerate} isLoading={isLoading} />
        ) : (
          <AgendaViewer
            agenda={agenda}
            onUpdateAgenda={handleUpdateAgenda}
            onOpenRunner={() => setIsRunnerOpen(true)}
            onReset={handleReset}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>Agenda Architect</strong> • Synthesize documents into precision timed agendas
          </span>
          <span className="text-slate-400">
            Powered by Google Gemini Flash
          </span>
        </div>
      </footer>

      {/* Live Facilitator Meeting Mode Modal */}
      {isRunnerOpen && agenda && (
        <MeetingRunnerModal
          agenda={agenda}
          onClose={() => setIsRunnerOpen(false)}
          onToggleActionItem={handleToggleActionItem}
        />
      )}
    </div>
  );
}
