export interface PgxGenotypeProfile {
  cyp2c19: '*1/*1 (Normal Metabolizer)' | '*1/*2 (Intermediate Metabolizer)' | '*2/*2 (Poor Metabolizer)' | '*17/*17 (Ultrarapid Metabolizer)';
  slco1b1: 'rs4149056 T/T (Normal Function)' | 'rs4149056 T/C (Decreased Function)' | 'rs4149056 C/C (Poor Function)';
  cyp2d6: '*1/*1 (Normal Metabolizer)' | '*4/*4 (Poor Metabolizer)' | '*1/*2xN (Ultrarapid Metabolizer)';
  hlaB5701: 'Negative' | 'Positive (High Risk Carrier)';
  hlaB1502: 'Negative' | 'Positive (High Risk Carrier)';
  cyp2c9Vkorc1: 'CYP2C9 *1/*1 + VKORC1 G/G (Normal Sensitivity)' | 'CYP2C9 *1/*3 + VKORC1 A/G (Intermediate Sensitivity)' | 'CYP2C9 *3/*3 + VKORC1 A/A (High Sensitivity / Bleed Risk)';
}

export interface CpicRecommendation {
  id: string;
  gene: string;
  diplotype: string;
  phenotype: string;
  affectedDrug: string;
  cpicLevel: 'CPIC Level A (Strong)' | 'CPIC Level A (Moderate)';
  severity: 'contraindicated' | 'dose_adjustment' | 'standard_dosing';
  clinicalImplication: string;
  therapeuticRecommendation: string;
  alternativeMedication?: {
    name: string;
    dosage: string;
    rationale: string;
  };
  guidelineCitation: string;
  pharmGkbUrl: string;
  alphaGenomeUrl: string;
}

export const DEFAULT_PGX_PROFILES: Record<string, { label: string; description: string; profile: PgxGenotypeProfile }> = {
  cardiovascular_high_risk: {
    label: 'Cardiovascular PGx Risk (CYP2C19 *2/*2 + SLCO1B1 C/C)',
    description: 'Clopidogrel Poor Metabolizer + Statin Myopathy Transporter Defect',
    profile: {
      cyp2c19: '*2/*2 (Poor Metabolizer)',
      slco1b1: 'rs4149056 C/C (Poor Function)',
      cyp2d6: '*1/*1 (Normal Metabolizer)',
      hlaB5701: 'Negative',
      hlaB1502: 'Negative',
      cyp2c9Vkorc1: 'CYP2C9 *1/*1 + VKORC1 G/G (Normal Sensitivity)',
    },
  },
  opioid_ultrarapid_hla: {
    label: 'CYP2D6 Ultrarapid + HLA-B*15:02 Carrier',
    description: 'High risk of fatal morphine toxicity from Codeine/Tramadol & SJS/TEN with Carbamazepine',
    profile: {
      cyp2c19: '*1/*2 (Intermediate Metabolizer)',
      slco1b1: 'rs4149056 T/C (Decreased Function)',
      cyp2d6: '*1/*2xN (Ultrarapid Metabolizer)',
      hlaB5701: 'Negative',
      hlaB1502: 'Positive (High Risk Carrier)',
      cyp2c9Vkorc1: 'CYP2C9 *1/*3 + VKORC1 A/G (Intermediate Sensitivity)',
    },
  },
  warfarin_hypersensitive: {
    label: 'Warfarin & Abacavir High-Risk Panel',
    description: 'CYP2C9 *3/*3 + VKORC1 A/A Severe Over-Anticoagulation Risk + HLA-B*57:01 Positive',
    profile: {
      cyp2c19: '*1/*1 (Normal Metabolizer)',
      slco1b1: 'rs4149056 T/T (Normal Function)',
      cyp2d6: '*4/*4 (Poor Metabolizer)',
      hlaB5701: 'Positive (High Risk Carrier)',
      hlaB1502: 'Negative',
      cyp2c9Vkorc1: 'CYP2C9 *3/*3 + VKORC1 A/A (High Sensitivity / Bleed Risk)',
    },
  },
  wildtype_normal: {
    label: 'Reference Wild-Type Panel (All Normal Metabolizers)',
    description: 'Standard CPIC dosing across all tested pharmacogenes',
    profile: {
      cyp2c19: '*1/*1 (Normal Metabolizer)',
      slco1b1: 'rs4149056 T/T (Normal Function)',
      cyp2d6: '*1/*1 (Normal Metabolizer)',
      hlaB5701: 'Negative',
      hlaB1502: 'Negative',
      cyp2c9Vkorc1: 'CYP2C9 *1/*1 + VKORC1 G/G (Normal Sensitivity)',
    },
  },
};

