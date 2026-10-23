-- =====================================================================
-- CURADOC AI CLINICAL DATA LAYER SCHEMA
-- Version: 001_initial_schema.sql
-- Target: PostgreSQL 14+ / ANSI SQL Compatible
-- Specification: HIPAA-compliant auditability, ACID integrity, 
--                relational constraints, and clinical revisions
-- =====================================================================

-- 1. EXTENSIONS (PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS, ROLES & SESSIONS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('doctor', 'nurse', 'admin', 'scribe')),
    department VARCHAR(100) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    badge_number VARCHAR(50) NOT NULL UNIQUE,
    can_approve_ai BOOLEAN NOT NULL DEFAULT FALSE,
    can_prescribe BOOLEAN NOT NULL DEFAULT FALSE,
    can_export_ehr BOOLEAN NOT NULL DEFAULT FALSE,
    can_manage_staff BOOLEAN NOT NULL DEFAULT FALSE,
    can_view_audit_log BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 3. PATIENTS (Demographics & Medical Record Numbers)
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mrn VARCHAR(64) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    birth_date DATE,
    age_years INT NOT NULL CHECK (age_years >= 0 AND age_years <= 130),
    gender VARCHAR(32) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other', 'Unknown')),
    blood_type VARCHAR(10),
    primary_language VARCHAR(50) DEFAULT 'en',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(mrn);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name);

-- 4. CLINICAL ENCOUNTERS
CREATE TABLE IF NOT EXISTS encounters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    encounter_date DATE NOT NULL DEFAULT CURRENT_DATE,
    chief_complaint TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'signed', 'amended', 'archived')),
    specialty VARCHAR(100) DEFAULT 'General Medicine',
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    synced_to_ehr BOOLEAN NOT NULL DEFAULT FALSE,
    ehr_sync_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_date ON encounters(encounter_date);
CREATE INDEX IF NOT EXISTS idx_encounters_status ON encounters(status);

-- 5. SOAP CLINICAL NOTES
CREATE TABLE IF NOT EXISTS soap_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID NOT NULL UNIQUE REFERENCES encounters(id) ON DELETE CASCADE,
    subjective TEXT NOT NULL DEFAULT '',
    objective TEXT NOT NULL DEFAULT '',
    assessment TEXT NOT NULL DEFAULT '',
    plan TEXT NOT NULL DEFAULT '',
    version INT NOT NULL DEFAULT 1,
    signed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    signed_at TIMESTAMPTZ,
    doctor_attestation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_soap_notes_encounter ON soap_notes(encounter_id);

-- 6. SOAP NOTE HISTORICAL REVISIONS (Auditability & Versioning)
CREATE TABLE IF NOT EXISTS soap_note_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    soap_note_id UUID NOT NULL REFERENCES soap_notes(id) ON DELETE CASCADE,
    revision_number INT NOT NULL,
    subjective TEXT NOT NULL,
    objective TEXT NOT NULL,
    assessment TEXT NOT NULL,
    plan TEXT NOT NULL,
    modified_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    modified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    change_summary VARCHAR(500),
    CONSTRAINT uq_soap_revision UNIQUE (soap_note_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_soap_revisions_note_id ON soap_note_revisions(soap_note_id);

-- 7. VITALS SIGNS RECORDS
CREATE TABLE IF NOT EXISTS vitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    blood_pressure_raw VARCHAR(32),
    systolic_bp INT CHECK (systolic_bp IS NULL OR (systolic_bp > 30 AND systolic_bp < 320)),
    diastolic_bp INT CHECK (diastolic_bp IS NULL OR (diastolic_bp > 20 AND diastolic_bp < 220)),
    heart_rate_bpm INT CHECK (heart_rate_bpm IS NULL OR (heart_rate_bpm >= 20 AND heart_rate_bpm <= 300)),
    respiratory_rate_bpm INT CHECK (respiratory_rate_bpm IS NULL OR (respiratory_rate_bpm >= 4 AND respiratory_rate_bpm <= 80)),
    temperature_raw VARCHAR(32),
    temperature_celsius NUMERIC(4, 1) CHECK (temperature_celsius IS NULL OR (temperature_celsius >= 25.0 AND temperature_celsius <= 45.0)),
    spo2_percent INT CHECK (spo2_percent IS NULL OR (spo2_percent >= 40 AND spo2_percent <= 100)),
    weight_kg NUMERIC(5, 2) CHECK (weight_kg IS NULL OR (weight_kg > 0.5 AND weight_kg < 500.0)),
    height_cm NUMERIC(5, 1) CHECK (height_cm IS NULL OR (height_cm > 20.0 AND height_cm < 260.0)),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vitals_encounter_id ON vitals(encounter_id);

-- 8. PATIENT ALLERGIES
CREATE TABLE IF NOT EXISTS allergies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    allergen VARCHAR(255) NOT NULL,
    reaction_symptoms VARCHAR(255),
    severity VARCHAR(32) NOT NULL DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'severe', 'anaphylaxis')),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_allergies_patient_id ON allergies(patient_id);

