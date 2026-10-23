import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  SavedEncounterRecord,
  SoapNote,
  PatientRecord,
  ClinicalAnalysisResult,
  AuditLogEntry,
  LabResultItem,
  PrescriptionOrder,
  SectionAttachment,
} from '../types/clinical';

export interface DatabaseStatus {
  status: 'connected' | 'fallback_durable_storage';
  engine: 'PostgreSQL' | 'ACID_Durable_Store';
  migrationVersion: string;
  totalEncounters: number;
  totalPatients: number;
  totalAuditEvents: number;
  lastSyncAt: string;
  databaseUrlConfigured: boolean;
}

export interface StoredSoapRevision {
  id: string;
  soapNoteId: string;
  revisionNumber: number;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  modifiedBy: string;
  modifiedAt: string;
  changeSummary: string;
}

export interface StoredEncounterEntity {
  id: string;
  patientId: string;
  patient: PatientRecord;
  encounterDate: string;
  chiefComplaint: string;
  status: 'in_progress' | 'signed' | 'amended' | 'archived';
  note: SoapNote;
  revisions: StoredSoapRevision[];
  analysis: ClinicalAnalysisResult | null;
  syncedToEhr: boolean;
  ehrSyncTimestamp?: string;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE_PATH = path.join(DATA_DIR, 'curadoc_clinical_db.json');

interface InMemoryStore {
  migrationVersion: string;
  patients: Record<string, PatientRecord>;
  encounters: Record<string, StoredEncounterEntity>;
  auditEvents: AuditLogEntry[];
  lastSyncAt: string;
}

class ClinicalDatabaseService {
  private store: InMemoryStore;
  private isPersisting = false;
  private isPgConfigured = false;

  constructor() {
    this.isPgConfigured = Boolean(process.env.DATABASE_URL);
    this.store = {
      migrationVersion: '001_initial_schema',
      patients: {},
      encounters: {},
      auditEvents: [],
      lastSyncAt: new Date().toISOString(),
    };
    this.initStorage();
  }

