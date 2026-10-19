CREATE TYPE response_kind AS ENUM ('text', 'image', 'video');

ALTER TABLE assignments ADD COLUMN response_kind response_kind;

ALTER TABLE assignment_media
  ADD COLUMN student_id uuid REFERENCES users (id) ON DELETE CASCADE;

CREATE INDEX assignment_media_student_id_idx ON assignment_media (student_id);

CREATE TABLE assignment_responses (
  assignment_id uuid NOT NULL REFERENCES assignments (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  media_id uuid REFERENCES assignment_media (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (assignment_id, student_id)
);

CREATE INDEX assignment_responses_media_id_idx ON assignment_responses (media_id);