export function evaluateCpicPharmacogenomics(
  profile: PgxGenotypeProfile,
  activeMedications: string[] = []
): CpicRecommendation[] {
  const results: CpicRecommendation[] = [];
  const medsJoined = activeMedications.join(' ').toLowerCase();

  // 1. CYP2C19 x Clopidogrel / Antiplatelets
  if (profile.cyp2c19.includes('*2/*2') || profile.cyp2c19.includes('*1/*2')) {
    const isPoor = profile.cyp2c19.includes('*2/*2');
    results.push({
      id: 'cpic-cyp2c19-clopidogrel',
      gene: 'CYP2C19',
      diplotype: isPoor ? '*2/*2 (rs4244285 A/A)' : '*1/*2 (rs4244285 G/A)',
      phenotype: isPoor ? 'Poor Metabolizer (Activity Score 0.0)' : 'Intermediate Metabolizer (Activity Score 1.0)',
      affectedDrug: medsJoined.includes('clopidogrel') ? 'Clopidogrel (Active Order)' : 'Clopidogrel (Plavix)',
      cpicLevel: 'CPIC Level A (Strong)',
      severity: 'contraindicated',
      clinicalImplication:
        'Significantly reduced bioactivation of prodrug clopidogrel to its active thiol metabolite, resulting in high on-treatment platelet reactivity and increased risk of stent thrombosis, MI, and stroke (FDA Boxed Warning).',
      therapeuticRecommendation:
        'Avoid Clopidogrel in ACS/PCI or neurovascular indications. Substitute alternative P2Y12 inhibitor not dependent on CYP2C19 bioactivation (Prasugrel or Ticagrelor) if no contraindication.',
      alternativeMedication: {
        name: 'Ticagrelor',
        dosage: '90 mg PO BID (after 180 mg loading dose)',
        rationale: 'Direct-acting reversible P2Y12 receptor antagonist unaffected by CYP2C19 loss-of-function alleles.',
      },
      guidelineCitation: 'Lee CR et al. CPIC Guideline for CYP2C19 Genotype and Clopidogrel Therapy (Clin Pharmacol Ther 2022; PMID: 35034351)',
      pharmGkbUrl: 'https://www.pharmgkb.org/guidelineAnnotation/PA166104948',
      alphaGenomeUrl: 'https://deepmind.google.com/science/alphagenome/atlas?q=chr10:94781859:G%3EA&m=variant',
    });
  } else {
    results.push({
      id: 'cpic-cyp2c19-normal',
      gene: 'CYP2C19',
      diplotype: profile.cyp2c19.split(' ')[0],
      phenotype: profile.cyp2c19,
      affectedDrug: 'Clopidogrel',
      cpicLevel: 'CPIC Level A (Strong)',
      severity: 'standard_dosing',
      clinicalImplication: 'Expected normal hepatic bioactivation of clopidogrel to active thiol metabolite.',
      therapeuticRecommendation: 'Use standard label-recommended dosage (75 mg PO once daily maintenance).',
      guidelineCitation: 'CPIC CYP2C19-Clopidogrel Guideline (PMID: 35034351)',
      pharmGkbUrl: 'https://www.pharmgkb.org/guidelineAnnotation/PA166104948',
      alphaGenomeUrl: 'https://deepmind.google.com/science/alphagenome/atlas?q=CYP2C19&m=locus',
    });
  }

  // 2. SLCO1B1 x Statins (Simvastatin / Atorvastatin)
  if (profile.slco1b1.includes('C/C') || profile.slco1b1.includes('T/C')) {
    const isPoor = profile.slco1b1.includes('C/C');
    results.push({
      id: 'cpic-slco1b1-statin',
      gene: 'SLCO1B1',
      diplotype: isPoor ? '*5/*5 (rs4149056 C/C)' : '*1/*5 (rs4149056 T/C)',
      phenotype: isPoor ? 'Poor OATP1B1 Transporter Function' : 'Decreased OATP1B1 Transporter Function',
      affectedDrug: /simvastatin|atorvastatin/i.test(medsJoined)
        ? 'Simvastatin / Atorvastatin (Active Order)'
        : 'Simvastatin / High-Dose Atorvastatin',
      cpicLevel: 'CPIC Level A (Strong)',
      severity: isPoor ? 'contraindicated' : 'dose_adjustment',
      clinicalImplication:
        'Impaired hepatic OATP1B1 uptake increases systemic plasma statin AUC by up to 221% (Simvastatin acid), markedly elevating risk of statin-associated musculoskeletal symptoms (SAMS) and rhabdomyolysis.',
      therapeuticRecommendation: isPoor
        ? 'Avoid Simvastatin and high-intensity Atorvastatin (80 mg). Prescribe Rosuvastatin ≤ 20 mg/day or Pravastatin ≤ 40 mg/day.'
        : 'Avoid Simvastatin > 20 mg/day; limit Atorvastatin to ≤ 40 mg/day or switch to Rosuvastatin.',
      alternativeMedication: {
        name: 'Rosuvastatin',
        dosage: '20 mg PO Once Daily',
        rationale: 'High-potency hydrophilic statin with lower SLCO1B1-mediated myopathy risk at ≤ 20 mg/day.',
      },
      guidelineCitation: 'Cooper-DeHoff RM et al. CPIC Guideline for Statins and SLCO1B1, ABCG2, and CYP2C9 (Clin Pharmacol Ther 2022; PMID: 35152405)',
      pharmGkbUrl: 'https://www.pharmgkb.org/guidelineAnnotation/PA166105005',
      alphaGenomeUrl: 'https://deepmind.google.com/science/alphagenome/atlas?q=chr12:21178615:T%3EC&m=variant',
    });
  }

  // 3. CYP2D6 x Codeine / Tramadol
  if (profile.cyp2d6.includes('Ultrarapid') || profile.cyp2d6.includes('Poor')) {
    const isUltra = profile.cyp2d6.includes('Ultrarapid');
    results.push({
      id: 'cpic-cyp2d6-opioids',
      gene: 'CYP2D6',
      diplotype: isUltra ? '*1/*2xN (Gene Duplication)' : '*4/*4 (Loss of Function)',
      phenotype: isUltra ? 'Ultrarapid Metabolizer (AS > 2.25)' : 'Poor Metabolizer (AS = 0.0)',
      affectedDrug: 'Codeine / Tramadol',
      cpicLevel: 'CPIC Level A (Strong)',
      severity: 'contraindicated',
      clinicalImplication: isUltra
        ? 'Excessive O-demethylation of Codeine to Morphine (or Tramadol to O-desmethyltramadol) causes life-threatening respiratory depression and opioid overdose even at standard therapeutic doses.'
        : 'Minimal conversion of prodrug Codeine/Tramadol to active analgesic metabolite results in therapeutic failure and inadequate pain control.',
      therapeuticRecommendation:
        'Avoid Codeine and Tramadol completely. Select a non-CYP2D6 analgesic (e.g., Acetaminophen, NSAID if renally safe, or Morphine/Hydromorphone if opioid is indicated).',
      alternativeMedication: {
        name: 'Acetaminophen',
        dosage: '650 mg PO Q6H PRN',
        rationale: 'Analgesic efficacy independent of CYP2D6 O-demethylation pathway.',
      },
      guidelineCitation: 'Crews KR et al. CPIC Guideline for CYP2D6, OPRM1, and COMT Genotypes and Select Opioid Therapy (PMID: 33387367)',
      pharmGkbUrl: 'https://www.pharmgkb.org/guidelineAnnotation/PA166104996',
      alphaGenomeUrl: 'https://deepmind.google.com/science/alphagenome/atlas?q=CYP2D6&m=locus',
    });
  }

  // 4. HLA-B*57:01 x Abacavir
  if (profile.hlaB5701.includes('Positive')) {
    results.push({
      id: 'cpic-hlab5701-abacavir',
      gene: 'HLA-B',
      diplotype: 'HLA-B*57:01 Positive',
      phenotype: 'High-Risk Immunogenetic Carrier',
      affectedDrug: 'Abacavir',
      cpicLevel: 'CPIC Level A (Strong)',
      severity: 'contraindicated',
      clinicalImplication:
        '~50% positive predictive value for potentially fatal immunologically mediated Abacavir Hypersensitivity Syndrome (fever, rash, GI/respiratory distress, shock).',
      therapeuticRecommendation:
        'Abacavir is strictly CONTRAINDICATED. Document HLA-B*57:01 positivity in the permanent Allergy/Adverse Reaction record.',
      guidelineCitation: 'Martin MA et al. CPIC Guidelines for HLA-B Genotype and Abacavir Dosing (PMID: 24561393)',
      pharmGkbUrl: 'https://www.pharmgkb.org/guidelineAnnotation/PA166104995',
      alphaGenomeUrl: 'https://deepmind.google.com/science/alphagenome/atlas?q=HLA-B&m=locus',
    });
  }

  // 5. HLA-B*15:02 x Carbamazepine / Phenytoin
  if (profile.hlaB1502.includes('Positive')) {
    results.push({
      id: 'cpic-hlab1502-carbamazepine',
      gene: 'HLA-B',
      diplotype: 'HLA-B*15:02 Positive',
      phenotype: 'High-Risk Cutaneous Adverse Reaction Carrier',
      affectedDrug: 'Carbamazepine / Oxcarbazepine / Phenytoin',
      cpicLevel: 'CPIC Level A (Strong)',
      severity: 'contraindicated',
      clinicalImplication:
        'Markedly elevated risk of life-threatening Stevens-Johnson Syndrome (SJS) and Toxic Epidermal Necrolysis (TEN) via T-cell receptor activation.',
      therapeuticRecommendation:
        'Avoid Carbamazepine, Oxcarbazepine, and Phenytoin. Use non-aromatic antiepileptic alternative (e.g., Levetiracetam or Valproate).',
      alternativeMedication: {
        name: 'Levetiracetam',
        dosage: '500 mg PO BID',
        rationale: 'Non-aromatic anticonvulsant without HLA-B*15:02 SJS/TEN association.',
      },
      guidelineCitation: 'Phillips EJ et al. CPIC Guideline for HLA Genotype and Use of Carbamazepine and Oxcarbazepine (PMID: 29392710)',
      pharmGkbUrl: 'https://www.pharmgkb.org/guidelineAnnotation/PA166104949',
      alphaGenomeUrl: 'https://deepmind.google.com/science/alphagenome/atlas?q=HLA-B&m=locus',
    });
  }

  // 6. CYP2C9 + VKORC1 x Warfarin
  if (profile.cyp2c9Vkorc1.includes('Intermediate') || profile.cyp2c9Vkorc1.includes('High Sensitivity')) {
    const isSevere = profile.cyp2c9Vkorc1.includes('High Sensitivity');
    results.push({
      id: 'cpic-warfarin-cyp2c9-vkorc1',
      gene: 'CYP2C9 / VKORC1',
      diplotype: profile.cyp2c9Vkorc1.split(' (')[0],
      phenotype: isSevere ? 'Severely Reduced S-Warfarin Clearance + Low VKORC1 Expression' : 'Moderately Reduced Warfarin Requirement',
      affectedDrug: 'Warfarin',
      cpicLevel: 'CPIC Level A (Strong)',
      severity: isSevere ? 'contraindicated' : 'dose_adjustment',
      clinicalImplication: isSevere
        ? 'Dramatically prolonged S-warfarin half-life and heightened VKORC1 target sensitivity lead to rapid supratherapeutic INR (>4.0) and major hemorrhage at standard 5 mg/day initiation.'
        : 'Reduced hepatic S-warfarin hydroxylation requires 25–40% lower maintenance dose.',
      therapeuticRecommendation: isSevere
        ? 'Prefer Direct Oral Anticoagulant (Apixaban or Rivaroxaban) if renally appropriate. If Warfarin is mandatory, reduce initial dose by 60–75% (≤ 1.5 mg/day) with frequent INR monitoring.'
        : 'Initiate Warfarin at reduced dose (3 mg PO daily) using IWPC/Gage pharmacogenetic dosing algorithm or switch to Apixaban.',
      alternativeMedication: {
        name: 'Apixaban',
        dosage: '5 mg PO BID (or 2.5 mg BID if ≥2 dose-reduction criteria)',
        rationale: 'Direct Factor Xa inhibitor unaffected by CYP2C9 or VKORC1 genetic polymorphisms.',
      },
      guidelineCitation: 'Johnson JA et al. CPIC Guideline for Pharmacogenetics-Guided Warfarin Dosing (PMID: 28198005)',
      pharmGkbUrl: 'https://www.pharmgkb.org/guidelineAnnotation/PA166104947',
      alphaGenomeUrl: 'https://deepmind.google.com/science/alphagenome/atlas?q=CYP2C9&m=locus',
    });
  }

  return results;
}
