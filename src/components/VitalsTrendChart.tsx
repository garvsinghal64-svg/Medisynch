import React, { useState, useId } from 'react';
import {
  Activity,
  Heart,
  Scale,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Clock,
  ArrowRight,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { VitalDataPoint, VitalsSummaryMetrics, getBloodPressureCategory, getHeartRateCategory } from '../utils/vitalsParser';
import { SavedEncounterRecord } from '../types/clinical';

export type ChartMode = 'bp' | 'hr' | 'weight' | 'overview';

interface VitalsTrendChartProps {
  history: VitalDataPoint[];
  metrics: VitalsSummaryMetrics;
  onLoadEncounter?: (record: SavedEncounterRecord) => void;
  onOpenAddEncounter?: () => void;
}

export const VitalsTrendChart: React.FC<VitalsTrendChartProps> = ({
  history,
  metrics,
  onLoadEncounter,
  onOpenAddEncounter,
}) => {
  const [activeMode, setActiveMode] = useState<ChartMode>('bp');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const baseId = useId();

  if (history.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-stone-500 space-y-2">
        <Activity className="w-10 h-10 text-stone-300 mx-auto" />
        <p className="font-semibold text-stone-700">No Vitals History Available</p>
        <p className="text-stone-400">Save encounters with documented vitals to visualize trends over time.</p>
      </div>
    );
  }

  // Active hovered point (default to latest if none hovered)
  const activePoint = hoveredPointIndex !== null ? history[hoveredPointIndex] : history[history.length - 1];

  // Helper for trend badge
  const renderTrendBadge = (delta: number | null, unit: string, invertGood = false) => {
    if (delta === null || history.length < 2) {
      return (
        <span className="text-[11px] font-mono text-stone-400 flex items-center gap-0.5">
          <Minus className="w-3 h-3" /> Baseline
        </span>
      );
    }
    const isUp = delta > 0;
    const isZero = delta === 0;

    if (isZero) {
      return (
        <span className="text-[11px] font-mono text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
          <Minus className="w-3 h-3" /> No change
        </span>
      );
    }

    // Usually lower BP / HR / Weight is good in HTN/dyspnea/T2D
    const isPositive = invertGood ? !isUp : !isUp;
    const color = isPositive ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200';

    return (
      <span className={`text-[11px] font-mono font-medium px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${color}`}>
        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span>
          {isUp ? '+' : ''}
          {delta} {unit}
        </span>
      </span>
    );
  };

  // Dimensions for SVG chart
  const svgWidth = 720;
  const svgHeight = 260;
  const padding = { top: 28, right: 30, bottom: 42, left: 88 };
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = svgHeight - padding.top - padding.bottom;

  // X coordinate mapping (evenly spaced encounters along timeline)
  const getX = (index: number) => {
    if (history.length <= 1) return padding.left + chartW / 2;
    return padding.left + (index / (history.length - 1)) * chartW;
  };

  // Y coordinate mapping for BP (min: 50, max: 190)
  const bpMin = 50;
  const bpMax = 190;
  const getY_BP = (val: number | null) => {
    if (val === null) return null;
    const clamped = Math.max(bpMin, Math.min(bpMax, val));
    return padding.top + chartH - ((clamped - bpMin) / (bpMax - bpMin)) * chartH;
  };

  // Y coordinate mapping for HR (min: 40, max: 140)
  const hrMin = 40;
  const hrMax = 140;
  const getY_HR = (val: number | null) => {
    if (val === null) return null;
    const clamped = Math.max(hrMin, Math.min(hrMax, val));
    return padding.top + chartH - ((clamped - hrMin) / (hrMax - hrMin)) * chartH;
  };

  // Y coordinate mapping for Weight (auto-scaled or min 0 to max + 10%)
  const validWeights = history
    .map((p) => (weightUnit === 'kg' ? p.weightKg : p.weightLbs))
    .filter((w): w is number => w !== null && w > 0);
  const wtMinRaw = validWeights.length > 0 ? Math.min(...validWeights) : 50;
  const wtMaxRaw = validWeights.length > 0 ? Math.max(...validWeights) : 100;
  const wtMin = Math.max(0, Math.floor(wtMinRaw * 0.85));
  const wtMax = Math.ceil(wtMaxRaw * 1.15) || 100;
  const getY_WT = (val: number | null) => {
    if (val === null) return null;
    const clamped = Math.max(wtMin, Math.min(wtMax, val));
    return padding.top + chartH - ((clamped - wtMin) / (wtMax - wtMin)) * chartH;
  };

  // Path generator for continuous line
  const makeLinePath = (getYFunc: (val: number | null) => number | null, key: keyof VitalDataPoint) => {
    let d = '';
    history.forEach((pt, i) => {
      const val = pt[key] as number | null;
      const y = getYFunc(val);
      if (y !== null) {
        const x = getX(i);
        d += (d === '' ? 'M ' : ' L ') + `${x.toFixed(1)},${y.toFixed(1)}`;
      }
    });
    return d;
  };

  // Path generator for filled area
  const makeAreaPath = (getYFunc: (val: number | null) => number | null, key: keyof VitalDataPoint) => {
    const validPoints: { x: number; y: number }[] = [];
    history.forEach((pt, i) => {
      const val = pt[key] as number | null;
      const y = getYFunc(val);
      if (y !== null) {
        validPoints.push({ x: getX(i), y });
      }
    });

    if (validPoints.length < 2) return '';
    const bottomY = padding.top + chartH;
    let d = `M ${validPoints[0].x.toFixed(1)},${bottomY.toFixed(1)}`;
    validPoints.forEach((p) => {
      d += ` L ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    });
    d += ` L ${validPoints[validPoints.length - 1].x.toFixed(1)},${bottomY.toFixed(1)} Z`;
    return d;
  };

  return (
    <div className="space-y-4">
      {/* Top Controls & View Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 border border-stone-200/90 rounded-lg p-3">
        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveMode('bp')}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
              activeMode === 'bp'
                ? 'bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            <span>Blood Pressure</span>
            {metrics.latestSystolic && (
              <span className="text-[10px] font-mono opacity-80 tabular-nums">
                ({metrics.latestSystolic}/{metrics.latestDiastolic})
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveMode('hr')}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
              activeMode === 'hr'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-emerald-600" />
            <span>Heart Rate</span>
            {metrics.latestHeartRate && (
              <span className="text-[10px] font-mono opacity-80 tabular-nums">
                ({metrics.latestHeartRate} bpm)
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveMode('weight')}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
              activeMode === 'weight'
                ? 'bg-blue-50 text-blue-800 border border-blue-300 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-blue-600" />
            <span>Weight & BMI</span>
            {metrics.latestWeightKg && (
              <span className="text-[10px] font-mono opacity-80 tabular-nums">
                ({weightUnit === 'kg' ? `${metrics.latestWeightKg} kg` : `${metrics.latestWeightLbs} lbs`})
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveMode('overview')}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
              activeMode === 'overview'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>All Vitals Overview</span>
          </button>
        </div>

        {/* Right Tools: Units toggle & Add Point */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {activeMode === 'weight' && (
            <div className="flex items-center bg-stone-200/80 rounded-md p-0.5 text-[11px] font-mono">
              <button
                onClick={() => setWeightUnit('kg')}
                className={`px-2 py-0.5 rounded transition-all ${
                  weightUnit === 'kg' ? 'bg-white font-bold text-stone-900 shadow-2xs' : 'text-stone-600'
                }`}
              >
                kg
              </button>
              <button
                onClick={() => setWeightUnit('lbs')}
                className={`px-2 py-0.5 rounded transition-all ${
                  weightUnit === 'lbs' ? 'bg-white font-bold text-stone-900 shadow-2xs' : 'text-stone-600'
                }`}
              >
                lbs
              </button>
            </div>
          )}

          {onOpenAddEncounter && (
            <button
              onClick={onOpenAddEncounter}
              className="flex items-center gap-1.5 text-xs font-medium text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 px-2.5 py-1 rounded-md transition-colors shadow-2xs"
              title="Add a new historical encounter or vital record"
            >
              <PlusCircle className="w-3.5 h-3.5 text-stone-500" />
              <span>Record Visit</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* BP Card */}
        <div
          onClick={() => setActiveMode('bp')}
          className={`cursor-pointer rounded-lg p-3 border transition-all ${
            activeMode === 'bp'
              ? 'bg-rose-50/40 border-rose-300 ring-1 ring-rose-200'
              : 'bg-white border-stone-200 hover:border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span className="font-semibold text-rose-900 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              Blood Pressure
            </span>
            <span className="text-[10px] font-mono text-stone-400">mmHg</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-stone-900 tabular-nums">
              {metrics.latestSystolic && metrics.latestDiastolic
                ? `${metrics.latestSystolic}/${metrics.latestDiastolic}`
                : '--/--'}
            </span>
            {renderTrendBadge(metrics.deltaSystolic, 'mmHg')}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className="text-stone-500 font-mono">
              Baseline: {history[0]?.systolic ? `${history[0].systolic}/${history[0].diastolic}` : '--'}
            </span>
            <span className="font-medium text-[10px] px-1.5 py-0.5 rounded bg-rose-100/70 text-rose-800">
              {metrics.bpCategory}
            </span>
          </div>
        </div>

        {/* HR Card */}
        <div
          onClick={() => setActiveMode('hr')}
          className={`cursor-pointer rounded-lg p-3 border transition-all ${
            activeMode === 'hr'
              ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-200'
              : 'bg-white border-stone-200 hover:border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span className="font-semibold text-emerald-900 flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-emerald-600" />
              Heart Rate
            </span>
            <span className="text-[10px] font-mono text-stone-400">bpm</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-stone-900 tabular-nums">
              {metrics.latestHeartRate ? metrics.latestHeartRate : '--'}
            </span>
            {renderTrendBadge(metrics.deltaHeartRate, 'bpm')}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className="text-stone-500 font-mono">
              Baseline: {history[0]?.heartRate ? `${history[0].heartRate} bpm` : '--'}
            </span>
            <span className="font-medium text-[10px] px-1.5 py-0.5 rounded bg-emerald-100/70 text-emerald-800">
              {metrics.hrCategory}
            </span>
          </div>
        </div>

        {/* Weight Card */}
        <div
          onClick={() => setActiveMode('weight')}
          className={`cursor-pointer rounded-lg p-3 border transition-all ${
            activeMode === 'weight'
              ? 'bg-blue-50/40 border-blue-300 ring-1 ring-blue-200'
              : 'bg-white border-stone-200 hover:border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span className="font-semibold text-blue-900 flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-blue-600" />
              Body Weight
            </span>
            <span className="text-[10px] font-mono text-stone-400">{weightUnit}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-stone-900 tabular-nums">
              {weightUnit === 'kg'
                ? metrics.latestWeightKg
                  ? `${metrics.latestWeightKg} kg`
                  : '--'
                : metrics.latestWeightLbs
                ? `${metrics.latestWeightLbs} lbs`
                : '--'}
            </span>
            {renderTrendBadge(
              weightUnit === 'kg' ? metrics.deltaWeightKg : metrics.deltaWeightLbs,
              weightUnit
            )}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className="text-stone-500 font-mono">
              Baseline:{' '}
              {weightUnit === 'kg'
                ? history[0]?.weightKg
                  ? `${history[0].weightKg} kg`
                  : '--'
                : history[0]?.weightLbs
                ? `${history[0].weightLbs} lbs`
                : '--'}
            </span>
            {metrics.latestBmi && (
              <span className="font-mono text-[10px] text-stone-600">
                BMI {metrics.latestBmi}
              </span>
            )}
          </div>
        </div>

        {/* Encounter Span Card */}
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span className="font-semibold text-stone-800 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              Timeline Span
            </span>
            <span className="text-[10px] font-mono text-stone-500">
              {history.length} {history.length === 1 ? 'visit' : 'visits'}
            </span>
          </div>
          <div>
            <div className="text-xs font-semibold text-stone-900 truncate">
              {metrics.latestDate}
            </div>
            <div className="text-[11px] font-mono text-stone-500 mt-0.5 truncate">
              Since: {metrics.firstDate}
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-stone-500">
            <Clock className="w-3 h-3 text-stone-400" />
            <span>Chronological order</span>
          </div>
        </div>
      </div>

      {/* Main SVG Visualization Canvas */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs relative">
        {/* Chart Header Info */}
        <div className="flex items-center justify-between mb-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-900">
              {activeMode === 'bp' && 'Blood Pressure Trend (Systolic & Diastolic)'}
              {activeMode === 'hr' && 'Heart Rate Trend (Beats Per Minute)'}
              {activeMode === 'weight' && `Weight Progression & BMI Tracking (${weightUnit.toUpperCase()})`}
              {activeMode === 'overview' && 'Multi-Vital Trajectory Timeline'}
            </span>
            <span className="text-stone-400 font-mono text-[11px]">·</span>
            <span className="text-stone-500 text-[11px]">
              Hover over points to inspect visit details
            </span>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px] font-mono">
            {activeMode === 'bp' && (
              <>
                <span className="flex items-center gap-1 text-rose-700">
                  <span className="w-2.5 h-0.5 bg-rose-600 inline-block" />
                  <span>Systolic</span>
                </span>
                <span className="flex items-center gap-1 text-amber-700">
                  <span className="w-2.5 h-0.5 bg-amber-600 inline-block" />
                  <span>Diastolic</span>
                </span>
                <span className="flex items-center gap-1 text-stone-400">
                  <span className="w-2.5 h-0.5 bg-stone-300 border-t border-dashed inline-block" />
                  <span>Thresholds (120/80 & 140/90)</span>
                </span>
              </>
            )}
            {activeMode === 'hr' && (
              <>
                <span className="flex items-center gap-1 text-emerald-700">
                  <span className="w-2.5 h-0.5 bg-emerald-600 inline-block" />
                  <span>Heart Rate</span>
                </span>
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="w-2.5 h-2 bg-emerald-100/60 inline-block rounded-xs" />
                  <span>Normal Resting Zone (60-100 bpm)</span>
                </span>
              </>
            )}
            {activeMode === 'weight' && (
              <>
                <span className="flex items-center gap-1 text-blue-700">
                  <span className="w-2.5 h-0.5 bg-blue-600 inline-block" />
                  <span>Weight ({weightUnit})</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* SVG Container */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto min-w-[580px] select-none font-sans"
          >
            <defs>
              {/* BP Gradient */}
              <linearGradient id={`${baseId}-bp-sys-grad`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e11d48" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#e11d48" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id={`${baseId}-bp-dia-grad`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d97706" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.0" />
              </linearGradient>

              {/* HR Gradient */}
              <linearGradient id={`${baseId}-hr-grad`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
              </linearGradient>

              {/* Weight Gradient */}
              <linearGradient id={`${baseId}-wt-grad`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.20" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Background Grid Lines & Y-axis labels */}
            {activeMode === 'bp' && (
              <>
                {/* Reference Bands */}
                {/* Normal Systolic Threshold Line (120) */}
                <line
                  x1={padding.left}
                  y1={getY_BP(120)!}
                  x2={svgWidth - padding.right}
                  y2={getY_BP(120)!}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                  opacity="0.6"
                />
                <text
                  x={padding.left - 6}
                  y={getY_BP(120)! + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#059669"
                  fontFamily="monospace"
                >
                  120 (Normal)
                </text>

                {/* Stage 2 HTN Line (140) */}
                <line
                  x1={padding.left}
                  y1={getY_BP(140)!}
                  x2={svgWidth - padding.right}
                  y2={getY_BP(140)!}
                  stroke="#e11d48"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                  opacity="0.6"
                />
                <text
                  x={padding.left - 6}
                  y={getY_BP(140)! + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#e11d48"
                  fontFamily="monospace"
                >
                  140 (Stage 2)
                </text>

                {/* Normal Diastolic Line (80) */}
                <line
                  x1={padding.left}
                  y1={getY_BP(80)!}
                  x2={svgWidth - padding.right}
                  y2={getY_BP(80)!}
                  stroke="#059669"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                  opacity="0.5"
                />
                <text
                  x={padding.left - 6}
                  y={getY_BP(80)! + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#059669"
                  fontFamily="monospace"
                >
                  80 (Normal Dia)
                </text>

                {/* Y-axis Ticks */}
                {[60, 100, 160, 180].map((val) => {
                  const y = getY_BP(val)!;
                  return (
                    <g key={val}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={svgWidth - padding.right}
                        y2={y}
                        stroke="#e5e5e5"
                        strokeWidth="1"
                      />
                      <text
                        x={padding.left - 6}
                        y={y + 3}
                        textAnchor="end"
                        fontSize="9"
                        fill="#78716c"
                        fontFamily="monospace"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}
              </>
            )}

            {activeMode === 'hr' && (
              <>
                {/* Normal resting zone green shaded rectangle 60 to 100 */}
                <rect
                  x={padding.left}
                  y={getY_HR(100)!}
                  width={chartW}
                  height={getY_HR(60)! - getY_HR(100)!}
                  fill="#10b981"
                  fillOpacity="0.08"
                />
                <line
                  x1={padding.left}
                  y1={getY_HR(100)!}
                  x2={svgWidth - padding.right}
                  y2={getY_HR(100)!}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                  opacity="0.5"
                />
                <line
                  x1={padding.left}
                  y1={getY_HR(60)!}
                  x2={svgWidth - padding.right}
                  y2={getY_HR(60)!}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                  opacity="0.5"
                />

                {[40, 60, 80, 100, 120, 140].map((val) => {
                  const y = getY_HR(val)!;
                  return (
                    <g key={val}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={svgWidth - padding.right}
                        y2={y}
                        stroke="#e5e5e5"
                        strokeWidth="1"
                      />
                      <text
                        x={padding.left - 6}
                        y={y + 3}
                        textAnchor="end"
                        fontSize="9"
                        fill="#78716c"
                        fontFamily="monospace"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}
              </>
            )}

            {activeMode === 'weight' && (
              <>
                {[wtMin, Math.round((wtMin + wtMax) / 2), wtMax].map((val) => {
                  const y = getY_WT(val)!;
                  return (
                    <g key={val}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={svgWidth - padding.right}
                        y2={y}
                        stroke="#e5e5e5"
                        strokeWidth="1"
                      />
                      <text
                        x={padding.left - 6}
                        y={y + 3}
                        textAnchor="end"
                        fontSize="9"
                        fill="#78716c"
                        fontFamily="monospace"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}
              </>
            )}

            {activeMode === 'overview' && (
              <>
                {/* 3 mini reference zones */}
                <line
                  x1={padding.left}
                  y1={padding.top + chartH * 0.33}
                  x2={svgWidth - padding.right}
                  y2={padding.top + chartH * 0.33}
                  stroke="#e7e5e4"
                  strokeDasharray="2 2"
                />
                <line
                  x1={padding.left}
                  y1={padding.top + chartH * 0.66}
                  x2={svgWidth - padding.right}
                  y2={padding.top + chartH * 0.66}
                  stroke="#e7e5e4"
                  strokeDasharray="2 2"
                />
                <text
                  x={padding.left + 4}
                  y={padding.top + 12}
                  fontSize="9"
                  fill="#e11d48"
                  fontWeight="bold"
                >
                  Blood Pressure (mmHg)
                </text>
                <text
                  x={padding.left + 4}
                  y={padding.top + chartH * 0.33 + 14}
                  fontSize="9"
                  fill="#059669"
                  fontWeight="bold"
                >
                  Heart Rate (bpm)
                </text>
                <text
                  x={padding.left + 4}
                  y={padding.top + chartH * 0.66 + 14}
                  fontSize="9"
                  fill="#2563eb"
                  fontWeight="bold"
                >
                  Weight ({weightUnit})
                </text>
              </>
            )}

            {/* Bottom X-axis baseline */}
            <line
              x1={padding.left}
              y1={padding.top + chartH}
              x2={svgWidth - padding.right}
              y2={padding.top + chartH}
              stroke="#a8a29e"
              strokeWidth="1.5"
            />

            {/* X-axis date labels */}
            {history.map((pt, i) => {
              const x = getX(i);
              return (
                <g key={pt.encounterId || i}>
                  <line
                    x1={x}
                    y1={padding.top + chartH}
                    x2={x}
                    y2={padding.top + chartH + 5}
                    stroke="#78716c"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={padding.top + chartH + 18}
                    textAnchor="middle"
                    fontSize="10"
                    fill={hoveredPointIndex === i ? '#0c0a09' : '#78716c'}
                    fontWeight={hoveredPointIndex === i ? 'bold' : 'normal'}
                    className="cursor-pointer"
                    onClick={() => setHoveredPointIndex(i)}
                  >
                    {pt.formattedDate.replace(' (Current Draft)', '*')}
                  </text>
                </g>
              );
            })}

            {/* Hovered Crosshair line */}
            {hoveredPointIndex !== null && (
              <line
                x1={getX(hoveredPointIndex)}
                y1={padding.top}
                x2={getX(hoveredPointIndex)}
                y2={padding.top + chartH}
                stroke="#0284c7"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.8"
              />
            )}

            {/* --- BLOOD PRESSURE MODE --- */}
            {activeMode === 'bp' && (
              <>
                {/* Diastolic Area & Line */}
                <path
                  d={makeAreaPath(getY_BP, 'diastolic')}
                  fill={`url(#${baseId}-bp-dia-grad)`}
                />
                <path
                  d={makeLinePath(getY_BP, 'diastolic')}
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Systolic Area & Line */}
                <path
                  d={makeAreaPath(getY_BP, 'systolic')}
                  fill={`url(#${baseId}-bp-sys-grad)`}
                />
                <path
                  d={makeLinePath(getY_BP, 'systolic')}
                  fill="none"
                  stroke="#e11d48"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points */}
                {history.map((pt, i) => {
                  const x = getX(i);
                  const ySys = getY_BP(pt.systolic);
                  const yDia = getY_BP(pt.diastolic);
                  const isHovered = hoveredPointIndex === i;

                  return (
                    <g
                      key={`bp-${pt.encounterId || i}`}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPointIndex(i)}
                    >
                      {/* Invisible hover target column */}
                      <rect
                        x={x - 24}
                        y={padding.top}
                        width={48}
                        height={chartH}
                        fill="transparent"
                      />

                      {/* Systolic Dot */}
                      {ySys !== null && (
                        <circle
                          cx={x}
                          cy={ySys}
                          r={isHovered ? 6 : 4.5}
                          fill="#e11d48"
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="transition-all duration-150"
                        />
                      )}

                      {/* Diastolic Dot */}
                      {yDia !== null && (
                        <circle
                          cx={x}
                          cy={yDia}
                          r={isHovered ? 5.5 : 4}
                          fill="#d97706"
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="transition-all duration-150"
                        />
                      )}

                      {/* Value callout above systolic */}
                      {ySys !== null && (
                        <text
                          x={x}
                          y={ySys - (isHovered ? 12 : 8)}
                          textAnchor="middle"
                          fontSize={isHovered ? '11' : '9.5'}
                          fontWeight={isHovered ? 'bold' : '600'}
                          fill="#e11d48"
                          fontFamily="monospace"
                        >
                          {pt.systolic}/{pt.diastolic}
                        </text>
                      )}
                    </g>
                  );
                })}
              </>
            )}

            {/* --- HEART RATE MODE --- */}
            {activeMode === 'hr' && (
              <>
                <path
                  d={makeAreaPath(getY_HR, 'heartRate')}
                  fill={`url(#${baseId}-hr-grad)`}
                />
                <path
                  d={makeLinePath(getY_HR, 'heartRate')}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {history.map((pt, i) => {
                  const x = getX(i);
                  const y = getY_HR(pt.heartRate);
                  const isHovered = hoveredPointIndex === i;

                  if (y === null) return null;
                  return (
                    <g
                      key={`hr-${pt.encounterId || i}`}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPointIndex(i)}
                    >
                      <rect
                        x={x - 24}
                        y={padding.top}
                        width={48}
                        height={chartH}
                        fill="transparent"
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 6.5 : 4.5}
                        fill="#059669"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="transition-all duration-150"
                      />
                      <text
                        x={x}
                        y={y - (isHovered ? 12 : 8)}
                        textAnchor="middle"
                        fontSize={isHovered ? '11' : '10'}
                        fontWeight={isHovered ? 'bold' : '600'}
                        fill="#059669"
                        fontFamily="monospace"
                      >
                        {pt.heartRate} bpm
                      </text>
                    </g>
                  );
                })}
              </>
            )}

            {/* --- WEIGHT MODE --- */}
            {activeMode === 'weight' && (
              <>
                <path
                  d={makeAreaPath(
                    getY_WT,
                    weightUnit === 'kg' ? 'weightKg' : 'weightLbs'
                  )}
                  fill={`url(#${baseId}-wt-grad)`}
                />
                <path
                  d={makeLinePath(
                    getY_WT,
                    weightUnit === 'kg' ? 'weightKg' : 'weightLbs'
                  )}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {history.map((pt, i) => {
                  const x = getX(i);
                  const val = weightUnit === 'kg' ? pt.weightKg : pt.weightLbs;
                  const y = getY_WT(val);
                  const isHovered = hoveredPointIndex === i;

                  if (y === null) return null;
                  return (
                    <g
                      key={`wt-${pt.encounterId || i}`}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPointIndex(i)}
                    >
                      <rect
                        x={x - 24}
                        y={padding.top}
                        width={48}
                        height={chartH}
                        fill="transparent"
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 6.5 : 4.5}
                        fill="#2563eb"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="transition-all duration-150"
                      />
                      <text
                        x={x}
                        y={y - (isHovered ? 12 : 8)}
                        textAnchor="middle"
                        fontSize={isHovered ? '11' : '10'}
                        fontWeight={isHovered ? 'bold' : '600'}
                        fill="#2563eb"
                        fontFamily="monospace"
                      >
                        {val} {weightUnit}
                      </text>
                    </g>
                  );
                })}
              </>
            )}

            {/* --- OVERVIEW MODE --- */}
            {activeMode === 'overview' && (
              <>
                {/* 3 mini line paths mapped to their thirds of the canvas */}
                {/* 1. BP in top third */}
                <path
                  d={makeLinePath((v) => {
                    if (v === null) return null;
                    const norm = (v - 60) / (190 - 60);
                    return padding.top + chartH * 0.3 - norm * (chartH * 0.28);
                  }, 'systolic')}
                  fill="none"
                  stroke="#e11d48"
                  strokeWidth="2"
                />
                {/* 2. HR in middle third */}
                <path
                  d={makeLinePath((v) => {
                    if (v === null) return null;
                    const norm = (v - 50) / (130 - 50);
                    return padding.top + chartH * 0.62 - norm * (chartH * 0.25);
                  }, 'heartRate')}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2"
                />
                {/* 3. Weight in bottom third */}
                <path
                  d={makeLinePath((v) => {
                    if (v === null) return null;
                    const norm = (v - wtMin) / (wtMax - wtMin || 1);
                    return padding.top + chartH - 4 - norm * (chartH * 0.26);
                  }, 'weightKg')}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2"
                />

                {history.map((pt, i) => {
                  const x = getX(i);
                  return (
                    <g
                      key={`ov-${i}`}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPointIndex(i)}
                    >
                      <rect
                        x={x - 24}
                        y={padding.top}
                        width={48}
                        height={chartH}
                        fill="transparent"
                      />
                      {/* Dots on all three tracks */}
                      <circle
                        cx={x}
                        cy={padding.top + chartH * 0.3 - ((pt.systolic || 120) - 60) / (190 - 60) * (chartH * 0.28)}
                        r="3.5"
                        fill="#e11d48"
                      />
                      <circle
                        cx={x}
                        cy={padding.top + chartH * 0.62 - ((pt.heartRate || 75) - 50) / (130 - 50) * (chartH * 0.25)}
                        r="3.5"
                        fill="#059669"
                      />
                      <circle
                        cx={x}
                        cy={padding.top + chartH - 4 - ((pt.weightKg || wtMin) - wtMin) / (wtMax - wtMin || 1) * (chartH * 0.26)}
                        r="3.5"
                        fill="#2563eb"
                      />
                    </g>
                  );
                })}
              </>
            )}
          </svg>
        </div>

        {/* Selected / Hovered Point Detail Callout Box */}
        {activePoint && (
          <div className="mt-3 bg-stone-50 border border-stone-200/80 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-stone-900 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-stone-500" />
                  <span>Encounter Visit: {activePoint.formattedDate}</span>
                </span>
                <span className="text-stone-300">|</span>
                <span className="text-stone-600 italic">
                  &ldquo;{activePoint.chiefComplaint}&rdquo;
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-stone-700 flex-wrap pt-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-rose-700 font-semibold">BP:</span>
                  <span className="font-bold text-stone-900">{activePoint.rawBP || '--/--'}</span>
                  {activePoint.systolic && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-sans">
                      {getBloodPressureCategory(activePoint.systolic, activePoint.diastolic).label}
                    </span>
                  )}
                </div>

                <span className="text-stone-300">|</span>

                <div className="flex items-center gap-1">
                  <span className="text-emerald-700 font-semibold">HR:</span>
                  <span className="font-bold text-stone-900">
                    {activePoint.heartRate ? `${activePoint.heartRate} bpm` : '--'}
                  </span>
                  {activePoint.heartRate && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-sans">
                      {getHeartRateCategory(activePoint.heartRate).label}
                    </span>
                  )}
                </div>

                <span className="text-stone-300">|</span>

                <div className="flex items-center gap-1">
                  <span className="text-blue-700 font-semibold">Weight:</span>
                  <span className="font-bold text-stone-900">
                    {activePoint.weightKg ? `${activePoint.weightKg} kg (${activePoint.weightLbs} lbs)` : '--'}
                  </span>
                  {activePoint.bmi && (
                    <span className="text-[10px] text-stone-500">BMI {activePoint.bmi}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action to switch / load this encounter */}
            {activePoint.encounterRecord && onLoadEncounter && (
              <button
                onClick={() => onLoadEncounter(activePoint.encounterRecord!)}
                className="flex items-center gap-1.5 text-xs font-semibold text-stone-900 bg-white hover:bg-stone-200 border border-stone-300 px-3 py-1.5 rounded-md transition-colors shadow-2xs shrink-0 self-end md:self-center"
              >
                <span>Load This Encounter</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Chronological Encounter Vitals History Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-stone-600" />
            <h4 className="text-xs font-bold text-stone-900">Encounter Vitals Log (Oldest to Newest)</h4>
          </div>
          <span className="text-[11px] font-mono text-stone-500">
            {history.length} documented visits
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-100/70 text-stone-600 font-medium border-b border-stone-200">
                <th className="py-2.5 px-4">Visit Date</th>
                <th className="py-2.5 px-3">Chief Complaint</th>
                <th className="py-2.5 px-3">Blood Pressure</th>
                <th className="py-2.5 px-3">Heart Rate</th>
                <th className="py-2.5 px-3">Weight & BMI</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
              {history.map((pt, idx) => {
                const isSelected = hoveredPointIndex === idx;
                const prevPt = idx > 0 ? history[idx - 1] : null;

                const sysDelta =
                  pt.systolic && prevPt?.systolic ? pt.systolic - prevPt.systolic : null;
                const wtDelta =
                  pt.weightKg && prevPt?.weightKg
                    ? Number((pt.weightKg - prevPt.weightKg).toFixed(1))
                    : null;

                return (
                  <tr
                    key={pt.encounterId || idx}
                    onMouseEnter={() => setHoveredPointIndex(idx)}
                    className={`transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50/60 font-semibold' : 'hover:bg-stone-50/80'
                    }`}
                  >
                    <td className="py-2.5 px-4 font-sans font-medium text-stone-900 whitespace-nowrap">
                      {pt.formattedDate}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-stone-600 max-w-xs truncate">
                      {pt.chiefComplaint}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-rose-900 font-bold">{pt.rawBP || '--/--'}</span>
                      {sysDelta !== null && (
                        <span
                          className={`ml-1.5 text-[10px] ${
                            sysDelta > 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          ({sysDelta > 0 ? `+${sysDelta}` : sysDelta})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-emerald-800 font-bold">
                        {pt.heartRate ? `${pt.heartRate} bpm` : '--'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-blue-900 font-bold">
                        {pt.weightKg ? `${pt.weightKg} kg` : '--'}
                      </span>
                      {wtDelta !== null && (
                        <span
                          className={`ml-1.5 text-[10px] ${
                            wtDelta > 0 ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          ({wtDelta > 0 ? `+${wtDelta}` : wtDelta} kg)
                        </span>
                      )}
                      {pt.bmi && (
                        <span className="ml-2 text-stone-400 font-sans text-[10px]">
                          BMI {pt.bmi}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap font-sans">
                      {pt.encounterRecord && onLoadEncounter ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onLoadEncounter(pt.encounterRecord!);
                          }}
                          className="text-[11px] font-medium text-blue-700 hover:text-blue-900 hover:underline px-2 py-0.5"
                        >
                          Load Note
                        </button>
                      ) : (
                        <span className="text-stone-400 text-[10px]">Current draft</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
