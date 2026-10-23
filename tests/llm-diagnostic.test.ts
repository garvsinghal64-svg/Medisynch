import { ClinicalEvaluationInput } from '../src/utils/clinicalHeuristics';
import {
  llmDiagnosticService,
  DIAGNOSTIC_SYSTEM_INSTRUCTION,
  buildClinicalDiagnosticPrompt,
  setUseMockLlm,
} from '../src/services/llmDiagnosticService';
import {
  getSystemStatusConfig,
  LOCAL_FALLBACK_TOOLTIP,
} from '../src/components/SystemStatusBadge';
import { getProvenanceTags } from '../src/components/ProvenanceBadge';
import {
  determineEvidenceStatus,
  resolveClinicalProvenance,
} from '../src/services/clinicalAnalysisService';

export interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

export async function runLlmDiagnosticTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: Complex edge-case ClinicalEvaluationInput in USE_MOCK_LLM=true mode
  try {
    process.env.USE_MOCK_LLM = 'true';
    setUseMockLlm(true);

    const complexEdgeCaseInput: ClinicalEvaluationInput = {
      noteText:
        '29yo female hiker from Connecticut presenting with 10 days of subacute neuropsychiatric changes, orofacial dyskinesias, autonomic instability, and prodromal low-grade fever after removing an engorged tick. Basic metabolic panel and CT head unremarkable.',
      medications: ['Levetiracetam 500mg BID', 'Aciclovir IV'],
      allergies: ['Sulfonamides'],
      vitals: {
        bp: '158/96',
        hr: 114,
        rr: 20,
        temp: 38.2,
        spo2: 97,
        weightKg: 62,
      },
    };

    const prompt = buildClinicalDiagnosticPrompt(complexEdgeCaseInput);
    const response = await llmDiagnosticService.generateDiagnosticSynthesis(
      complexEdgeCaseInput,
      { useMock: true, delayMs: 25 }
    );

    const hasSystemDisclaimer = DIAGNOSTIC_SYSTEM_INSTRUCTION.includes(
      'AI-generated diagnostic suggestions. Always correlate with clinical judgment.'
    );
    const hasPromptStructure =
      prompt.includes('BP: 158/96 mmHg') &&
      prompt.includes('Levetiracetam 500mg BID') &&
      prompt.includes('orofacial dyskinesias');

    const hasValidPrimary =
      typeof response.primaryDifferential === 'string' &&
      response.primaryDifferential.trim().length > 10;
    const hasValidSecondaries =
      Array.isArray(response.secondaryDifferentials) &&
      response.secondaryDifferentials.length >= 2 &&
      response.secondaryDifferentials.every((d) => typeof d === 'string' && d.trim().length > 0);
    const hasValidReasoning =
      typeof response.reasoning === 'string' &&
      response.reasoning.includes(
        'AI-generated diagnostic suggestions. Always correlate with clinical judgment.'
      );
    const hasValidWorkup =
      Array.isArray(response.recommendedWorkup) &&
      response.recommendedWorkup.length >= 2 &&
      response.recommendedWorkup.every((w) => typeof w === 'string' && w.trim().length > 0);

    const passed =
      hasSystemDisclaimer &&
      hasPromptStructure &&
      hasValidPrimary &&
      hasValidSecondaries &&
      hasValidReasoning &&
      hasValidWorkup;

    results.push({
      name: 'Tier-1 LLM Diagnostic Engine: Mock mode returns valid LlmDiagnosticResponse with clinical judgment disclaimer',
      passed,
      details: passed
        ? undefined
        : `Validation failed: primary=${response.primaryDifferential}, secondaries=${response.secondaryDifferentials?.length}, reasoningDisclaimer=${hasValidReasoning}, workup=${response.recommendedWorkup?.length}`,
    });
  } catch (err) {
    results.push({
      name: 'Tier-1 LLM Diagnostic Engine: Mock mode returns valid LlmDiagnosticResponse with clinical judgment disclaimer',
      passed: false,
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 2: SystemStatusBadge configurations and fallback tooltip
  try {
    const idleCfg = getSystemStatusConfig('idle');
    const analyzingCfg = getSystemStatusConfig('analyzing');
    const fullHybridCfg = getSystemStatusConfig('full-hybrid');
    const fallbackCfg = getSystemStatusConfig('local-fallback');

    const passed =
      idleCfg.label === 'Waiting for EHR Data...' &&
      analyzingCfg.label === '🔄 Running Hybrid Analysis...' &&
      fullHybridCfg.label === '✅ Full Hybrid Analysis (AI + Local Safety Net)' &&
      fallbackCfg.label === '⚠️ Fallback Mode (Pre-built Safety Rules Only)' &&
      fallbackCfg.tooltip ===
        'Live AI is currently unreachable. Results are based strictly on local deterministic heuristics.' &&
      LOCAL_FALLBACK_TOOLTIP ===
        'Live AI is currently unreachable. Results are based strictly on local deterministic heuristics.';

    results.push({
      name: 'SystemStatusBadge: Renders all 4 status tiers (idle, analyzing, full-hybrid, local-fallback) and fallback tooltip',
      passed,
      details: passed
        ? undefined
        : `Mismatch in SystemStatusBadge config: fallback=${JSON.stringify(fallbackCfg)}`,
    });
  } catch (err) {
    results.push({
      name: 'SystemStatusBadge: Renders all 4 status tiers (idle, analyzing, full-hybrid, local-fallback) and fallback tooltip',
      passed: false,
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 3: ProvenanceBadge Result Origin Indicator tags, Hybrid state, Decoupled Evidence Status & Strict Fallback Priority
  try {
    const geminiTags = getProvenanceTags({
      engine: 'gemini',
      model: 'gemini-3.8-flash',
      usedPrebuiltData: false,
      fallbackUsed: false,
      evidenceStatus: 'live-success',
    });
    const hybridTags = getProvenanceTags({
      engine: 'hybrid',
      model: 'gemini-3.8-flash',
      usedPrebuiltData: true,
      fallbackUsed: false,
      evidenceStatus: 'live-partial',
    });
    const fallbackPriorityTags = getProvenanceTags({
      engine: 'gemini',
      model: 'gemini-3.8-flash',
      usedPrebuiltData: true,
      fallbackUsed: true,
      evidenceStatus: 'unavailable',
    });
    const curatedTags = getProvenanceTags({
      engine: 'heuristic',
      usedPrebuiltData: true,
      fallbackUsed: false,
      evidenceStatus: 'curated-fallback',
    });

    // Verify decoupled evidence status: Gemini succeeds but live evidence fails -> unavailable or live-partial
    const evUnavailable = determineEvidenceStatus(
      [{ isLive: false }],
      [{ isLive: false }],
      1
    );
    const evPartial = determineEvidenceStatus(
      [{ isLive: true }],
      [{ isLive: false }],
      1
    );
    const evLiveSuccess = determineEvidenceStatus(
      [{ isLive: true }],
      [{ isLive: true }],
      1
    );

    const hybridProv = resolveClinicalProvenance({
      geminiSucceeded: true,
      usedPrebuiltData: true,
      fallbackUsed: false,
      evidenceStatus: evUnavailable,
    });
    const fallbackProv = resolveClinicalProvenance({
      geminiSucceeded: true,
      usedPrebuiltData: true,
      fallbackUsed: true,
      evidenceStatus: evLiveSuccess,
    });

    const passed =
      geminiTags.some((t) => t.label === 'AI-Generated — Gemini') &&
      hybridTags.some((t) => t.key === 'hybrid') &&
      fallbackPriorityTags.some((t) => t.label === 'AI Fallback — Rule-Based') &&
      !fallbackPriorityTags.some((t) => t.label.includes('Gemini')) &&
      curatedTags.some((t) => t.label === 'Pre-built Evidence Data') &&
      evUnavailable === 'unavailable' &&
      evPartial === 'live-partial' &&
      evLiveSuccess === 'live-success' &&
      hybridProv.engine === 'hybrid' &&
      hybridProv.evidenceStatus === 'unavailable' &&
      fallbackProv.engine === 'heuristic' &&
      fallbackProv.fallbackUsed === true;

    results.push({
      name: 'ProvenanceBadge & Provenance Engine: Enforces Hybrid state, Decoupled Evidence Status, and Strict Fallback Priority',
      passed,
      details: passed
        ? undefined
        : `Mismatch: fallbackPriorityTags=${JSON.stringify(fallbackPriorityTags)}, hybridProv=${JSON.stringify(hybridProv)}, fallbackProv=${JSON.stringify(fallbackProv)}`,
    });
  } catch (err) {
    results.push({
      name: 'ProvenanceBadge & Provenance Engine: Enforces Hybrid state, Decoupled Evidence Status, and Strict Fallback Priority',
      passed: false,
      details: err instanceof Error ? err.message : String(err),
    });
  }

  return results;
}

