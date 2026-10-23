import { SectionAttachment } from '../types/clinical';

// Minimal high-clarity SVG data URLs for instant clinical testing
const ECG_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300" style="background:#FFF9F5;">
    <defs>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#F87171" stroke-width="0.5" stroke-opacity="0.3"/>
      </pattern>
    </defs>
    <rect width="600" height="300" fill="url(#grid)" />
    <text x="20" y="30" font-family="sans-serif" font-size="14" font-weight="bold" fill="#991B1B">12-Lead ECG - 25mm/s 10mm/mV</text>
    <text x="20" y="50" font-family="monospace" font-size="12" fill="#7F1D1D">HR: 74 bpm | PR: 156ms | QRS: 84ms | QTc: 418ms</text>
    <path d="M 20 160 L 60 160 L 70 145 L 80 160 L 100 160 L 105 170 L 115 80 L 125 185 L 132 160 L 150 160 Q 170 135 190 160 L 220 160 L 230 145 L 240 160 L 260 160 L 265 170 L 275 80 L 285 185 L 292 160 L 310 160 Q 330 135 350 160 L 380 160 L 390 145 L 400 160 L 420 160 L 425 170 L 435 80 L 445 185 L 452 160 L 470 160 Q 490 135 510 160 L 580 160" fill="none" stroke="#B91C1C" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
)}`;

const CXR_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="400" viewBox="0 0 500 400" style="background:#0F172A;">
    <text x="20" y="35" font-family="sans-serif" font-size="14" font-weight="bold" fill="#E2E8F0">CHEST RADIOGRAPH (PA ERECT)</text>
    <text x="20" y="55" font-family="monospace" font-size="11" fill="#94A3B8">TECH: Standard PA View | INSPIRATION: 9 posterior ribs</text>
    <!-- Lung Fields Outline -->
    <ellipse cx="170" cy="210" rx="90" ry="120" fill="#1E293B" stroke="#475569" stroke-width="2"/>
    <ellipse cx="330" cy="210" rx="90" ry="120" fill="#1E293B" stroke="#475569" stroke-width="2"/>
    <!-- Cardiac Silhouette -->
    <path d="M 220 170 C 210 240, 240 280, 290 280 C 310 280, 320 250, 310 210 Z" fill="#334155" stroke="#64748B" stroke-width="2"/>
    <!-- Costophrenic Angles -->
    <path d="M 80 320 L 110 330 L 140 310" fill="none" stroke="#94A3B8" stroke-width="2"/>
    <path d="M 420 320 L 390 330 L 360 310" fill="none" stroke="#94A3B8" stroke-width="2"/>
    <text x="180" y="360" font-family="sans-serif" font-size="12" fill="#CBD5E1">Lungs clear, CTR &lt; 0.50</text>
  </svg>`
)}`;

const LAB_REPORT_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="350" viewBox="0 0 500 350" style="background:#F8FAFC;">
    <rect width="500" height="350" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
    <rect x="0" y="0" width="500" height="50" fill="#0284C7"/>
    <text x="20" y="32" font-family="sans-serif" font-size="16" font-weight="bold" fill="#FFFFFF">METROPOLITAN CLINICAL PATHOLOGY LAB</text>
    <text x="20" y="80" font-family="monospace" font-size="12" fill="#334155">TEST PANEL: CBC + BASIC METABOLIC PANEL</text>
    <line x1="20" y1="95" x2="480" y2="95" stroke="#CBD5E1" stroke-width="1"/>
    <text x="25" y="125" font-family="sans-serif" font-size="12" fill="#0F172A">WBC Count: 6.8 K/uL [Normal: 4.5 - 11.0]</text>
    <text x="25" y="155" font-family="sans-serif" font-size="12" fill="#0F172A">Hemoglobin: 14.1 g/dL [Normal: 13.5 - 17.5]</text>
    <text x="25" y="185" font-family="sans-serif" font-size="12" fill="#0F172A">Platelets: 245 K/uL [Normal: 150 - 450]</text>
    <text x="25" y="215" font-family="sans-serif" font-size="12" fill="#0F172A">Serum Creatinine: 1.0 mg/dL [Normal: 0.7 - 1.3]</text>
    <text x="25" y="245" font-family="sans-serif" font-size="12" fill="#0F172A">eGFR: &gt;60 mL/min/1.73m²</text>
    <text x="25" y="275" font-family="sans-serif" font-size="12" fill="#0F172A">Serum Potassium: 4.2 mmol/L [Normal: 3.5 - 5.0]</text>
    <rect x="20" y="300" width="460" height="30" fill="#F0FDF4" rx="4"/>
    <text x="35" y="320" font-family="sans-serif" font-size="11" fill="#166534">FINAL REPORT VERIFIED BY PATHOLOGIST</text>
  </svg>`
)}`;

const RASH_PHOTO_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" style="background:#FDE68A;">
    <rect width="400" height="300" fill="#FCE7F3"/>
    <text x="20" y="30" font-family="sans-serif" font-size="13" font-weight="bold" fill="#831843">CLINICAL PHOTOGRAPH: DERMATOLOGY</text>
    <text x="20" y="50" font-family="sans-serif" font-size="11" fill="#9D174D">Region: Volar forearm | Macular erythematous cluster</text>
    <circle cx="200" cy="160" r="45" fill="#FDA4AF" opacity="0.8"/>
    <circle cx="180" cy="150" r="25" fill="#FB7185" opacity="0.9"/>
    <circle cx="220" cy="170" r="20" fill="#F43F5E" opacity="0.9"/>
    <circle cx="210" cy="140" r="15" fill="#E11D48" opacity="0.8"/>
    <text x="80" y="250" font-family="sans-serif" font-size="11" fill="#9F1239">No central necrosis, clear demarcated border</text>
  </svg>`
)}`;

export const SAMPLE_ATTACHMENTS: {
  label: string;
  section: 'subjective' | 'objective' | 'assessment' | 'plan';
  attachment: SectionAttachment;
}[] = [
  {
    label: '12-Lead ECG Strip',
    section: 'objective',
    attachment: {
      id: 'demo-ecg',
      section: 'objective',
      fileName: '12_Lead_ECG_Rhythm_Strip.png',
      fileType: 'image',
      mimeType: 'image/png',
      dataUrl: ECG_SVG,
      fileSize: 48200,
      uploadedAt: new Date().toISOString(),
    },
  },
  {
    label: 'Chest Radiograph (CXR)',
    section: 'objective',
    attachment: {
      id: 'demo-cxr',
      section: 'objective',
      fileName: 'Chest_XRay_PA_Erect.png',
      fileType: 'image',
      mimeType: 'image/png',
      dataUrl: CXR_SVG,
      fileSize: 64100,
      uploadedAt: new Date().toISOString(),
    },
  },
  {
    label: 'CBC & Metabolic Lab Report',
    section: 'objective',
    attachment: {
      id: 'demo-lab',
      section: 'objective',
      fileName: 'Complete_Blood_Count_and_BMP_Report.pdf',
      fileType: 'document',
      mimeType: 'application/pdf',
      dataUrl: LAB_REPORT_SVG,
      fileSize: 85400,
      uploadedAt: new Date().toISOString(),
    },
  },
  {
    label: 'Dermatology Rash Photo',
    section: 'subjective',
    attachment: {
      id: 'demo-rash',
      section: 'subjective',
      fileName: 'Patient_Rash_Clinical_Photo.png',
      fileType: 'image',
      mimeType: 'image/png',
      dataUrl: RASH_PHOTO_SVG,
      fileSize: 52000,
      uploadedAt: new Date().toISOString(),
    },
  },
];
