export interface ApiDiagnosticEntry {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  status: number | string;
  statusText: string;
  durationMs: number;
  requestHeaders: Record<string, string>;
  requestPayload: any;
  responseHeaders: Record<string, string>;
  responsePayload: any;
  isError: boolean;
  clinicalMeta?: {
    isFallback?: boolean;
    errorType?: string;
    differentialsCount?: number;
    safetyAlertsCount?: number;
    hasPubMedCitation?: boolean;
    hasFdaLabel?: boolean;
    phiScrubbed?: boolean;
  };
}

export interface DiagnosticsBufferStats {
  count: number;
  max: number;
  approxBytes: number;
}

// -----------------------------------------------------------------------------
// AUTOMATIC HIPAA/PHI SANITIZER (SSN, MRN, PHONE, EMAIL, DOB, PATIENT KEYS)
// -----------------------------------------------------------------------------
const PHI_KEY_NAMES = new Set([
  'patientname',
  'fullname',
  'firstname',
  'lastname',
  'mrn',
  'ssn',
  'dob',
  'phone',
  'phonenumber',
  'email',
  'emailaddress',
]);

/**
 * Deeply scrubs Protected Health Information (PHI) and PII from payloads
 * before diagnostic storage, transmission, or export.
 */
export function scrubPHI<T = any>(payload: T): T {
  if (payload === null || payload === undefined) {
    return payload;
  }

  if (typeof payload === 'string') {
    let scrubbed: string = payload;
    // 1. Social Security Numbers (e.g., 000-00-0000)
    scrubbed = scrubbed.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED-SSN]');
    // 2. Medical Record Numbers (MRN-12345 or MRN: 12345)
    scrubbed = scrubbed.replace(/\b(?:MRN|Medical Record)[:\s#-]*[A-Z0-9-]{5,12}\b/gi, '[REDACTED-MRN]');
    // 3. Date of Birth (DOB: 12/31/1980 or Date of Birth: 1980-05-12)
    scrubbed = scrubbed.replace(/\b(?:DOB|Date of Birth)[:\s]*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi, 'DOB: [REDACTED-DOB]');
    // 4. Phone Numbers (US format standard variations)
    scrubbed = scrubbed.replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED-PHONE]');
    // 5. Emails
    scrubbed = scrubbed.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED-EMAIL]');
    return scrubbed as any;
  }

  if (typeof payload === 'number' || typeof payload === 'boolean') {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => scrubPHI(item)) as any;
  }

  if (typeof payload === 'object') {
    const result: Record<string, any> = {};
    for (const [rawKey, val] of Object.entries(payload as Record<string, any>)) {
      const lowerKey = rawKey.toLowerCase().replace(/[-_]/g, '');

      if (['patientname', 'fullname', 'firstname', 'lastname'].includes(lowerKey)) {
        result[rawKey] = '[REDACTED-PHI]';
      } else if (['apikey', 'geminikey', 'authorization', 'secret', 'token', 'bearer', 'password', 'xapikey'].includes(lowerKey)) {
        result[rawKey] = '[REDACTED-SECRET-KEY]';
      } else if (lowerKey === 'mrn') {
        result[rawKey] = '[REDACTED-MRN]';
      } else if (lowerKey === 'ssn') {
        result[rawKey] = '[REDACTED-SSN]';
      } else if (lowerKey === 'dob') {
        result[rawKey] = '[REDACTED-DOB]';
      } else if (lowerKey === 'phone' || lowerKey === 'phonenumber') {
        result[rawKey] = '[REDACTED-PHONE]';
      } else if (lowerKey === 'email' || lowerKey === 'emailaddress') {
        result[rawKey] = '[REDACTED-EMAIL]';
      } else {
        result[rawKey] = scrubPHI(val);
      }
    }
    return result as any;
  }

  return payload;
}

// -----------------------------------------------------------------------------
// MEMORY-SAFE RING BUFFER (CAP = 100, FIFO CIRCULAR BUFFER)
// -----------------------------------------------------------------------------
class ApiDiagnosticsManager {
  private entries: ApiDiagnosticEntry[] = [];
  private listeners: Set<(entries: ApiDiagnosticEntry[]) => void> = new Set();
  public readonly MAX_LOGS = 100;

  public getEntries(): ApiDiagnosticEntry[] {
    return [...this.entries];
  }

  public getBufferStats(): DiagnosticsBufferStats {
    let approxBytes = 0;
    try {
      approxBytes = JSON.stringify(this.entries).length;
    } catch {
      approxBytes = this.entries.length * 512;
    }
    return {
      count: this.entries.length,
      max: this.MAX_LOGS,
      approxBytes,
    };
  }

