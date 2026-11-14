ALTER TABLE assignments ADD COLUMN free_files boolean NOT NULL DEFAULT false;
ALTER TABLE assignments ADD COLUMN task_pdf_id uuid REFERENCES assignment_media(id) ON DELETE SET NULL;
CREATE INDEX assignments_task_pdf_id_idx ON assignments (task_pdf_id);
