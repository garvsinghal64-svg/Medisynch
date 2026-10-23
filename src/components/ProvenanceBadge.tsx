import React from 'react';
import { ResultProvenance } from '../types/clinical';

export interface ProvenanceBadgeProps {
  provenance?: ResultProvenance | null;
  className?: string;
}

export interface ProvenanceTagItem {
  key: 'gemini' | 'hybrid' | 'fallback' | 'mock' | 'curated' | 'evidence' | 'unknown';
  label: string;
  badgeClassName: string;
  dotClassName: string;
}

const VALID_ENGINES = new Set(['gemini', 'heuristic', 'hybrid', 'mock', 'unknown']);

export function getProvenanceTags(provenance?: ResultProvenance | null): ProvenanceTagItem[] {
  const tags: ProvenanceTagItem[] = [];

  if (!provenance || typeof provenance !== 'object' || !VALID_ENGINES.has(provenance.engine)) {
    return [
      {
        key: 'unknown',
        label: 'Unknown Origin — Verification Unavailable',
        badgeClassName: 'bg-rose-50 text-rose-800 border-rose-300',
        dotClassName: 'bg-rose-600',
      },
    ];
  }

  // Detect contradictory metadata (e.g. unknown engine or invalid combination)
  if (provenance.engine === 'unknown') {
    tags.push({
      key: 'unknown',
      label: 'Unknown Origin — Verification Unavailable',
      badgeClassName: 'bg-rose-50 text-rose-800 border-rose-300',
      dotClassName: 'bg-rose-600',
    });
  } else if (provenance.engine === 'mock') {
    // Mock output must never be labeled as live Gemini output or live evidence
    tags.push({
      key: 'mock',
      label: 'Mock / Static Data',
      badgeClassName: 'bg-stone-100 text-stone-700 border-stone-300',
      dotClassName: 'bg-stone-500',
    });
  } else if (provenance.fallbackUsed === true || provenance.engine === 'heuristic') {
    // Strict Fallback / Heuristic Priority: if fallbackUsed === true or engine === 'heuristic', override any 'Gemini' or 'Hybrid' labels
    tags.push({
      key: 'fallback',
      label: 'AI Fallback — Rule-Based',
      badgeClassName: 'bg-amber-50 text-amber-800 border-amber-300',
      dotClassName: 'bg-amber-600',
    });
  } else if (
    provenance.engine === 'hybrid' ||
    (provenance.engine === 'gemini' && provenance.usedPrebuiltData === true)
  ) {
    tags.push({
      key: 'hybrid',
      label: 'AI-Generated — Hybrid (Gemini + Rules)',
      badgeClassName: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      dotClassName: 'bg-indigo-600',
    });
  } else if (provenance.engine === 'gemini') {
    tags.push({
      key: 'gemini',
      label: 'AI-Generated — Gemini',
      badgeClassName: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      dotClassName: 'bg-indigo-600',
    });
  }

  // Separate Evidence Retrieval Status dimension
  if (provenance.engine === 'mock') {
    tags.push({
      key: 'curated',
      label: 'Pre-built Evidence Data',
      badgeClassName: 'bg-stone-100 text-stone-700 border-stone-300',
      dotClassName: 'bg-stone-500',
    });
  } else if (provenance.evidenceStatus === 'curated-fallback') {
    tags.push({
      key: 'curated',
      label: 'Pre-built Evidence Data',
      badgeClassName: 'bg-stone-100 text-stone-700 border-stone-300',
      dotClassName: 'bg-stone-500',
    });
  } else if (provenance.evidenceStatus === 'live-success') {
    tags.push({
      key: 'evidence',
      label: 'Evidence Retrieval — Live Sources Retrieved',
      badgeClassName: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dotClassName: 'bg-emerald-600',
    });
  } else if (provenance.evidenceStatus === 'live-partial') {
    tags.push({
      key: 'evidence',
      label: 'Live Evidence — Partial',
      badgeClassName: 'bg-amber-50 text-amber-800 border-amber-200',
      dotClassName: 'bg-amber-500',
    });
  } else if (provenance.evidenceStatus === 'no-results') {
    tags.push({
      key: 'evidence',
      label: 'Live Evidence — No Matching Sources',
      badgeClassName: 'bg-stone-100 text-stone-700 border-stone-300',
      dotClassName: 'bg-stone-500',
    });
  } else if (provenance.evidenceStatus === 'incomplete-metadata') {
    tags.push({
      key: 'evidence',
      label: 'Live Evidence — Incomplete Source Metadata',
      badgeClassName: 'bg-amber-50 text-amber-800 border-amber-200',
      dotClassName: 'bg-amber-500',
    });
  } else if (provenance.evidenceStatus === 'not-requested') {
    tags.push({
      key: 'evidence',
      label: 'Evidence Retrieval — Not Requested',
      badgeClassName: 'bg-slate-100 text-slate-600 border-slate-200',
      dotClassName: 'bg-slate-400',
    });
  } else if (
    provenance.evidenceStatus === 'unavailable' ||
    provenance.evidenceStatus === 'failed'
  ) {
    tags.push({
      key: 'evidence',
      label: 'Live Evidence Unavailable',
      badgeClassName: 'bg-stone-100 text-stone-700 border-stone-300',
      dotClassName: 'bg-stone-500',
    });
  }

  return tags;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  provenance,
  className = '',
}) => {
  const tags = getProvenanceTags(provenance);

  if (tags.length === 0) {
    return null;
  }

  const showModelTooltip =
    provenance &&
    provenance.model &&
    !provenance.fallbackUsed &&
    (provenance.engine === 'gemini' || provenance.engine === 'hybrid');

  return (
    <div
      className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}
      data-testid="provenance-badge-container"
    >
      {tags.map((tag) => (
        <span
          key={tag.key}
          data-testid={`provenance-badge-${tag.key}`}
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border shadow-2xs whitespace-nowrap ${tag.badgeClassName}`}
          title={
            showModelTooltip && (tag.key === 'gemini' || tag.key === 'hybrid')
              ? `${tag.label} (${provenance?.model}) — Origin indicator only; does not verify clinical accuracy`
              : `${tag.label} — Origin indicator only; does not verify clinical accuracy`
          }
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${tag.dotClassName}`}
            aria-hidden="true"
          />
          <span>{tag.label}</span>
        </span>
      ))}
    </div>
  );
};

export default ProvenanceBadge;
