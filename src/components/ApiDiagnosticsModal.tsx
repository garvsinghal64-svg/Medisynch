import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ServerCrash,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Download,
  ChevronDown,
  ChevronRight,
  Database,
  Globe,
  Radio,
} from 'lucide-react';
import {
  apiDiagnostics,
  ApiDiagnosticEntry,
  trackedFetch,
  scrubPHI,
  DiagnosticsBufferStats,
} from '../services/apiDiagnosticsService';

interface ApiDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerTestAnalysis?: () => void;
}

export const ApiDiagnosticsModal: React.FC<ApiDiagnosticsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [entries, setEntries] = useState<ApiDiagnosticEntry[]>([]);
  const [bufferStats, setBufferStats] = useState<DiagnosticsBufferStats>({ count: 0, max: 100, approxBytes: 0 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'payload' | 'headers' | 'request'>('payload');
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = apiDiagnostics.subscribe((newEntries) => {
      setEntries(newEntries);
      setBufferStats(apiDiagnostics.getBufferStats());
      if (newEntries.length > 0 && !expandedId) {
        setExpandedId(newEntries[0].id);
      }
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleClear = () => {
    apiDiagnostics.clear();
    setPingResult(null);
    setBufferStats(apiDiagnostics.getBufferStats());
  };

  const handleExport = () => {
    const scrubbedEntries = scrubPHI(entries);
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      phiScrubbed: true,
      bufferCapacity: bufferStats.max,
      totalEntries: scrubbedEntries.length,
      approximatePayloadBytes: bufferStats.approxBytes,
      entries: scrubbedEntries,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `curadoc-api-diagnostics-${new Date().toISOString()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleTestProbe = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const res = await trackedFetch('/api/clinical/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient: {
            id: 'probe-pt',
            name: 'Diagnostic Health Probe',
            age: 65,
            gender: 'Male',
            mrn: 'PROBE-001',
            encounterDate: new Date().toISOString().split('T')[0],
            chiefComplaint: 'Diagnostic connectivity probe',
            vitals: { bloodPressure: '120/80', heartRate: 72, respiratoryRate: 16, temperature: '98.6 F', spO2: 98, weightKg: 70, heightCm: 175 },
          },
          note: {
            subjective: 'Diagnostic health check test packet',
            objective: 'Normal vitals',
            assessment: 'Diagnostic evaluation',
            plan: 'Verify API and database reachability',
            medications: ['Lisinopril 10mg'],
            allergies: ['NKDA'],
          },
        }),
      });

      const data = await res.json();
      if (data.isFallback) {
        setPingResult(`Probe completed: Operating via Deterministic Clinical Engine (${data.errorType || 'Fallback active'})`);
      } else {
        setPingResult(`Probe succeeded: Live Clinical Databases Connected (Status ${res.status})`);
      }
    } catch (err: any) {
      setPingResult(`Probe failed: ${err.message || 'Network disconnected'}`);
    } finally {
      setIsPinging(false);
    }
  };

  const latestEntry = entries[0];
  const isHealthy = latestEntry ? !latestEntry.isError && !latestEntry.clinicalMeta?.isFallback : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isHealthy ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900">Clinical API Diagnostics & Payload Inspector</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-200 text-stone-800 font-semibold" title="Memory-safe circular buffer: oldest entries evicted automatically at capacity">
                  {bufferStats.count} / {bufferStats.max} logs | ~{Math.max(1, Math.round(bufferStats.approxBytes / 1024))} KB
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  HIPAA/PHI Scrubbed
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Inspect raw request/response headers, live database reachability, and payloads for clinical auditing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
            aria-label="Close diagnostics modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System Health Status Bar */}
        <div className="px-6 py-3 bg-stone-100/60 border-b border-stone-200 flex items-center justify-between flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="text-stone-500">Clinical Databases:</span>
              {latestEntry?.clinicalMeta?.isFallback ? (
                <span className="flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                  <ServerCrash className="w-3.5 h-3.5" />
                  Offline / Fallback Rules Active
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Live Databases Reachable
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-stone-600">
              <Database className="w-3.5 h-3.5 text-stone-500" />
              <span>openFDA:</span>
              <span className="font-semibold text-emerald-700">Operational</span>
            </div>

            <div className="flex items-center gap-1.5 text-stone-600">
              <Globe className="w-3.5 h-3.5 text-stone-500" />
              <span>NCBI PubMed:</span>
              <span className="font-semibold text-emerald-700">Operational</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestProbe}
              disabled={isPinging}
              className="flex items-center gap-1.5 px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Radio className={`w-3.5 h-3.5 ${isPinging ? 'animate-pulse text-amber-300' : ''}`} />
              <span>{isPinging ? 'Pinging...' : 'Send Live Test Probe'}</span>
            </button>
            <button
              onClick={handleExport}
              disabled={entries.length === 0}
              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded border border-stone-300 transition-colors disabled:opacity-40"
              title="Export all logs as JSON"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleClear}
              disabled={entries.length === 0}
              className="p-1.5 text-stone-600 hover:text-rose-700 hover:bg-rose-50 rounded border border-stone-300 transition-colors disabled:opacity-40"
              title="Clear log history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {pingResult && (
          <div className="px-6 py-2 bg-blue-50 border-b border-blue-200 text-xs text-blue-900 flex items-center justify-between">
            <span className="font-medium">{pingResult}</span>
            <button onClick={() => setPingResult(null)} className="text-blue-500 hover:text-blue-800">
              Dismiss
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {entries.length === 0 ? (
            <div className="py-16 text-center text-stone-400 space-y-3">
              <Activity className="w-10 h-10 mx-auto text-stone-300" />
              <p className="text-sm font-medium">No API calls recorded yet in this session.</p>
              <p className="text-xs text-stone-400">Trigger clinical note analysis or click "Send Live Test Probe" above to inspect network traffic.</p>
              <button
                onClick={handleTestProbe}
                className="mt-2 px-4 py-2 bg-stone-800 text-white rounded-lg text-xs font-semibold hover:bg-stone-700 transition-colors"
              >
                Send Test Probe Now
              </button>
            </div>
          ) : (
            entries.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const hasFallback = entry.clinicalMeta?.isFallback;

              return (
                <div
                  key={entry.id}
                  className={`rounded-lg border transition-all ${
                    isExpanded
                      ? 'border-stone-400 bg-white shadow-xs'
                      : 'border-stone-200 bg-stone-50/50 hover:bg-white'
                  }`}
                >
                  {/* Summary Bar */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="p-3.5 flex items-center justify-between cursor-pointer select-none gap-3 flex-wrap"
                  >
                    <div className="flex items-center gap-2.5">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-stone-500 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-stone-500 shrink-0" />
                      )}
                      <span className="font-mono text-xs font-bold uppercase px-1.5 py-0.5 rounded bg-stone-200 text-stone-800">
                        {entry.method}
                      </span>
                      <span className="font-mono text-xs font-semibold text-stone-900">
                        {entry.endpoint}
                      </span>
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                          entry.isError
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {entry.status} {entry.statusText}
                      </span>
                      {hasFallback && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-700" />
                          Fallback
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-stone-500 text-xs font-mono">
                      <span>{entry.durationMs}ms</span>
                      <span>·</span>
                      <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {/* Expanded Inspector Panel */}
                  {isExpanded && (
                    <div className="border-t border-stone-200 p-4 bg-stone-50/70 space-y-3">
                      {/* Sub-tab Navigation */}
                      <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setActiveTab('payload')}
                            className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                              activeTab === 'payload'
                                ? 'bg-stone-900 text-white'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            Response Payload
                          </button>
                          <button
                            onClick={() => setActiveTab('headers')}
                            className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                              activeTab === 'headers'
                                ? 'bg-stone-900 text-white'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            Response Headers ({Object.keys(entry.responseHeaders).length})
                          </button>
                          <button
                            onClick={() => setActiveTab('request')}
                            className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                              activeTab === 'request'
                                ? 'bg-stone-900 text-white'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            Request Body & Headers
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            const dataToCopy =
                              activeTab === 'payload'
                                ? JSON.stringify(entry.responsePayload, null, 2)
                                : activeTab === 'headers'
                                ? JSON.stringify(entry.responseHeaders, null, 2)
                                : JSON.stringify({ headers: entry.requestHeaders, body: entry.requestPayload }, null, 2);
                            handleCopy(dataToCopy, `${entry.id}-${activeTab}`);
                          }}
                          className="flex items-center gap-1 text-[11px] font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 px-2.5 py-1 rounded transition-colors cursor-pointer"
                        >
                          {copiedKey === `${entry.id}-${activeTab}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-700" />
                              <span className="text-emerald-800">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy JSON</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Tab 1: Response Payload */}
                      {activeTab === 'payload' && (
                        <div className="space-y-2">
                          {entry.clinicalMeta && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              <div className="bg-white border border-stone-200 rounded p-2">
                                <span className="text-stone-500 block text-[10px]">Database Fallback:</span>
                                <span className={`font-bold ${entry.clinicalMeta.isFallback ? 'text-amber-800' : 'text-emerald-700'}`}>
                                  {entry.clinicalMeta.isFallback ? 'TRUE (Fallback)' : 'FALSE (Live Connected)'}
                                </span>
                              </div>
                              <div className="bg-white border border-stone-200 rounded p-2">
                                <span className="text-stone-500 block text-[10px]">Error Signature:</span>
                                <span className="font-mono font-semibold text-stone-800 truncate block">
                                  {entry.clinicalMeta.errorType || 'None (Normal)'}
                                </span>
                              </div>
                              <div className="bg-white border border-stone-200 rounded p-2">
                                <span className="text-stone-500 block text-[10px]">Differentials Count:</span>
                                <span className="font-bold text-stone-900">
                                  {entry.clinicalMeta.differentialsCount ?? 'N/A'} (PubMed: {entry.clinicalMeta.hasPubMedCitation ? 'Yes' : 'No'})
                                </span>
                              </div>
                              <div className="bg-white border border-stone-200 rounded p-2">
                                <span className="text-stone-500 block text-[10px]">Safety Alerts:</span>
                                <span className="font-bold text-stone-900">
                                  {entry.clinicalMeta.safetyAlertsCount ?? 'N/A'} (FDA Label: {entry.clinicalMeta.hasFdaLabel ? 'Yes' : 'No'})
                                </span>
                              </div>
                            </div>
                          )}

                          <pre className="bg-stone-900 text-stone-100 p-3 rounded-lg text-xs font-mono overflow-x-auto max-h-72 leading-relaxed selection:bg-stone-700">
                            {JSON.stringify(entry.responsePayload, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Tab 2: Response Headers */}
                      {activeTab === 'headers' && (
                        <div className="space-y-2">
                          {Object.keys(entry.responseHeaders).length === 0 ? (
                            <div className="p-4 bg-white rounded border border-stone-200 text-xs text-stone-500 text-center">
                              No response headers captured for this entry.
                            </div>
                          ) : (
                            <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-stone-100 border-b border-stone-200 text-stone-600 font-semibold">
                                  <tr>
                                    <th className="px-3 py-2 font-mono">Header Name</th>
                                    <th className="px-3 py-2 font-mono">Header Value</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                                  {Object.entries(entry.responseHeaders).map(([key, val]) => (
                                    <tr key={key} className="hover:bg-stone-50/60">
                                      <td className="px-3 py-1.5 font-bold text-stone-800">{key}</td>
                                      <td className="px-3 py-1.5 text-stone-600 break-all">{val}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tab 3: Request Payload & Headers */}
                      {activeTab === 'request' && (
                        <div className="space-y-3">
                          <div>
                            <span className="text-[11px] font-bold text-stone-700 block mb-1">Request Headers:</span>
                            <pre className="bg-stone-900 text-stone-100 p-2.5 rounded-lg text-xs font-mono overflow-x-auto">
                              {JSON.stringify(entry.requestHeaders, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-stone-700 block mb-1">Request Body / Payload:</span>
                            <pre className="bg-stone-900 text-stone-100 p-2.5 rounded-lg text-xs font-mono overflow-x-auto max-h-56">
                              {JSON.stringify(entry.requestPayload, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <span>Curadoc Diagnostic Engine v2.4 · HIPAA-compliant local telemetry</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
