import { SavedEncounterRecord } from '../types/clinical';

const OFFLINE_QUEUE_KEY = 'curadoc_offline_sync_queue_v1';
const SIMULATED_OFFLINE_KEY = 'curadoc_simulated_offline_override';

export function isOfflineMode(): boolean {
  if (typeof window === 'undefined') return false;
  // Check simulated toggle first
  const simulated = localStorage.getItem(SIMULATED_OFFLINE_KEY);
  if (simulated === 'true') return true;
  return !navigator.onLine;
}

export function setSimulatedOffline(offline: boolean): void {
  if (typeof window === 'undefined') return;
  if (offline) {
    localStorage.setItem(SIMULATED_OFFLINE_KEY, 'true');
  } else {
    localStorage.removeItem(SIMULATED_OFFLINE_KEY);
  }
}

export function getOfflineQueue(): SavedEncounterRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueEncounterForSync(encounter: SavedEncounterRecord): void {
  try {
    const queue = getOfflineQueue();
    const existingIndex = queue.findIndex((e) => e.id === encounter.id);
    let updated: SavedEncounterRecord[];
    if (existingIndex >= 0) {
      updated = [...queue];
      updated[existingIndex] = encounter;
    } else {
      updated = [encounter, ...queue];
    }
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to queue offline encounter', err);
  }
}

export function clearOfflineQueue(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

export async function flushOfflineQueue(): Promise<{ syncedCount: number; errors?: string[] }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { syncedCount: 0 };

  try {
    const res = await fetch('/api/sync/offline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queue }),
    });

    if (!res.ok) {
      throw new Error(`Server sync failed with HTTP status ${res.status}`);
    }

    const data = await res.json();
    // Successfully synced to database
    clearOfflineQueue();
    return {
      syncedCount: data.syncedCount ?? queue.length,
      errors: data.errors,
    };
  } catch (err: any) {
    console.warn('Real offline sync queue flush encountered network error, preserving local queue:', err);
    return {
      syncedCount: 0,
      errors: [err.message || 'Network unavailable or server unreachable. Local offline queue retained.'],
    };
  }
}

