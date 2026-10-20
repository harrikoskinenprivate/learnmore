ALTER TABLE assignments
  ADD COLUMN parent_assignment_id uuid REFERENCES assignments (id) ON DELETE CASCADE;

CREATE INDEX assignments_parent_assignment_id_idx ON assignments (parent_assignment_id);
