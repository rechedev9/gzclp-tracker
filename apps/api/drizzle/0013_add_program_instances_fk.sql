ALTER TABLE "program_instances"
  ADD CONSTRAINT "program_instances_program_id_fk"
  FOREIGN KEY ("program_id")
  REFERENCES "program_templates"("id")
  ON DELETE RESTRICT;
