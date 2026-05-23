export type InvestigationType =
  | "rti"
  | "audit"
  | "procurement"
  | "whistleblower"
  | "general"
  | "criminal"
  | "missing_persons"
  | "financial_crime"
  | "cyber"
  | "internal_affairs";

export type CaseDetail = {
  id: string;
  rtiId: string;
  investigationType: InvestigationType;
  title: string;
  department: string;
  pioOfficer: string | null;
  status: string;
  priority: string;
  filedDate: string;
  dueDate: string;
  corruptionScore: number;
  documents: DocumentRow[];
  facts: FactRow[];
  notes: NoteRow[];
  tasks: TaskRow[];
  links: LinkRow[];
  entities: PersonRow[];
  alerts: Array<{ title: string; severity: string }>;
};

export type PersonRow = {
  caseEntityId: string;
  id: string;
  name: string;
  role: string;
  designation: string | null;
  riskScore: number;
  verified: boolean;
  type: string;
  relevanceScore?: number;
};

export type DocumentRow = {
  id: string;
  docType: string;
  textContent: string | null;
  uploadedAt: string;
  isVerified: boolean;
  mimeType: string | null;
};

export type FactRow = {
  id: string;
  factType: string;
  content: string;
  amount: string | null;
  amountCategory: string | null;
  factDate: string | null;
  legalSection: string | null;
  entity?: { id: string; name: string; type: string } | null;
};

export type NoteRow = {
  id: string;
  body: string;
  isPinned: boolean;
  createdAt: string;
  author: { id: string; name: string };
};

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
};

export type LinkRow = {
  id: string;
  direction: "outgoing" | "incoming";
  linkType: string;
  strength: number;
  notes: string | null;
  case: { id: string; rtiId: string; title: string; status: string };
};