-- 9. ACTIVE & HISTORICAL MEDICATIONS
CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    route VARCHAR(50),
    frequency VARCHAR(100),
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'discontinued', 'completed', 'held')),
    rxcui VARCHAR(32),
    start_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_medications_encounter_id ON medications(encounter_id);

-- 10. LABORATORY RESULTS
CREATE TABLE IF NOT EXISTS laboratory_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    panel VARCHAR(64) NOT NULL,
    test_name VARCHAR(128) NOT NULL,
    raw_value VARCHAR(64) NOT NULL,
    numeric_value NUMERIC(10, 3),
    unit VARCHAR(32) NOT NULL,
    reference_range VARCHAR(64) NOT NULL,
    flag VARCHAR(32) NOT NULL DEFAULT 'normal' CHECK (flag IN ('normal', 'low', 'high', 'critical')),
    status VARCHAR(32) NOT NULL DEFAULT 'resulted' CHECK (status IN ('ordered', 'pending', 'resulted', 'cancelled')),
    collected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_lab_results_encounter_id ON laboratory_results(encounter_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_flag ON laboratory_results(flag);

-- 11. PRESCRIPTION ORDERS (e-Prescribe)
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    route VARCHAR(50) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    quantity VARCHAR(50) NOT NULL,
    refills INT NOT NULL DEFAULT 0,
    indication VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'pending_erx' CHECK (status IN ('active', 'pending_erx', 'sent_erx', 'discontinued')),
    prescribed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    prescribed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    e_rx_confirmation_code VARCHAR(128)
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_encounter_id ON prescriptions(encounter_id);

-- 12. CLINICAL ATTACHMENTS (Imaging, ECG, Documents)
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    section VARCHAR(32) NOT NULL CHECK (section IN ('subjective', 'objective', 'assessment', 'plan')),
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(32) NOT NULL CHECK (file_type IN ('image', 'document')),
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes INT NOT NULL,
    storage_path VARCHAR(500),
    analysis_json JSONB,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attachments_encounter_id ON attachments(encounter_id);

-- 13. AI & RULES-BASED CLINICAL ANALYSES
CREATE TABLE IF NOT EXISTS clinical_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    analysis_payload JSONB NOT NULL,
    engine_type VARCHAR(64) NOT NULL CHECK (engine_type IN ('gemini-multimodal', 'gemini-flash', 'clinical-rules-engine', 'curated-fallback')),
    is_quota_fallback BOOLEAN NOT NULL DEFAULT FALSE,
    clinician_feedback VARCHAR(32) CHECK (clinician_feedback IS NULL OR clinician_feedback IN ('helpful', 'unhelpful', 'modified')),
    feedback_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analyses_encounter_id ON clinical_analyses(encounter_id);

-- 14. EVIDENCE SOURCES & CITATIONS (PubMed, Trials, Guidelines)
CREATE TABLE IF NOT EXISTS evidence_citations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type VARCHAR(64) NOT NULL CHECK (source_type IN ('pubmed', 'clinical_trial', 'guideline', 'fda_label', 'rxnorm')),
    pmid VARCHAR(32),
    doi VARCHAR(128),
    nct_id VARCHAR(32),
    rxcui VARCHAR(32),
    title TEXT NOT NULL,
    authors TEXT,
    journal VARCHAR(255),
    pub_date VARCHAR(64),
    evidence_level VARCHAR(64),
    citation_string TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_citations_pmid ON evidence_citations(pmid);
CREATE INDEX IF NOT EXISTS idx_citations_nct ON evidence_citations(nct_id);

-- 15. HIPAA TAMPER-EVIDENT AUDIT TRAIL
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(128) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    action VARCHAR(64) NOT NULL,
    patient_mrn VARCHAR(64),
    patient_name VARCHAR(255),
    details TEXT NOT NULL,
    station_id VARCHAR(100) NOT NULL DEFAULT 'WORKSTATION-MAIN',
    client_ip VARCHAR(64),
    record_hash VARCHAR(128)
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_patient_mrn ON audit_events(patient_mrn);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_events(action);

-- 16. OFFLINE SYNC BATCH LOG
CREATE TABLE IF NOT EXISTS offline_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_client_id VARCHAR(128) NOT NULL,
    records_count INT NOT NULL,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sync_status VARCHAR(32) NOT NULL DEFAULT 'success' CHECK (sync_status IN ('success', 'partial', 'failed')),
    error_summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_log_timestamp ON offline_sync_log(synced_at DESC);
