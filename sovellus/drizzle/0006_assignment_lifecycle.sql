CREATE TYPE assignment_status AS ENUM ('draft', 'published');

ALTER TABLE assignments
  ADD COLUMN status assignment_status NOT NULL DEFAULT 'published';

ALTER TABLE assignments
  ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE assignments
  ADD COLUMN deadline timestamptz;

ALTER TABLE assignment_students
  ADD COLUMN returned_at timestamptz,
  ADD COLUMN reviewed_at timestamptz;
