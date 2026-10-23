-- =====================================================================
-- CURADOC AI CLINICAL DATA LAYER ROLLBACK SCRIPT
-- Version: 001_rollback_schema.sql
-- Purpose: Safely rolls back 001_initial_schema.sql in reverse foreign key order
-- =====================================================================

DROP TABLE IF EXISTS offline_sync_log CASCADE;
DROP TABLE IF EXISTS audit_events CASCADE;
DROP TABLE IF EXISTS evidence_citations CASCADE;
DROP TABLE IF EXISTS clinical_analyses CASCADE;
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS laboratory_results CASCADE;
DROP TABLE IF EXISTS medications CASCADE;
DROP TABLE IF EXISTS allergies CASCADE;
DROP TABLE IF EXISTS vitals CASCADE;
DROP TABLE IF EXISTS soap_note_revisions CASCADE;
DROP TABLE IF EXISTS soap_notes CASCADE;
DROP TABLE IF EXISTS encounters CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
