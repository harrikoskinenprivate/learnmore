CREATE TYPE media_kind AS ENUM ('image', 'video');
CREATE TYPE media_status AS ENUM ('pending', 'ready');

CREATE TABLE assignment_media (
  id uuid PRIMARY KEY,
  assignment_id uuid REFERENCES assignments (id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users (id),
  kind media_kind NOT NULL,
  status media_status NOT NULL DEFAULT 'pending',
  object_key text NOT NULL UNIQUE,
  mime text NOT NULL,
  byte_size integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX assignment_media_assignment_id_idx ON assignment_media (assignment_id);
CREATE INDEX assignment_media_created_by_idx ON assignment_media (created_by);
