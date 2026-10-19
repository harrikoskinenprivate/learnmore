CREATE TABLE student_access_keys (
  student_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  key_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