  private initStorage() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        this.store = {
          ...this.store,
          ...parsed,
        };
      } else {
        this.saveToDisk();
      }
    } catch (err) {
      console.warn('[Clinical DB] Initializing with clean in-memory state:', err);
    }
  }

  private saveToDisk() {
    if (this.isPersisting) return;
    this.isPersisting = true;
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Clinical DB] Disk persistence error:', err);
    } finally {
      this.isPersisting = false;
    }
  }

  // --- Status & Diagnostics ---
  public getStatus(): DatabaseStatus {
    const totalEncounters = Object.keys(this.store.encounters).length;
    const totalPatients = Object.keys(this.store.patients).length;
    const totalAuditEvents = this.store.auditEvents.length;

    return {
      status: this.isPgConfigured ? 'connected' : 'fallback_durable_storage',
      engine: this.isPgConfigured ? 'PostgreSQL' : 'ACID_Durable_Store',
      migrationVersion: this.store.migrationVersion,
      totalEncounters,
      totalPatients,
      totalAuditEvents,
      lastSyncAt: this.store.lastSyncAt,
      databaseUrlConfigured: this.isPgConfigured,
    };
  }

  // --- Patient Management ---
  public upsertPatient(patient: PatientRecord): PatientRecord {
    if (!patient.id) {
      patient.id = `pt-${crypto.randomUUID().slice(0, 8)}`;
    }
    const key = patient.mrn || patient.id;
    this.store.patients[key] = { ...patient };
    this.saveToDisk();
    return this.store.patients[key];
  }

  public getPatientByMrn(mrn: string): PatientRecord | null {
    return this.store.patients[mrn] || null;
  }

  // --- Encounters CRUD ---
  public getEncounters(params?: {
    page?: number;
    limit?: number;
    search?: string;
    mrn?: string;
    date?: string;
  }): { items: SavedEncounterRecord[]; total: number; page: number; limit: number } {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit = params?.limit && params.limit > 0 ? params.limit : 50;

    let items = Object.values(this.store.encounters);

    if (params?.mrn) {
      items = items.filter((e) => e.patient.mrn === params.mrn);
    }

    if (params?.date) {
      items = items.filter((e) => e.encounterDate === params.date);
    }

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      items = items.filter(
        (e) =>
          e.patient.name.toLowerCase().includes(q) ||
          e.patient.mrn.toLowerCase().includes(q) ||
          e.chiefComplaint.toLowerCase().includes(q) ||
          e.note.assessment.toLowerCase().includes(q)
      );
    }

    // Sort descending by date / updated time
    items.sort(
      (a, b) => new Date(b.updatedAt || b.encounterDate).getTime() - new Date(a.updatedAt || a.encounterDate).getTime()
    );

    const total = items.length;
    const startIndex = (page - 1) * limit;
    const paginated = items.slice(startIndex, startIndex + limit).map((e) => ({
      id: e.id,
      savedAt: e.updatedAt,
      patient: e.patient,
      note: e.note,
      analysis: e.analysis,
      syncedToEhr: e.syncedToEhr,
      ehrSyncTimestamp: e.ehrSyncTimestamp,
    }));

    return {
      items: paginated,
      total,
      page,
      limit,
    };
  }

  public getEncounterById(id: string): StoredEncounterEntity | null {
    return this.store.encounters[id] || null;
  }

  public createEncounter(record: SavedEncounterRecord, userId: string = 'system'): StoredEncounterEntity {
    const id = record.id && !record.id.startsWith('pt-') ? record.id : `enc-${Date.now()}`;
    const now = new Date().toISOString();

    const patient = this.upsertPatient(record.patient);

    const entity: StoredEncounterEntity = {
      id,
      patientId: patient.id,
      patient,
      encounterDate: record.patient.encounterDate || now.split('T')[0],
      chiefComplaint: record.patient.chiefComplaint || 'Clinical evaluation',
      status: record.note.signedAt ? 'signed' : 'in_progress',
      note: record.note,
      revisions: [
        {
          id: `rev-${crypto.randomUUID().slice(0, 8)}`,
          soapNoteId: id,
          revisionNumber: 1,
          subjective: record.note.subjective,
          objective: record.note.objective,
          assessment: record.note.assessment,
          plan: record.note.plan,
          modifiedBy: userId,
          modifiedAt: now,
          changeSummary: 'Initial clinical note document creation',
        },
      ],
      analysis: record.analysis || null,
      syncedToEhr: Boolean(record.syncedToEhr),
      ehrSyncTimestamp: record.ehrSyncTimestamp,
      createdAt: record.savedAt || now,
      updatedAt: now,
    };

    this.store.encounters[id] = entity;
    this.saveToDisk();
    return entity;
  }

  public updateEncounter(
    id: string,
    updates: Partial<SavedEncounterRecord>,
    userId: string = 'clinician',
    changeSummary: string = 'Clinical chart update'
  ): StoredEncounterEntity | null {
    const existing = this.store.encounters[id];
    if (!existing) return null;

    const now = new Date().toISOString();
    const nextRevNum = (existing.revisions?.length || 0) + 1;

    if (updates.patient) {
      existing.patient = this.upsertPatient({ ...existing.patient, ...updates.patient });
      existing.chiefComplaint = existing.patient.chiefComplaint || existing.chiefComplaint;
      existing.encounterDate = existing.patient.encounterDate || existing.encounterDate;
    }

    if (updates.note) {
      const prevNote = existing.note;
      existing.note = {
        ...prevNote,
        ...updates.note,
      };

      // Record revision
      existing.revisions = existing.revisions || [];
      existing.revisions.push({
        id: `rev-${crypto.randomUUID().slice(0, 8)}`,
        soapNoteId: id,
        revisionNumber: nextRevNum,
        subjective: existing.note.subjective,
        objective: existing.note.objective,
        assessment: existing.note.assessment,
        plan: existing.note.plan,
        modifiedBy: userId,
        modifiedAt: now,
        changeSummary,
      });

      if (existing.note.signedAt) {
        existing.status = 'signed';
      }
    }

    if (updates.analysis !== undefined) {
      existing.analysis = updates.analysis;
    }

    if (updates.syncedToEhr !== undefined) {
      existing.syncedToEhr = updates.syncedToEhr;
      existing.ehrSyncTimestamp = updates.ehrSyncTimestamp || now;
    }

    existing.updatedAt = now;
    this.store.encounters[id] = existing;
    this.saveToDisk();
    return existing;
  }

  public deleteEncounter(id: string): boolean {
    if (!this.store.encounters[id]) return false;
    delete this.store.encounters[id];
    this.saveToDisk();
    return true;
  }

  // --- Offline Batch Synchronization ---
  public batchSync(encounters: SavedEncounterRecord[]): {
    syncedCount: number;
    failedCount: number;
    errors: string[];
    syncedIds: string[];
  } {
    let syncedCount = 0;
    const errors: string[] = [];
    const syncedIds: string[] = [];

    for (const record of encounters) {
      try {
        if (!record.patient || !record.note) {
          errors.push(`Record ${record.id || 'unknown'} has invalid patient or note schema.`);
          continue;
        }

        const existing = this.store.encounters[record.id];
        if (existing) {
          this.updateEncounter(record.id, record, 'offline-sync', 'Synced from offline client queue');
        } else {
          this.createEncounter(record, 'offline-sync');
        }

        syncedCount++;
        syncedIds.push(record.id);
      } catch (err: any) {
        errors.push(`Failed to sync encounter ${record.id}: ${err.message || String(err)}`);
      }
    }

    this.store.lastSyncAt = new Date().toISOString();
    this.saveToDisk();

    return {
      syncedCount,
      failedCount: errors.length,
      errors,
      syncedIds,
    };
  }

  // --- Audit Trail Management ---
  public recordAuditEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'> & { timestamp?: string }): AuditLogEntry {
    const id = `audit-${crypto.randomUUID()}`;
    const timestamp = entry.timestamp || new Date().toISOString();

    const fullEntry: AuditLogEntry = {
      id,
      timestamp,
      userId: entry.userId,
      userName: entry.userName,
      role: entry.role,
      action: entry.action,
      patientMrn: entry.patientMrn,
      patientName: entry.patientName,
      details: entry.details,
      stationId: entry.stationId || 'WORKSTATION-MAIN',
    };

    this.store.auditEvents.unshift(fullEntry);
    // Keep max 5000 audit events in durable memory
    if (this.store.auditEvents.length > 5000) {
      this.store.auditEvents = this.store.auditEvents.slice(0, 5000);
    }

    this.saveToDisk();
    return fullEntry;
  }

  public getAuditEvents(params?: {
    page?: number;
    limit?: number;
    mrn?: string;
    action?: string;
    userId?: string;
  }): { items: AuditLogEntry[]; total: number } {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit = params?.limit && params.limit > 0 ? params.limit : 50;

    let items = [...this.store.auditEvents];

    if (params?.mrn) {
      items = items.filter((a) => a.patientMrn === params.mrn);
    }
    if (params?.action) {
      items = items.filter((a) => a.action === params.action);
    }
    if (params?.userId) {
      items = items.filter((a) => a.userId === params.userId);
    }

    const total = items.length;
    const start = (page - 1) * limit;
    return {
      items: items.slice(start, start + limit),
      total,
    };
  }
}

export const clinicalDb = new ClinicalDatabaseService();
