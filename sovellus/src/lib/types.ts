export type Role = "teacher" | "student";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type StudentListItem = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

export type LearningCard = {
  level: string;
  strengths: string;
  developmentAreas: string;
  goals: string;
  updatedAt: Date | null;
};

export type StudentProfile = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  hasAccessKey: boolean;
  card: LearningCard;
};

export type FormState = {
  error?: string;
  message?: string;
  accessUrl?: string;
};

export type AssignmentStatus = "draft" | "published";

export const ARCHIVE_PAGE_SIZE = 50;

export type ArchiveCursor = {
  archivedAt: string;
  id: string;
};

export type ArchivedAssignmentCard = {
  id: string;
  title: string;
  meta: string;
};

export type ArchivedAssignmentPage = {
  items: ArchivedAssignmentCard[];
  nextCursor: ArchiveCursor | null;
};

export type ResponseKind = "text" | "image" | "video" | "audio";

export type StoredResponse = {
  body: string;
  media: AssignmentMediaItem | null;
};

export type LinkedAssignment = {
  id: string;
  title: string;
  status: AssignmentStatus;
  archivedAt: Date | null;
  createdAt: Date;
};

export type TeacherDraftListItem = {
  id: string;
  title: string;
  createdAt: Date;
  deadline: Date | null;
  parentTitle: string | null;
};

export type TeacherWorkItem = {
  assignmentId: string;
  title: string;
  createdAt: Date;
  deadline: Date | null;
  studentId: string;
  studentName: string;
  returnedAt: Date | null;
  reviewedAt: Date | null;
  late: boolean;
  parentTitle: string | null;
};

export type StudentAssignmentListItem = {
  id: string;
  title: string;
  createdAt: Date;
  deadline: Date | null;
  hasDraft: boolean;
  returnedAt: Date | null;
  reviewedAt: Date | null;
  late: boolean;
  parentTitle: string | null;
};

export type MediaKind = "image" | "video" | "audio";

export type AssignmentMediaItem = {
  id: string;
  kind: MediaKind;
  mime: string;
};

export type AssignmentLinkItem = {
  id: string;
  title: string;
  url: string;
};

export type TeacherAssignmentDetail = {
  id: string;
  title: string;
  instructions: string;
  status: AssignmentStatus;
  archivedAt: Date | null;
  deadline: Date | null;
  createdAt: Date;
  links: AssignmentLinkItem[];
  media: AssignmentMediaItem[];
  responseKind: ResponseKind | null;
  parent: { id: string; title: string } | null;
  feedback: LinkedAssignment[];
  questions: { id: string; prompt: string }[];
  students: {
    id: string;
    name: string;
    returnedAt: Date | null;
    reviewedAt: Date | null;
    late: boolean;
    answers: { questionId: string; prompt: string; body: string }[];
    response: StoredResponse | null;
  }[];
};

export type StudentAssignmentDetail = {
  id: string;
  title: string;
  instructions: string;
  deadline: Date | null;
  links: AssignmentLinkItem[];
  media: AssignmentMediaItem[];
  responseKind: ResponseKind | null;
  parent: { id: string; title: string } | null;
  feedback: LinkedAssignment[];
  questions: { id: string; prompt: string; answer: string }[];
  response: StoredResponse;
  hasDraft: boolean;
  returnedAt: Date | null;
  reviewedAt: Date | null;
  archivedAt: Date | null;
  late: boolean;
};
