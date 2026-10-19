CREATE TABLE learning_cards (
  student_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT '',
  strengths text NOT NULL DEFAULT '',
  development_areas text NOT NULL DEFAULT '',
  goals text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
