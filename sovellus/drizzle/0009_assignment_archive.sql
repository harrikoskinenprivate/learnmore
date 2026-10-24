ALTER TABLE assignments
  ADD COLUMN archived_at timestamptz;

CREATE INDEX assignments_archived_at_idx
  ON assignments (archived_at DESC, id DESC)
  WHERE archived_at IS NOT NULL;
