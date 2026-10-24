import { sql } from "drizzle-orm";
import {
  index,
  type AnyPgColumn,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["teacher", "student"]);
export const assignmentStatus = pgEnum("assignment_status", ["draft", "published"]);
export const responseKind = pgEnum("response_kind", ["text", "image", "video", "audio"]);
export const mediaKind = pgEnum("media_kind", ["image", "video", "audio"]);
export const mediaStatus = pgEnum("media_status", ["pending", "ready"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const studentAccessKeys = pgTable("student_access_keys", {
  studentId: uuid("student_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const learningCards = pgTable("learning_cards", {
  studentId: uuid("student_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  level: text("level").notNull().default(""),
  strengths: text("strengths").notNull().default(""),
  developmentAreas: text("development_areas").notNull().default(""),
  goals: text("goals").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assignments = pgTable("assignments", {
  id: uuid("id").primaryKey(),
  title: text("title").notNull(),
  instructions: text("instructions").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  status: assignmentStatus("status").notNull().default("draft"),
  responseKind: responseKind("response_kind"),
  parentAssignmentId: uuid("parent_assignment_id").references((): AnyPgColumn => assignments.id, {
    onDelete: "cascade",
  }),
  deadline: timestamp("deadline", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("assignments_parent_assignment_id_idx").on(table.parentAssignmentId),
  index("assignments_archived_at_idx")
    .on(table.archivedAt, table.id)
    .where(sql`${table.archivedAt} IS NOT NULL`),
]);

export const assignmentLinks = pgTable(
  "assignment_links",
  {
    id: uuid("id").primaryKey(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    url: text("url").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    index("assignment_links_assignment_id_idx").on(table.assignmentId),
  ],
);

export const assignmentQuestions = pgTable(
  "assignment_questions",
  {
    id: uuid("id").primaryKey(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    index("assignment_questions_assignment_id_idx").on(table.assignmentId),
  ],
);

export const assignmentStudents = pgTable(
  "assignment_students",
  {
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.assignmentId, table.studentId] }),
    index("assignment_students_student_id_idx").on(table.studentId),
  ],
);

export const assignmentMedia = pgTable(
  "assignment_media",
  {
    id: uuid("id").primaryKey(),
    assignmentId: uuid("assignment_id").references(() => assignments.id, {
      onDelete: "cascade",
    }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    studentId: uuid("student_id").references(() => users.id, { onDelete: "cascade" }),
    kind: mediaKind("kind").notNull(),
    status: mediaStatus("status").notNull().default("pending"),
    objectKey: text("object_key").notNull().unique(),
    mime: text("mime").notNull(),
    byteSize: integer("byte_size").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("assignment_media_assignment_id_idx").on(table.assignmentId),
    index("assignment_media_created_by_idx").on(table.createdBy),
    index("assignment_media_student_id_idx").on(table.studentId),
  ],
);

export const assignmentResponses = pgTable(
  "assignment_responses",
  {
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull().default(""),
    mediaId: uuid("media_id").references(() => assignmentMedia.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.assignmentId, table.studentId] }),
    index("assignment_responses_media_id_idx").on(table.mediaId),
  ],
);

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").primaryKey(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => assignmentQuestions.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("answers_student_question_unique").on(table.studentId, table.questionId),
    index("answers_assignment_student_idx").on(table.assignmentId, table.studentId),
  ],
);