  public addEntry(entry: ApiDiagnosticEntry): void {
    // Sanitize any PHI before committing to in-memory ring buffer
    const sanitizedEntry: ApiDiagnosticEntry = {
      ...entry,
      requestPayload: scrubPHI(entry.requestPayload),
      responsePayload: scrubPHI(entry.responsePayload),
      requestHeaders: scrubPHI(entry.requestHeaders),
      responseHeaders: scrubPHI(entry.responseHeaders),
      clinicalMeta: {
        ...entry.clinicalMeta,
        phiScrubbed: true,
      },
    };

    // Unshift newest to index 0; evict oldest from tail if > MAX_LOGS (FIFO)
    this.entries.unshift(sanitizedEntry);
    while (this.entries.length > this.MAX_LOGS) {
      this.entries.pop();
    }
    this.notify();
  }

  public clear(): void {
    this.entries = [];
    this.notify();
  }

  public subscribe(listener: (entries: ApiDiagnosticEntry[]) => void): () => void {
    this.listeners.add(listener);
    listener([...this.entries]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const copy = [...this.entries];
    this.listeners.forEach((l) => l(copy));
  }
}

export const apiDiagnostics = new ApiDiagnosticsManager();

// Intercept and instrument fetch for automatic logging with PHI scrubbing
export async function trackedFetch(
  endpoint: string,
  options?: RequestInit
): Promise<Response> {
  const startTime = performance.now();
  const id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const method = options?.method || 'GET';
  const timestamp = new Date().toISOString();

  let requestPayload: any = null;
  if (options?.body) {
    try {
      requestPayload = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    } catch {
      requestPayload = options.body;
    }
  }

  const reqHeadersObj: Record<string, string> = {};
  if (options?.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((val, key) => {
        reqHeadersObj[key] = val;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([k, v]) => {
        reqHeadersObj[k] = v;
      });
    } else {
      Object.assign(reqHeadersObj, options.headers);
    }
  }

  try {
    const response = await fetch(endpoint, options);
    const durationMs = Math.round(performance.now() - startTime);

    // Extract response headers
    const resHeadersObj: Record<string, string> = {};
    response.headers.forEach((val, key) => {
      resHeadersObj[key] = val;
    });

    // Clone response to read body without consuming the original
    const cloned = response.clone();
    let responsePayload: any = null;
    try {
      const text = await cloned.text();
      try {
        responsePayload = JSON.parse(text);
      } catch {
        responsePayload = text;
      }
    } catch (readErr) {
      responsePayload = `[Unreadable body: ${String(readErr)}]`;
    }

    // Extract clinical meta if available
    const clinicalMeta: ApiDiagnosticEntry['clinicalMeta'] = { phiScrubbed: true };
    if (responsePayload && typeof responsePayload === 'object') {
      clinicalMeta.isFallback = responsePayload.isFallback;
      clinicalMeta.errorType = responsePayload.errorType;
      if (Array.isArray(responsePayload.differentials)) {
        clinicalMeta.differentialsCount = responsePayload.differentials.length;
        clinicalMeta.hasPubMedCitation = responsePayload.differentials.some(
          (d: any) => !!(d.pmid || d.sourceUrl)
        );
      }
      if (Array.isArray(responsePayload.safetyAlerts)) {
        clinicalMeta.safetyAlertsCount = responsePayload.safetyAlerts.length;
        clinicalMeta.hasFdaLabel = responsePayload.safetyAlerts.some((s: any) => !!s.sourceUrl);
      }
    }

    apiDiagnostics.addEntry({
      id,
      timestamp,
      endpoint,
      method,
      status: response.status,
      statusText: response.statusText || (response.ok ? 'OK' : 'Error'),
      durationMs,
      requestHeaders: reqHeadersObj,
      requestPayload,
      responseHeaders: resHeadersObj,
      responsePayload,
      isError: !response.ok,
      clinicalMeta,
    });

    return response;
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    const isAbort = err?.name === 'AbortError';
    const errMsg = String(err?.message || err || 'Network / Fetch Failure');

    apiDiagnostics.addEntry({
      id,
      timestamp,
      endpoint,
      method,
      status: isAbort ? 'TIMEOUT' : 'FAILED',
      statusText: errMsg,
      durationMs,
      requestHeaders: reqHeadersObj,
      requestPayload,
      responseHeaders: {},
      responsePayload: {
        attemptedUrl: endpoint,
        httpStatus: 'NETWORK_FAILURE',
        errorCategory: isAbort ? 'CLIENT_TIMEOUT' : 'NETWORK_FETCH_ERROR',
        message: errMsg,
      },
      isError: true,
      clinicalMeta: {
        isFallback: true,
        errorType: isAbort ? 'CLIENT_TIMEOUT' : 'CLIENT_NETWORK_DISCONNECTED',
        phiScrubbed: true,
      },
    });
    throw err;
  }
}
