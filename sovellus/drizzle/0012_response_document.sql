ALTER TYPE media_kind ADD VALUE IF NOT EXISTS 'file';
ALTER TABLE assignment_media ADD COLUMN file_name text;
ALTER TABLE assignment_responses ADD COLUMN document_id uuid REFERENCES assignment_media(id) ON DELETE SET NULL;
CREATE INDEX assignment_responses_document_id_idx ON assignment_responses (document_id);
