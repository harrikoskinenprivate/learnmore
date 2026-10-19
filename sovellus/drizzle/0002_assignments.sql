CREATE TABLE assignments (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  instructions text NOT NULL,
  created_by uuid NOT NULL REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE assignment_links (
  id uuid PRIMARY KEY,
  assignment_id uuid NOT NULL REFERENCES assignments (id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  sort_order integer NOT NULL
);

CREATE INDEX assignment_links_assignment_id_idx ON assignment_links (assignment_id);

CREATE TABLE assignment_questions (
  id uuid PRIMARY KEY,
  assignment_id uuid NOT NULL REFERENCES assignments (id) ON DELETE CASCADE,
  prompt text NOT NULL,
  sort_order integer NOT NULL
);

CREATE INDEX assignment_questions_assignment_id_idx ON assignment_questions (assignment_id);

CREATE TABLE assignment_students (
  assignment_id uuid NOT NULL REFERENCES assignments (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  PRIMARY KEY (assignment_id, student_id)
);

CREATE INDEX assignment_students_student_id_idx ON assignment_students (student_id);

CREATE TABLE answers (
  id uuid PRIMARY KEY,
  assignment_id uuid NOT NULL REFERENCES assignments (id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES assignment_questions (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, question_id)
);

CREATE INDEX answers_assignment_student_idx ON answers (assignment_id, student_id);
