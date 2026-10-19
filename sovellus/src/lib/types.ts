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

export type ResponseKind = "text" | "image" | "video";

export type StoredResponse = {
  body: string;
  media: AssignmentMediaItem | null;
};

export type TeacherDraftListItem = {
  id: string;
  title: string;
  createdAt: Date;
  deadline: Date | null;
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
};

export type MediaKind = "image" | "video";

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
  deadline: Date | null;
  createdAt: Date;
  links: AssignmentLinkItem[];
  media: AssignmentMediaItem[];
  responseKind: ResponseKind | null;
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
  questions: { id: string; prompt: string; answer: string }[];
  response: StoredResponse;
  hasDraft: boolean;
  returnedAt: Date | null;
  reviewedAt: Date | null;
  late: boolean;
};
