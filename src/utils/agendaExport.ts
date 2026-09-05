import { MeetingAgenda } from '../types';

export function agendaToMarkdown(agenda: MeetingAgenda): string {
  let runningMinutes = 0;

  const sectionsMd = agenda.sections
    .map((sec, index) => {
      const startMin = runningMinutes;
      const endMin = runningMinutes + sec.allocatedMinutes;
      runningMinutes = endMin;

      const formatTime = (min: number) => {
        const hrs = Math.floor(min / 60);
        const mins = min % 60;
        return hrs > 0 ? `${hrs}h ${mins.toString().padStart(2, '0')}m` : `${mins}m`;
      };

      const points = sec.keyDiscussionPoints.map((p) => `  - ${p}`).join('\n');
      const actions = sec.actionItems.length > 0
        ? sec.actionItems.map((a) => `  - [ ] **${a.task}** (Owner: ${a.owner}, Priority: ${a.priority.toUpperCase()})`).join('\n')
        : '  - None specified';

      return `### ${index + 1}. ${sec.title} (${sec.allocatedMinutes} mins | ${formatTime(startMin)} - ${formatTime(endMin)})
**Lead:** ${sec.leadStakeholder}
**Pacing Advice:** *${sec.timingAdvice}*

**Topic Summary:**
${sec.summary}

**Key Discussion Points:**
${points}

**Action Items & Decisions:**
${actions}
`;
    })
    .join('\n---\n\n');

  const stakeholdersMd = agenda.stakeholders
    .map((s) => `- **${s.nameOrRole}** ${s.isKeyDecisionMaker ? '*(Decision Maker)*' : ''}: ${s.roleDescription}`)
    .join('\n');

  const globalActionsMd = agenda.globalActionItems.length > 0
    ? agenda.globalActionItems
        .map((a) => `- [ ] **${a.task}** (Owner: ${a.owner}, Priority: ${a.priority.toUpperCase()})`)
        .join('\n')
    : 'No global action items.';

  const prepMd = agenda.prepNotes.length > 0
    ? agenda.prepNotes.map((note) => `- ${note}`).join('\n')
    : 'No pre-reading required.';

  return `# ${agenda.title}

**Source Document:** ${agenda.docName}
**Total Duration:** ${agenda.totalDurationMinutes} minutes
**Meeting Objective:** ${agenda.meetingGoal}

---

## Executive Summary
${agenda.overallSummary}

## Preparation & Pre-Read Notes
${prepMd}

## Key Stakeholders & Roles
${stakeholdersMd}

---

## Timed Agenda Breakdown
${sectionsMd}

---

## Consolidated Action Items Checklist
${globalActionsMd}

*Generated with Agenda Architect*
`;
}

export function downloadCalendarEvent(agenda: MeetingAgenda) {
  const now = new Date();
  // Default meeting time: tomorrow at 10:00 AM local
  const start = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start.getTime() + agenda.totalDurationMinutes * 60 * 1000);

  const formatICSDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const cleanText = (str: string) => str.replace(/\n/g, '\\n').replace(/,/g, '\\,');

  const summary = cleanText(agenda.title);
  const description = cleanText(
    `MEETING GOAL: ${agenda.meetingGoal}\n\nAGENDA:\n` +
      agenda.sections.map((s, i) => `${i + 1}. ${s.title} (${s.allocatedMinutes}m) - Lead: ${s.leadStakeholder}`).join('\n') +
      `\n\nEXECUTIVE SUMMARY:\n${agenda.overallSummary}`
  );

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Agenda Architect//Meeting Agenda Builder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:agenda-${agenda.id}@agendaarchitect.app`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${agenda.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
