export interface Stakeholder {
  id: string;
  nameOrRole: string;
  roleDescription: string;
  isKeyDecisionMaker?: boolean;
}

export interface ActionItem {
  id: string;
  task: string;
  owner: string;
  priority: 'high' | 'medium' | 'low';
  completed?: boolean;
}

export interface AgendaSection {
  id: string;
  title: string;
  allocatedMinutes: number;
  summary: string;
  keyDiscussionPoints: string[];
  leadStakeholder: string;
  timingAdvice: string;
  actionItems: ActionItem[];
}

export interface MeetingAgenda {
  id: string;
  title: string;
  docName: string;
  totalDurationMinutes: number;
  meetingGoal: string;
  overallSummary: string;
  prepNotes: string[];
  stakeholders: Stakeholder[];
  sections: AgendaSection[];
  globalActionItems: ActionItem[];
  createdAt: string;
}

export interface AgendaGenerationRequest {
  documentText?: string;
  documentBase64?: string;
  mimeType?: string;
  fileName?: string;
  totalMinutes: number;
  meetingGoal?: string;
  includeBuffer?: boolean;
}
