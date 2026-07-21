/**
 * Medication Database & Interactions
 * 
 * Comprehensive database of medications and their known interactions
 * with essential oils. Based on scientific literature and established
 * pharmacological data.
 * 
 * DISCLAIMER: This is for guidance only. Always consult healthcare providers.
 */

import { type InsertMedication, type InsertOilMedicationInteraction } from '@/lib/db/schema/safety-comprehensive';

// ============================================================================
// MEDICATIONS DATABASE
// ============================================================================

export const COMMON_MEDICATIONS: InsertMedication[] = [
  // ANTICOAGULANTS / ANTIPLATELETS (Blood Thinners)
  {
    genericName: 'Warfarin',
    brandNames: ['Coumadin', 'Jantoven'],
    drugClass: 'Anticoagulant (Vitamin K Antagonist)',
    searchTerms: ['warfarin', 'coumadin', 'blood thinner', 'anticoagulant', 'vitamin k'],
    affectsBloodClotting: true,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: false,
    affectsHeart: false,
    metabolismPathway: 'CYP2C9, CYP1A2, CYP3A4',
  },
  {
    genericName: 'Apixaban',
    brandNames: ['Eliquis'],
    drugClass: 'Direct Oral Anticoagulant (Factor Xa Inhibitor)',
    searchTerms: ['apixaban', 'eliquis', 'blood thinner', 'anticoagulant', 'factor xa'],
    affectsBloodClotting: true,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: true,
    affectsCns: false,
    affectsHeart: false,
    metabolismPathway: 'CYP3A4, CYP1A2, CYP2C8, CYP2C9, CYP2C19, CYP2J2',
  },
  {
    genericName: 'Rivaroxaban',
    brandNames: ['Xarelto'],
    drugClass: 'Direct Oral Anticoagulant (Factor Xa Inhibitor)',
    searchTerms: ['rivaroxaban', 'xarelto', 'blood thinner', 'anticoagulant'],
    affectsBloodClotting: true,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: true,
    affectsCns: false,
    affectsHeart: false,
    metabolismPathway: 'CYP3A4, CYP2J2',
  },
  {
    genericName: 'Dabigatran',
    brandNames: ['Pradaxa'],
    drugClass: 'Direct Thrombin Inhibitor',
    searchTerms: ['dabigatran', 'pradaxa', 'blood thinner', 'anticoagulant'],
    affectsBloodClotting: true,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: false,
    affectsKidney: true,
    affectsCns: false,
    affectsHeart: false,
  },
  {
    genericName: 'Aspirin',
    brandNames: ['Bayer', 'Bufferin', 'Ecotrin'],
    drugClass: 'Antiplatelet / NSAID',
    searchTerms: ['aspirin', 'acetylsalicylic acid', 'asa', 'bayer', 'antiplatelet'],
    affectsBloodClotting: true,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: true,
    affectsCns: false,
    affectsHeart: false,
  },
  {
    genericName: 'Clopidogrel',
    brandNames: ['Plavix'],
    drugClass: 'Antiplatelet (P2Y12 Inhibitor)',
    searchTerms: ['clopidogrel', 'plavix', 'antiplatelet', 'blood thinner'],
    affectsBloodClotting: true,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: false,
    affectsHeart: false,
    metabolismPathway: 'CYP2C19 (prodrug activation)',
  },
  {
    genericName: 'Heparin',
    brandNames: ['Hep-Lock', 'Heparin Sodium'],
    drugClass: 'Anticoagulant',
    searchTerms: ['heparin', 'unfractionated heparin', 'blood thinner'],
    affectsBloodClotting: true,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: false,
    affectsKidney: false,
    affectsCns: false,
    affectsHeart: false,
  },

  // BLOOD PRESSURE MEDICATIONS
  {
    genericName: 'Lisinopril',
    brandNames: ['Prinivil', 'Zestril', 'QBRELIS'],
    drugClass: 'ACE Inhibitor',
    searchTerms: ['lisinopril', 'ace inhibitor', 'blood pressure', 'hypertension', 'prinivil', 'zestril'],
    affectsBloodClotting: false,
    affectsBloodPressure: true,
    affectsBloodSugar: false,
    affectsLiver: false,
    affectsKidney: true,
    affectsCns: false,
    affectsHeart: true,
  },
  {
    genericName: 'Amlodipine',
    brandNames: ['Norvasc', 'Katerzia'],
    drugClass: 'Calcium Channel Blocker',
    searchTerms: ['amlodipine', 'calcium channel blocker', 'blood pressure', 'norvasc'],
    affectsBloodClotting: false,
    affectsBloodPressure: true,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: false,
    affectsHeart: true,
    metabolismPathway: 'CYP3A4',
  },
  {
    genericName: 'Metoprolol',
    brandNames: ['Lopressor', 'Toprol XL', 'Kapspargo'],
    drugClass: 'Beta Blocker (Cardioselective)',
    searchTerms: ['metoprolol', 'beta blocker', 'blood pressure', 'lopressor', 'toprol'],
    affectsBloodClotting: false,
    affectsBloodPressure: true,
    affectsBloodSugar: true, // Can mask hypoglycemia symptoms
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: true,
    metabolismPathway: 'CYP2D6',
  },
  {
    genericName: 'Losartan',
    brandNames: ['Cozaar'],
    drugClass: 'ARB (Angiotensin Receptor Blocker)',
    searchTerms: ['losartan', 'arb', 'angiotensin', 'blood pressure', 'cozaar'],
    affectsBloodClotting: false,
    affectsBloodPressure: true,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: true,
    affectsCns: false,
    affectsHeart: true,
    metabolismPathway: 'CYP2C9, CYP3A4',
  },
  {
    genericName: 'Hydrochlorothiazide',
    brandNames: ['Microzide'],
    drugClass: 'Thiazide Diuretic',
    searchTerms: ['hydrochlorothiazide', 'hctz', 'diuretic', 'water pill', 'blood pressure'],
    affectsBloodClotting: false,
    affectsBloodPressure: true,
    affectsBloodSugar: true, // Can raise blood sugar
    affectsLiver: false,
    affectsKidney: true,
    affectsCns: false,
    affectsHeart: false,
  },
  {
    genericName: 'Atenolol',
    brandNames: ['Tenormin'],
    drugClass: 'Beta Blocker (Cardioselective)',
    searchTerms: ['atenolol', 'beta blocker', 'blood pressure', 'tenormin'],
    affectsBloodClotting: false,
    affectsBloodPressure: true,
    affectsBloodSugar: true,
    affectsLiver: true,
    affectsKidney: true,
    affectsCns: false,
    affectsHeart: true,
  },

  // DIABETES MEDICATIONS
  {
    genericName: 'Metformin',
    brandNames: ['Glucophage', 'Fortamet', 'Glumetza', 'Riomet'],
    drugClass: 'Biguanide (Antidiabetic)',
    searchTerms: ['metformin', 'glucophage', 'diabetes', 'blood sugar', 'insulin resistance'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: true,
    affectsLiver: false,
    affectsKidney: true,
    affectsCns: false,
    affectsHeart: false,
  },
  {
    genericName: 'Insulin',
    brandNames: ['Humalog', 'Novolog', 'Lantus', 'Levemir', 'Tresiba'],
    drugClass: 'Insulin (Antidiabetic)',
    searchTerms: ['insulin', 'humalog', 'novolog', 'lantus', 'diabetes', 'blood sugar'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: true,
    affectsLiver: false,
    affectsKidney: false,
    affectsCns: false,
    affectsHeart: false,
  },
  {
    genericName: 'Glipizide',
    brandNames: ['Glucotrol'],
    drugClass: 'Sulfonylurea (Antidiabetic)',
    searchTerms: ['glipizide', 'glucotrol', 'sulfonylurea', 'diabetes', 'blood sugar'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: true,
    affectsLiver: true,
    affectsKidney: true,
    affectsCns: false,
    affectsHeart: false,
    metabolismPathway: 'CYP2C9',
  },
  {
    genericName: 'Sitagliptin',
    brandNames: ['Januvia'],
    drugClass: 'DPP-4 Inhibitor',
    searchTerms: ['sitagliptin', 'januvia', 'dpp4', 'diabetes', 'blood sugar'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: true,
    affectsLiver: true,
    affectsKidney: true,
    affectsCns: false,
    affectsHeart: false,
  },

  // ANTIDEPRESSANTS
  {
    genericName: 'Sertraline',
    brandNames: ['Zoloft'],
    drugClass: 'SSRI (Selective Serotonin Reuptake Inhibitor)',
    searchTerms: ['sertraline', 'zoloft', 'ssri', 'antidepressant', 'depression', 'anxiety'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: false,
    metabolismPathway: 'CYP2B6, CYP2C9, CYP2C19, CYP2D6, CYP3A4',
  },
  {
    genericName: 'Fluoxetine',
    brandNames: ['Prozac', 'Sarafem'],
    drugClass: 'SSRI',
    searchTerms: ['fluoxetine', 'prozac', 'ssri', 'antidepressant', 'depression'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: true, // QT prolongation risk
    metabolismPathway: 'CYP2D6 (strong inhibitor)',
  },
  {
    genericName: 'Escitalopram',
    brandNames: ['Lexapro', 'Cipralex'],
    drugClass: 'SSRI',
    searchTerms: ['escitalopram', 'lexapro', 'ssri', 'antidepressant'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: true, // QT prolongation at high doses
    metabolismPathway: 'CYP2C19, CYP2D6, CYP3A4',
  },
  {
    genericName: 'Venlafaxine',
    brandNames: ['Effexor XR'],
    drugClass: 'SNRI (Serotonin-Norepinephrine Reuptake Inhibitor)',
    searchTerms: ['venlafaxine', 'effexor', 'snri', 'antidepressant'],
    affectsBloodClotting: false,
    affectsBloodPressure: true, // Can raise BP
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: true,
    affectsCns: true,
    affectsHeart: true, // Can raise heart rate
    metabolismPathway: 'CYP2D6',
  },
  {
    genericName: 'Bupropion',
    brandNames: ['Wellbutrin', 'Zyban'],
    drugClass: 'NDRI (Norepinephrine-Dopamine Reuptake Inhibitor)',
    searchTerms: ['bupropion', 'wellbutrin', 'ndri', 'antidepressant', 'smoking cessation'],
    affectsBloodClotting: false,
    affectsBloodPressure: true, // Can raise BP
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: true,
    metabolismPathway: 'CYP2B6',
  },
  {
    genericName: 'Trazodone',
    brandNames: ['Desyrel', 'Oleptro'],
    drugClass: 'SARI (Serotonin Antagonist and Reuptake Inhibitor)',
    searchTerms: ['trazodone', 'desyrel', 'sari', 'antidepressant', 'sleep aid'],
    affectsBloodClotting: false,
    affectsBloodPressure: true, // Orthostatic hypotension
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: true, // QT prolongation
    metabolismPathway: 'CYP2D6, CYP3A4',
  },
  {
    genericName: 'Mirtazapine',
    brandNames: ['Remeron'],
    drugClass: 'NaSSA (Noradrenergic and Specific Serotonergic Antidepressant)',
    searchTerms: ['mirtazapine', 'remeron', 'nassa', 'antidepressant'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: true, // Can affect glucose
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: false,
    metabolismPathway: 'CYP1A2, CYP2D6, CYP3A4',
  },

  // ANTIANXIETY / SEDATIVES
  {
    genericName: 'Alprazolam',
    brandNames: ['Xanax'],
    drugClass: 'Benzodiazepine',
    searchTerms: ['alprazolam', 'xanax', 'benzodiazepine', 'anxiety', 'sedative'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: false,
    metabolismPathway: 'CYP3A4',
  },
  {
    genericName: 'Lorazepam',
    brandNames: ['Ativan'],
    drugClass: 'Benzodiazepine',
    searchTerms: ['lorazepam', 'ativan', 'benzodiazepine', 'anxiety', 'sedative'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: true,
    affectsCns: true,
    affectsHeart: false,
  },
  {
    genericName: 'Clonazepam',
    brandNames: ['Klonopin', 'Rivotril'],
    drugClass: 'Benzodiazepine',
    searchTerms: ['clonazepam', 'klonopin', 'benzodiazepine', 'anxiety', 'seizure'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: false,
    metabolismPathway: 'CYP3A4',
  },
  {
    genericName: 'Diazepam',
    brandNames: ['Valium'],
    drugClass: 'Benzodiazepine',
    searchTerms: ['diazepam', 'valium', 'benzodiazepine', 'anxiety', 'muscle relaxant'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: false,
    metabolismPathway: 'CYP2C19, CYP3A4',
  },
  {
    genericName: 'Zolpidem',
    brandNames: ['Ambien'],
    drugClass: 'Non-Benzodiazepine Hypnotic (Z-Drug)',
    searchTerms: ['zolpidem', 'ambien', 'sleep aid', 'insomnia', 'z-drug'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: false,
    metabolismPathway: 'CYP3A4, CYP1A2, CYP2C9',
  },

  // ANTIEPILEPTICS
  {
    genericName: 'Valproic Acid',
    brandNames: ['Depakote', 'Depakene', 'Stavzor'],
    drugClass: 'Anticonvulsant (Multiple Mechanisms)',
    searchTerms: ['valproic acid', 'valproate', 'depakote', 'antiepileptic', 'seizure', 'mood stabilizer'],
    affectsBloodClotting: true, // Can affect platelets
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true, // Hepatotoxicity risk
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: false,
    metabolismPathway: 'Multiple (not CYP dependent)',
  },
  {
    genericName: 'Carbamazepine',
    brandNames: ['Tegretol', 'Carbatrol', 'Epitol'],
    drugClass: 'Anticonvulsant (Sodium Channel Blocker)',
    searchTerms: ['carbamazepine', 'tegretol', 'antiepileptic', 'seizure', 'mood stabilizer'],
    affectsBloodClotting: true, // Affects blood cell counts
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: true,
    metabolismPathway: 'CYP3A4 (strong inducer), CYP1A2, CYP2C8',
  },
  {
    genericName: 'Lamotrigine',
    brandNames: ['Lamictal'],
    drugClass: 'Anticonvulsant (Sodium Channel Blocker)',
    searchTerms: ['lamotrigine', 'lamictal', 'antiepileptic', 'seizure', 'mood stabilizer'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: true,
    affectsCns: true,
    affectsHeart: false,
    metabolismPathway: 'Glucuronidation (UGT1A4)',
  },
  {
    genericName: 'Phenytoin',
    brandNames: ['Dilantin', 'Phenytek'],
    drugClass: 'Anticonvulsant (Sodium Channel Blocker)',
    searchTerms: ['phenytoin', 'dilantin', 'antiepileptic', 'seizure'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: true, // Can affect glucose
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: true,
    metabolismPathway: 'CYP2C9, CYP2C19',
  },

  // HORMONAL MEDICATIONS
  {
    genericName: 'Levothyroxine',
    brandNames: ['Synthroid', 'Levoxyl', 'Tirosint'],
    drugClass: 'Thyroid Hormone Replacement',
    searchTerms: ['levothyroxine', 'synthroid', 'thyroid', 'hypothyroidism', 't4'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: false,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: true,
  },
  {
    genericName: 'Ethinyl Estradiol / Norgestimate',
    brandNames: ['Ortho Tri-Cyclen', 'Sprintec'],
    drugClass: 'Oral Contraceptive (Estrogen/Progestin)',
    searchTerms: ['birth control', 'oral contraceptive', 'estrogen', 'progestin', 'hormone'],
    affectsBloodClotting: true, // Increased clotting risk
    affectsBloodPressure: true, // Can raise BP
    affectsBloodSugar: true, // Can affect glucose tolerance
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: false,
    affectsHeart: true,
    metabolismPathway: 'CYP3A4',
  },
  {
    genericName: 'Tamoxifen',
    brandNames: ['Nolvadex', 'Soltamox'],
    drugClass: 'Selective Estrogen Receptor Modulator (SERM)',
    searchTerms: ['tamoxifen', 'nolvadex', 'serm', 'breast cancer', 'estrogen blocker'],
    affectsBloodClotting: true, // Increased clotting risk
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true, // Hepatotoxicity risk
    affectsKidney: false,
    affectsCns: false,
    affectsHeart: true,
    metabolismPathway: 'CYP2D6 (prodrug activation)',
  },
  {
    genericName: 'Testosterone',
    brandNames: ['AndroGel', 'Testim', 'Depo-Testosterone'],
    drugClass: 'Androgen (Hormone Replacement)',
    searchTerms: ['testosterone', 'androgen', 'trt', 'hormone replacement', 'andro'],
    affectsBloodClotting: true, // Can increase RBC
    affectsBloodPressure: true, // Can affect BP
    affectsBloodSugar: true, // Can affect insulin sensitivity
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: true,
    metabolismPathway: 'CYP3A4, CYP2C9',
  },

  // CHEMOTHERAPY / CANCER TREATMENTS
  {
    genericName: 'Methotrexate',
    brandNames: ['Rheumatrex', 'Trexall', 'Otrexup'],
    drugClass: 'Antimetabolite (DMARD/Chemotherapy)',
    searchTerms: ['methotrexate', 'mtx', 'chemotherapy', 'rheumatoid arthritis', 'cancer'],
    affectsBloodClotting: true, // Bone marrow suppression
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true, // Hepatotoxicity
    affectsKidney: true, // Nephrotoxicity
    affectsCns: true, // Neurotoxicity at high doses
    affectsHeart: false,
    metabolismPathway: 'Multiple transporters',
  },
  {
    genericName: 'Doxorubicin',
    brandNames: ['Adriamycin', 'Doxil'],
    drugClass: 'Anthracycline (Chemotherapy)',
    searchTerms: ['doxorubicin', 'adriamycin', 'chemotherapy', 'anthracycline'],
    affectsBloodClotting: true, // Bone marrow suppression
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: false,
    affectsHeart: true, // Cardiotoxicity
  },

  // IMMUNOSUPPRESSANTS
  {
    genericName: 'Prednisone',
    brandNames: ['Deltasone', 'Rayos'],
    drugClass: 'Corticosteroid (Glucocorticoid)',
    searchTerms: ['prednisone', 'steroid', 'corticosteroid', 'glucocorticoid', 'anti-inflammatory'],
    affectsBloodClotting: true, // Can affect clotting
    affectsBloodPressure: true, // Can raise BP
    affectsBloodSugar: true, // Raises blood sugar
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: true,
    metabolismPathway: 'CYP3A4',
  },
  {
    genericName: 'Methylprednisolone',
    brandNames: ['Medrol'],
    drugClass: 'Corticosteroid',
    searchTerms: ['methylprednisolone', 'medrol', 'steroid', 'corticosteroid'],
    affectsBloodClotting: true,
    affectsBloodPressure: true,
    affectsBloodSugar: true,
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: true,
    metabolismPathway: 'CYP3A4',
  },
  {
    genericName: 'Cyclosporine',
    brandNames: ['Neoral', 'Sandimmune', 'Gengraf'],
    drugClass: 'Calcineurin Inhibitor (Immunosuppressant)',
    searchTerms: ['cyclosporine', 'neoral', 'immunosuppressant', 'transplant'],
    affectsBloodClotting: false,
    affectsBloodPressure: true, // Nephrotoxicity raises BP
    affectsBloodSugar: true, // Can cause diabetes
    affectsLiver: true,
    affectsKidney: true, // Nephrotoxic
    affectsCns: true,
    affectsHeart: true,
    metabolismPathway: 'CYP3A4',
  },
  {
    genericName: 'Tacrolimus',
    brandNames: ['Prograf', 'Envarsus XR', 'Astagraf XL'],
    drugClass: 'Calcineurin Inhibitor (Immunosuppressant)',
    searchTerms: ['tacrolimus', 'prograf', 'fk506', 'immunosuppressant', 'transplant'],
    affectsBloodClotting: false,
    affectsBloodPressure: true,
    affectsBloodSugar: true, // Can cause diabetes
    affectsLiver: true,
    affectsKidney: true, // Nephrotoxic
    affectsCns: true,
    affectsHeart: true, // Cardiotoxic
    metabolismPathway: 'CYP3A4, CYP3A5',
  },

  // PAIN MEDICATIONS
  {
    genericName: 'Tramadol',
    brandNames: ['Ultram', 'ConZip'],
    drugClass: 'Opioid Analgesic (Synthetic)',
    searchTerms: ['tramadol', 'ultram', 'opioid', 'pain', 'analgesic'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: true,
    affectsCns: true,
    affectsHeart: true, // QT prolongation, serotonin syndrome risk
    metabolismPathway: 'CYP2D6 (prodrug activation)',
  },
  {
    genericName: 'Codeine',
    brandNames: ['Tylenol with Codeine #3', 'Tylenol with Codeine #4'],
    drugClass: 'Opioid Analgesic',
    searchTerms: ['codeine', 'opioid', 'pain', 'cough suppressant'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: false,
    metabolismPathway: 'CYP2D6 (prodrug activation)',
  },
  {
    genericName: 'Morphine',
    brandNames: ['MS Contin', 'Roxanol', 'Kadian'],
    drugClass: 'Opioid Analgesic',
    searchTerms: ['morphine', 'ms contin', 'opioid', 'pain', 'narcotic'],
    affectsBloodClotting: false,
    affectsBloodPressure: true, // Can lower BP
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: false,
    metabolismPathway: 'Glucuronidation (UGT2B7)',
  },
  {
    genericName: 'Oxycodone',
    brandNames: ['OxyContin', 'Percocet', 'Roxicodone'],
    drugClass: 'Opioid Analgesic',
    searchTerms: ['oxycodone', 'oxycontin', 'percocet', 'opioid', 'pain'],
    affectsBloodClotting: false,
    affectsBloodPressure: true, // Can lower BP
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: true,
    affectsCns: true,
    affectsHeart: false,
    metabolismPathway: 'CYP3A4, CYP2D6',
  },
  {
    genericName: 'Gabapentin',
    brandNames: ['Neurontin', 'Gralise', 'Horizant'],
    drugClass: 'Anticonvulsant / Neuropathic Pain Agent',
    searchTerms: ['gabapentin', 'neurontin', 'nerve pain', 'neuropathy'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: false,
    affectsKidney: true, // Renally eliminated
    affectsCns: true,
    affectsHeart: false,
  },
  {
    genericName: 'Pregabalin',
    brandNames: ['Lyrica'],
    drugClass: 'Anticonvulsant / Neuropathic Pain Agent',
    searchTerms: ['pregabalin', 'lyrica', 'nerve pain', 'fibromyalgia', 'neuropathy'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: false,
    affectsKidney: true, // Renally eliminated
    affectsCns: true,
    affectsHeart: false,
  },

  // OTHER COMMON MEDICATIONS
  {
    genericName: 'Ciprofloxacin',
    brandNames: ['Cipro'],
    drugClass: 'Fluoroquinolone Antibiotic',
    searchTerms: ['ciprofloxacin', 'cipro', 'antibiotic', 'fluoroquinolone'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: true, // Can affect glucose
    affectsLiver: true,
    affectsKidney: true,
    affectsCns: true, // Neurotoxicity risk
    affectsHeart: true, // QT prolongation
    metabolismPathway: 'CYP1A2, CYP3A4',
  },
  {
    genericName: 'Theophylline',
    brandNames: ['Theo-24', 'Uniphyl'],
    drugClass: 'Methylxanthine (Bronchodilator)',
    searchTerms: ['theophylline', 'asthma', 'copd', 'bronchodilator'],
    affectsBloodClotting: false,
    affectsBloodPressure: true, // Can raise BP, heart rate
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: true,
    metabolismPathway: 'CYP1A2',
  },
  {
    genericName: 'Digoxin',
    brandNames: ['Lanoxin'],
    drugClass: 'Cardiac Glycoside',
    searchTerms: ['digoxin', 'lanoxin', 'heart failure', 'arrhythmia', 'cardiac glycoside'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: false,
    affectsKidney: true, // Renally eliminated
    affectsCns: true,
    affectsHeart: true, // Narrow therapeutic index
  },
  {
    genericName: 'Lithium',
    brandNames: ['Lithobid', 'Eskalith'],
    drugClass: 'Mood Stabilizer',
    searchTerms: ['lithium', 'bipolar', 'mood stabilizer'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: false,
    affectsKidney: true, // Nephrotoxic
    affectsCns: true,
    affectsHeart: true, // Can affect thyroid
  },
  {
    genericName: 'St. John\'s Wort',
    brandNames: ['Various herbal supplements'],
    drugClass: 'Herbal Supplement (Antidepressant)',
    searchTerms: ['st johns wort', 'st. johns wort', 'hypericum', 'herbal', 'depression'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true, // Strong CYP inducer
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: false,
    metabolismPathway: 'CYP3A4, CYP2C9, CYP1A2, CYP2C19 (strong inducer)',
  },
  {
    genericName: 'Ginkgo Biloba',
    brandNames: ['Various herbal supplements'],
    drugClass: 'Herbal Supplement (Nootropic)',
    searchTerms: ['ginkgo', 'ginkgo biloba', 'herbal', 'memory'],
    affectsBloodClotting: true, // Antiplatelet effects
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: false,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: false,
  },
  {
    genericName: 'Garlic Supplements',
    brandNames: ['Various herbal supplements'],
    drugClass: 'Herbal Supplement',
    searchTerms: ['garlic', 'allicin', 'herbal', 'supplement'],
    affectsBloodClotting: true, // Antiplatelet effects
    affectsBloodPressure: true, // Can lower BP
    affectsBloodSugar: true, // Can lower blood sugar
    affectsLiver: false,
    affectsKidney: false,
    affectsCns: false,
    affectsHeart: false,
  },
  {
    genericName: 'Fish Oil / Omega-3',
    brandNames: ['Lovaza', 'Various supplements'],
    drugClass: 'Supplement (Fatty Acid)',
    searchTerms: ['fish oil', 'omega 3', 'omega-3', 'epa', 'dha', 'supplement'],
    affectsBloodClotting: true, // Anticoagulant effects at high doses
    affectsBloodPressure: true, // Can lower BP slightly
    affectsBloodSugar: false,
    affectsLiver: false,
    affectsKidney: false,
    affectsCns: false,
    affectsHeart: true, // Cardioprotective
  },
  {
    genericName: 'Vitamin E',
    brandNames: ['Various supplements'],
    drugClass: 'Vitamin / Antioxidant',
    searchTerms: ['vitamin e', 'tocopherol', 'supplement'],
    affectsBloodClotting: true, // Anticoagulant at high doses (>400 IU)
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: false,
    affectsKidney: false,
    affectsCns: false,
    affectsHeart: false,
  },
  
  // ============================================================================
  // MODERN MEDICATIONS (2020s) - GLP-1 Agonists, SGLT2 Inhibitors, Newer Agents
  // ============================================================================
  
  // GLP-1 RECEPTOR AGONISTS (Weight Loss / Diabetes)
  {
    genericName: 'Semaglutide',
    brandNames: ['Ozempic', 'Wegovy', 'Rybelsus'],
    drugClass: 'GLP-1 Receptor Agonist',
    searchTerms: ['semaglutide', 'ozempic', 'wegovy', 'rybelsus', 'glp-1', 'weight loss', 'diabetes'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: true,
    affectsLiver: false,
    affectsKidney: true, // Renal excretion
    affectsCns: true, // Nausea/vomiting centers
    affectsHeart: false,
    metabolismPathway: 'Proteolytic degradation', // Not CYP metabolized
  },
  {
    genericName: 'Tirzepatide',
    brandNames: ['Mounjaro', 'Zepbound'],
    drugClass: 'Dual GIP/GLP-1 Receptor Agonist',
    searchTerms: ['tirzepatide', 'mounjaro', 'zepbound', 'gip', 'glp-1', 'weight loss'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: true,
    affectsLiver: false,
    affectsKidney: true,
    affectsCns: true,
    affectsHeart: false,
    metabolismPathway: 'Proteolytic degradation',
  },
  {
    genericName: 'Liraglutide',
    brandNames: ['Victoza', 'Saxenda'],
    drugClass: 'GLP-1 Receptor Agonist',
    searchTerms: ['liraglutide', 'victoza', 'saxenda', 'glp-1'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: true,
    affectsLiver: false,
    affectsKidney: true,
    affectsCns: true,
    affectsHeart: false,
    metabolismPathway: 'General proteolysis',
  },
  {
    genericName: 'Dulaglutide',
    brandNames: ['Trulicity'],
    drugClass: 'GLP-1 Receptor Agonist',
    searchTerms: ['dulaglutide', 'trulicity', 'glp-1'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: true,
    affectsLiver: false,
    affectsKidney: true,
    affectsCns: true,
    affectsHeart: false,
    metabolismPathway: 'Catabolism to amino acids',
  },
  
  // SGLT2 INHIBITORS (Diabetes / Heart Failure)
  {
    genericName: 'Empagliflozin',
    brandNames: ['Jardiance'],
    drugClass: 'SGLT2 Inhibitor',
    searchTerms: ['empagliflozin', 'jardiance', 'sglt2', 'flozin', 'diabetes', 'heart failure'],
    affectsBloodClotting: false,
    affectsBloodPressure: true, // Mild diuretic effect
    affectsBloodSugar: true,
    affectsLiver: false,
    affectsKidney: true, // Acts on kidneys
    affectsCns: false,
    affectsHeart: true, // Cardioprotective
    metabolismPathway: 'UGT enzymes (glucuronidation)',
  },
  {
    genericName: 'Dapagliflozin',
    brandNames: ['Farxiga'],
    drugClass: 'SGLT2 Inhibitor',
    searchTerms: ['dapagliflozin', 'farxiga', 'sglt2', 'flozin'],
    affectsBloodClotting: false,
    affectsBloodPressure: true,
    affectsBloodSugar: true,
    affectsLiver: false,
    affectsKidney: true,
    affectsCns: false,
    affectsHeart: true,
    metabolismPathway: 'UGT1A9',
  },
  {
    genericName: 'Canagliflozin',
    brandNames: ['Invokana'],
    drugClass: 'SGLT2 Inhibitor',
    searchTerms: ['canagliflozin', 'invokana', 'sglt2'],
    affectsBloodClotting: false,
    affectsBloodPressure: true,
    affectsBloodSugar: true,
    affectsLiver: true, // Some hepatic metabolism
    affectsKidney: true,
    affectsCns: false,
    affectsHeart: true,
    metabolismPathway: 'O-glucuronidation, CYP3A4',
  },
  
  // NEWER ANTICOAGULANTS (DOACs beyond Apixaban/Rivaroxaban)
  {
    genericName: 'Edoxaban',
    brandNames: ['Lixiana', 'Savaysa'],
    drugClass: 'Direct Oral Anticoagulant (Factor Xa Inhibitor)',
    searchTerms: ['edoxaban', 'lixiana', 'savaysa', 'blood thinner', 'factor xa'],
    affectsBloodClotting: true,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: false,
    affectsKidney: true, // Renally cleared
    affectsCns: false,
    affectsHeart: false,
    metabolismPathway: 'P-gp substrate, minimal CYP metabolism',
  },
  {
    genericName: 'Betrixaban',
    brandNames: ['Bevyxxa'],
    drugClass: 'Direct Oral Anticoagulant (Factor Xa Inhibitor)',
    searchTerms: ['betrixaban', 'bevyxxa', 'factor xa', 'blood thinner'],
    affectsBloodClotting: true,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true, // CYP metabolism
    affectsKidney: true,
    affectsCns: false,
    affectsHeart: false,
    metabolismPathway: 'CYP2J2, CYP3A4/5, P-gp',
  },
  
  // PCSK9 INHIBITORS (Cholesterol)
  {
    genericName: 'Evolocumab',
    brandNames: ['Repatha'],
    drugClass: 'PCSK9 Inhibitor (Monoclonal Antibody)',
    searchTerms: ['evolocumab', 'repatha', 'pcsk9', 'cholesterol', 'statin alternative'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: false,
    affectsKidney: false,
    affectsCns: false,
    affectsHeart: true, // Cardiovascular risk reduction
    metabolismPathway: 'Reticuloendothelial system clearance',
  },
  {
    genericName: 'Alirocumab',
    brandNames: ['Praluent'],
    drugClass: 'PCSK9 Inhibitor (Monoclonal Antibody)',
    searchTerms: ['alirocumab', 'praluent', 'pcsk9', 'cholesterol'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: false,
    affectsKidney: false,
    affectsCns: false,
    affectsHeart: true,
    metabolismPathway: 'Reticuloendothelial clearance',
  },
  
  // SGLT1/2 DUAL INHIBITORS
  {
    genericName: 'Sotagliflozin',
    brandNames: ['Inpefa'],
    drugClass: 'SGLT1/SGLT2 Dual Inhibitor',
    searchTerms: ['sotagliflozin', 'inpefa', 'sglt1', 'sglt2'],
    affectsBloodClotting: false,
    affectsBloodPressure: true,
    affectsBloodSugar: true,
    affectsLiver: true,
    affectsKidney: true,
    affectsCns: false,
    affectsHeart: true,
    metabolismPathway: 'UGT1A1, UGT2B7',
  },
  
  // NEWER DIABETES MEDICATIONS
  {
    genericName: 'Pramlintide',
    brandNames: ['Symlin'],
    drugClass: 'Amylin Analog',
    searchTerms: ['pramlintide', 'symlin', 'amylin', 'diabetes', 'insulin adjunct'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: true,
    affectsLiver: false,
    affectsKidney: false,
    affectsCns: true, // Nausea/satiety
    affectsHeart: false,
    metabolismPathway: 'Renal metabolism',
  },
  
  // NON-INSULIN GLP-1/GIP COMBINATIONS
  {
    genericName: 'Cagrilintide/Semaglutide',
    brandNames: ['CagriSema (investigational)'],
    drugClass: 'Amylin Analog + GLP-1 Agonist Combo',
    searchTerms: ['cagrilintide', 'cagrisema', 'amylin', 'glp-1'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: true,
    affectsLiver: false,
    affectsKidney: true,
    affectsCns: true,
    affectsHeart: false,
    metabolismPathway: 'Proteolytic degradation',
  },
  
  // MODERN NSAIDs (COX-2 Selective and others)
  {
    genericName: 'Celecoxib',
    brandNames: ['Celebrex'],
    drugClass: 'COX-2 Selective NSAID',
    searchTerms: ['celecoxib', 'celebrex', 'cox-2', 'nsaid', 'arthritis'],
    affectsBloodClotting: true, // Mild antiplatelet
    affectsBloodPressure: true,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: true,
    affectsCns: false,
    affectsHeart: true, // Cardiovascular risk
    metabolismPathway: 'CYP2C9',
  },
  
  // NEWER ANTIDEPRESSANTS
  {
    genericName: 'Vortioxetine',
    brandNames: ['Trintellix', 'Brintellix'],
    drugClass: 'Multimodal Antidepressant',
    searchTerms: ['vortioxetine', 'trintellix', 'brintellix', 'antidepressant'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true, // Extensive hepatic metabolism
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: false,
    metabolismPathway: 'CYP2D6, CYP3A4/5',
  },
  {
    genericName: 'Brexipiprazole',
    brandNames: ['Rexulti'],
    drugClass: 'Atypical Antipsychotic (Dopamine D2/5-HT1A partial agonist)',
    searchTerms: ['brexpiprazole', 'rexulti', 'antipsychotic', 'depression adjunct'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: true, // Metabolic effects
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: false,
    metabolismPathway: 'CYP2D6, CYP3A4',
  },
  
  // JAK INHIBITORS (Autoimmune)
  {
    genericName: 'Tofacitinib',
    brandNames: ['Xeljanz'],
    drugClass: 'JAK Inhibitor',
    searchTerms: ['tofacitinib', 'xeljanz', 'jak inhibitor', 'rheumatoid arthritis', 'autoimmune'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: true,
    affectsCns: false,
    affectsHeart: true, // Cardiovascular risk
    metabolismPathway: 'CYP3A4, CYP2C19',
  },
  {
    genericName: 'Baricitinib',
    brandNames: ['Olumiant'],
    drugClass: 'JAK Inhibitor',
    searchTerms: ['baricitinib', 'olumiant', 'jak inhibitor'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: true,
    affectsCns: false,
    affectsHeart: false,
    metabolismPathway: 'CYP3A4',
  },
  
  // ANTI-OBESITY MEDICATIONS (Newer)
  {
    genericName: 'Naltrexone/Bupropion',
    brandNames: ['Contrave'],
    drugClass: 'Opioid Antagonist + NDRI Combo',
    searchTerms: ['naltrexone', 'bupropion', 'contrave', 'weight loss', 'anti-obesity'],
    affectsBloodClotting: false,
    affectsBloodPressure: true,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: true, // Blood pressure/heart rate
    metabolismPathway: 'CYP2B6, CYP1A2, CYP2D6',
  },
  
  // NEWER ANTI-EPILEPTICS
  {
    genericName: 'Brivaracetam',
    brandNames: ['Briviact'],
    drugClass: 'Anticonvulsant (SV2A modulator)',
    searchTerms: ['brivaracetam', 'briviact', 'anticonvulsant', 'epilepsy'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: false,
    metabolismPathway: 'CYP2C19, amidase hydrolysis',
  },
  {
    genericName: 'Cenobamate',
    brandNames: ['Xcopri'],
    drugClass: 'Anticonvulsant (Dual mechanism)',
    searchTerms: ['cenobamate', 'xcopri', 'anticonvulsant'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: false,
    metabolismPathway: 'CYP2E1, CYP2C19, glucuronidation',
  },
  
  // CGRP INHIBITORS (Migraine)
  {
    genericName: 'Erenumab',
    brandNames: ['Aimovig'],
    drugClass: 'CGRP Receptor Antagonist (Monoclonal Antibody)',
    searchTerms: ['erenumab', 'aimovig', 'cgrp', 'migraine', 'prevention'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: false,
    affectsKidney: false,
    affectsCns: true, // Migraine pathway
    affectsHeart: false,
    metabolismPathway: 'Reticuloendothelial clearance',
  },
  {
    genericName: 'Rimegepant',
    brandNames: ['Nurtec ODT', 'Vydura'],
    drugClass: 'CGRP Receptor Antagonist (Gepant)',
    searchTerms: ['rimegepant', 'nurtec', 'vydura', 'cgrp', 'migraine'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: true,
    affectsCns: true,
    affectsHeart: false,
    metabolismPathway: 'CYP1A2, CYP2C8',
  },
  
  // SODIUM-GLUCOSE CO-TRANSPORTER INHIBITORS (Different from SGLT2)
  {
    genericName: 'Mizagliflozin',
    brandNames: ['none yet (investigational)'],
    drugClass: 'SGLT1 Inhibitor',
    searchTerms: ['mizagliflozin', 'sglt1'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: true,
    affectsLiver: false,
    affectsKidney: true,
    affectsCns: false,
    affectsHeart: false,
    metabolismPathway: 'UGT enzymes',
  },
  
  // NEWER HEART FAILURE MEDICATIONS
  {
    genericName: 'Sacubitril/Valsartan',
    brandNames: ['Entresto'],
    drugClass: 'ARNI (Angiotensin Receptor-Neprilysin Inhibitor)',
    searchTerms: ['sacubitril', 'valsartan', 'entresto', 'arni', 'heart failure'],
    affectsBloodClotting: false,
    affectsBloodPressure: true,
    affectsBloodSugar: false,
    affectsLiver: true,
    affectsKidney: true,
    affectsCns: false,
    affectsHeart: true, // Primary indication
    metabolismPathway: 'Ester hydrolysis, CYP2C9, CYP3A4',
  },
  
  // DPP-4 INHIBITORS (Beyond Sitagliptin)
  {
    genericName: 'Alogliptin',
    brandNames: ['Nesina'],
    drugClass: 'DPP-4 Inhibitor',
    searchTerms: ['alogliptin', 'nesina', 'dpp-4', 'diabetes'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: true,
    affectsLiver: true,
    affectsKidney: true,
    affectsCns: false,
    affectsHeart: false,
    metabolismPathway: 'CYP2D6, CYP3A4',
  },
  {
    genericName: 'Linagliptin',
    brandNames: ['Tradjenta'],
    drugClass: 'DPP-4 Inhibitor',
    searchTerms: ['linagliptin', 'tradjenta', 'dpp-4'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: true,
    affectsLiver: false, // Minimal hepatic metabolism
    affectsKidney: false, // Non-renal excretion
    affectsCns: false,
    affectsHeart: false,
    metabolismPathway: 'Non-CYP metabolism',
  },
  
  // THYROID MEDICATIONS (Beyond Levothyroxine)
  {
    genericName: 'Liothyronine',
    brandNames: ['Cytomel'],
    drugClass: 'Thyroid Hormone (T3)',
    searchTerms: ['liothyronine', 'cytomel', 't3', 'thyroid'],
    affectsBloodClotting: false,
    affectsBloodPressure: true,
    affectsBloodSugar: true,
    affectsLiver: false,
    affectsKidney: false,
    affectsCns: true,
    affectsHeart: true, // Cardiac effects
    metabolismPathway: 'Deiodination',
  },
  
  // IMMUNOTHERAPY (Checkpoint Inhibitors - basic info)
  {
    genericName: 'Pembrolizumab',
    brandNames: ['Keytruda'],
    drugClass: 'PD-1 Inhibitor (Monoclonal Antibody)',
    searchTerms: ['pembrolizumab', 'keytruda', 'pd-1', 'immunotherapy', 'cancer'],
    affectsBloodClotting: false,
    affectsBloodPressure: false,
    affectsBloodSugar: true, // Immune-related diabetes
    affectsLiver: true, // Immune hepatitis
    affectsKidney: true, // Immune nephritis
    affectsCns: true, // Immune-related effects
    affectsHeart: true, // Immune myocarditis
    metabolismPathway: 'Reticuloendothelial clearance',
  },
];

// ============================================================================
// OIL-MEDICATION INTERACTIONS
// ============================================================================

// Rows are tagged with a specific medicationId (e.g. 'warfarin') or with a
// medicationClass keyword (e.g. 'anticoagulant') that matches any medication
// whose drugClass contains it. medicationClass is an Oil Amor extension of
// the DB schema used for class-wide rows. NOTE: most rows are still untagged
// (see getContraindicatedOils) — tagging the remainder is follow-up work.
export type OilMedicationInteractionRow = Partial<InsertOilMedicationInteraction> & {
  medicationClass?: string;
};

export const OIL_MEDICATION_INTERACTIONS: OilMedicationInteractionRow[] = [
  // WARFARIN INTERACTIONS
  {
    oilId: 'clove-bud',
    medicationId: 'warfarin',
    severity: 'contraindicated',
    mechanism: 'Clove contains high levels of eugenol (up to 85%), a potent anticoagulant compound. Combined with warfarin, this significantly increases bleeding risk including spontaneous hemorrhage.',
    potentialEffects: ['Severe bleeding', 'Hemorrhage', 'Prolonged bleeding time', 'Spontaneous bruising', 'Internal bleeding'],
    recommendation: 'ABSOLUTELY CONTRAINDICATED. Do not use clove bud oil while taking warfarin.',
    alternativeOils: ['lavender', 'frankincense'],
    evidenceLevel: 'clinical',
    references: ['Tisserand & Young Essential Oil Safety, 2nd Ed.'],
  },
  {
    oilId: 'cinnamon-bark',
    medicationId: 'warfarin',
    severity: 'major',
    mechanism: 'Cinnamon bark contains coumarin compounds that have anticoagulant properties. May potentiate warfarin effects and affect INR levels.',
    potentialEffects: ['Increased bleeding risk', 'Altered INR', 'Bruising', 'Prolonged bleeding'],
    recommendation: 'AVOID. Use cinnamon leaf oil instead (much lower coumarin content) with physician approval.',
    alternativeOils: ['cinnamon-leaf', 'cardamom'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'wintergreen',
    medicationId: 'warfarin',
    severity: 'major',
    mechanism: 'Contains methyl salicylate (natural aspirin). Additive antiplatelet effects with warfarin.',
    potentialEffects: ['Increased bleeding risk', 'GI bleeding', 'Prolonged bleeding'],
    recommendation: 'AVOID. Especially contraindicated with any blood thinning medication.',
    alternativeOils: ['peppermint', 'eucalyptus'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'fennel',
    medicationId: 'warfarin',
    severity: 'moderate',
    mechanism: 'Contains coumarin derivatives. May have mild anticoagulant effects.',
    potentialEffects: ['Possible increased bleeding risk', 'INR fluctuations'],
    recommendation: 'USE WITH CAUTION. Monitor INR closely if used. Maximum 1% dilution for brief use.',
    alternativeOils: ['sweet-orange', 'ginger'],
    evidenceLevel: 'theoretical',
  },
  {
    oilId: 'aniseed',
    medicationId: 'warfarin',
    severity: 'moderate',
    mechanism: 'Contains coumarin compounds. Potential for additive anticoagulant effects.',
    potentialEffects: ['Possible bleeding risk', 'INR elevation'],
    recommendation: 'AVOID or use extreme caution with physician monitoring.',
    alternativeOils: ['sweet-orange', 'cardamom'],
    evidenceLevel: 'theoretical',
  },
  {
    oilId: 'chamomile-german',
    medicationId: 'warfarin',
    severity: 'minor',
    mechanism: 'Very mild coumarin content. Theoretical interaction at high doses.',
    potentialEffects: ['Minimal risk at normal usage levels'],
    recommendation: 'Generally safe at normal dilutions (1-2%). Monitor for unusual bruising.',
    alternativeOils: ['lavender', 'frankincense'],
    evidenceLevel: 'theoretical',
  },
  
  // ANTICOAGULANT GENERAL INTERACTIONS
  {
    oilId: 'clove-bud',
    medicationClass: 'anticoagulant', // Class-wide row: matches all anticoagulants via drugClass
    severity: 'contraindicated',
    mechanism: 'Eugenol is a potent anticoagulant. Additive effects with all anticoagulant medications significantly increase bleeding risk.',
    potentialEffects: ['Severe hemorrhage', 'Spontaneous bleeding', 'Prolonged bleeding', 'Dangerous bruising'],
    recommendation: 'CONTRAINDICATED with ALL anticoagulants and antiplatelet medications.',
    alternativeOils: ['lavender', 'frankincense', 'bergamot-fcf'],
    evidenceLevel: 'clinical',
  },

  // BLOOD PRESSURE MEDICATION INTERACTIONS
  {
    oilId: 'lavender',
    severity: 'minor',
    mechanism: 'Lavender has mild hypotensive (blood pressure lowering) effects. May have additive effect with antihypertensive medications.',
    potentialEffects: ['Possible excessive lowering of blood pressure', 'Dizziness', 'Lightheadedness'],
    recommendation: 'Generally safe. Monitor blood pressure. If dizziness occurs, reduce oil concentration or frequency.',
    alternativeOils: [], // Lavender is actually one of the safest
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'ylang-ylang',
    severity: 'minor',
    mechanism: 'Ylang ylang has documented hypotensive effects. May enhance blood pressure medication effects.',
    potentialEffects: ['Hypotension', 'Dizziness', 'Fainting in susceptible individuals'],
    recommendation: 'Use caution. Start with low concentrations (0.5%). Monitor BP and symptoms.',
    alternativeOils: ['bergamot-fcf', 'neroli'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'clary-sage',
    severity: 'moderate',
    mechanism: 'Clary sage can significantly lower blood pressure. Combined with antihypertensives may cause excessive hypotension.',
    potentialEffects: ['Significant blood pressure drop', 'Dizziness', 'Syncope (fainting)', 'Weakness'],
    recommendation: 'USE WITH CAUTION. Avoid large area application. Monitor BP closely. Not recommended for those on multiple BP meds.',
    alternativeOils: ['geranium', 'neroli'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'rosemary',
    severity: 'moderate',
    mechanism: 'Rosemary camphor chemotype may raise blood pressure. Conflicting effects with antihypertensive medications.',
    potentialEffects: ['May counteract BP medication', 'Blood pressure elevation', 'Headache'],
    recommendation: 'Use ct. verbenone or ct. 1,8-cineole chemotypes instead. Monitor BP.',
    alternativeOils: ['rosemary-verbenone', 'lavender'],
    evidenceLevel: 'clinical',
  },

  // DIABETES MEDICATION INTERACTIONS
  {
    oilId: 'cinnamon-bark',
    severity: 'moderate',
    mechanism: 'Cinnamon bark can lower blood glucose levels. May have additive hypoglycemic effect with diabetes medications.',
    potentialEffects: ['Hypoglycemia (low blood sugar)', 'Shakiness', 'Sweating', 'Confusion', 'Dizziness'],
    recommendation: 'USE WITH CAUTION. Monitor blood glucose closely. May need medication adjustment under physician supervision.',
    alternativeOils: ['coriander', 'dill'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'coriander',
    severity: 'minor',
    mechanism: 'Animal studies show hypoglycemic effects. Potential for additive effect with diabetes medications.',
    potentialEffects: ['Possible blood sugar lowering'],
    recommendation: 'Monitor blood glucose. Generally safe at normal dilutions.',
    alternativeOils: ['fennel', 'cardamom'],
    evidenceLevel: 'anecdotal',
  },

  // ANTIDEPRESSANT INTERACTIONS (SSRI/SNRI)
  {
    oilId: 'lavender',
    severity: 'minor',
    mechanism: 'Lavender has mild sedative and anxiolytic effects. May have additive CNS depression with sedating antidepressants.',
    potentialEffects: ['Increased drowsiness', 'Sedation', 'Impaired alertness'],
    recommendation: 'Generally safe. Monitor for excessive sedation. Avoid use before driving if combined with sedating medications.',
    alternativeOils: [],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'clary-sage',
    severity: 'moderate',
    mechanism: 'Clary sage contains sclareol which has estrogenic properties. May interfere with hormonal balance and mood regulation.',
    potentialEffects: ['Hormonal fluctuations', 'Mood changes', 'Potential interference with medication efficacy'],
    recommendation: 'USE WITH CAUTION. Avoid if taking medications for hormonal mood disorders. Consult psychiatrist.',
    alternativeOils: ['bergamot-fcf', 'frankincense'],
    evidenceLevel: 'theoretical',
  },
  {
    oilId: 'ylang-ylang',
    severity: 'minor',
    mechanism: 'Ylang ylang affects neurotransmitters and blood pressure. May interact with SNRIs like venlafaxine.',
    potentialEffects: ['Blood pressure changes', 'Mood alterations', 'Headache'],
    recommendation: 'Use with caution at low dilutions (0.5%). Monitor mood and BP.',
    alternativeOils: ['neroli', 'geranium'],
    evidenceLevel: 'theoretical',
  },

  // SEDATIVE/BENZODIAZEPINE INTERACTIONS
  {
    oilId: 'lavender',
    severity: 'moderate',
    mechanism: 'Lavender has documented anxiolytic and sedative effects. Additive CNS depression with benzodiazepines.',
    potentialEffects: ['Excessive sedation', 'Drowsiness', 'Impaired coordination', 'Respiratory depression (rare)'],
    recommendation: 'USE WITH CAUTION. Start with low concentrations. Avoid before driving or operating machinery. Monitor for over-sedation.',
    alternativeOils: ['frankincense', 'bergamot-fcf'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'roman-chamomile',
    severity: 'moderate',
    mechanism: 'Strong sedative and anxiolytic properties. Additive effects with benzodiazepines and sleep medications.',
    potentialEffects: ['Excessive drowsiness', 'Prolonged sedation', 'Next-day grogginess', 'Impaired cognition'],
    recommendation: 'USE WITH CAUTION. May allow reduction of medication dose under medical supervision. Avoid alcohol.',
    alternativeOils: ['frankincense'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'valerian',
    severity: 'major',
    mechanism: 'Valerian is a potent CNS depressant. Significant additive effects with benzodiazepines and sleep medications.',
    potentialEffects: ['Excessive sedation', 'Impaired breathing', 'Severe drowsiness', 'Cognitive impairment'],
    recommendation: 'CONTRAINDICATED without medical supervision. Never combine with benzodiazepines or sleep medications without physician approval.',
    alternativeOils: ['lavender', 'roman-chamomile'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'vetiver',
    severity: 'minor',
    mechanism: 'Vetiver has grounding, sedative properties. May enhance sedative medications.',
    potentialEffects: ['Mild increased sedation'],
    recommendation: 'Generally safe. Monitor for excessive drowsiness. Best used in evening.',
    alternativeOils: ['frankincense'],
    evidenceLevel: 'anecdotal',
  },

  // EPILEPSY MEDICATION INTERACTIONS
  {
    oilId: 'rosemary',
    severity: 'contraindicated',
    mechanism: 'Rosemary camphor chemotype contains camphor and 1,8-cineole, both of which are neurotoxic and can trigger seizures in susceptible individuals.',
    potentialEffects: ['Seizure trigger', 'Increased seizure frequency', 'Status epilepticus (rare)'],
    recommendation: 'CONTRAINDICATED for individuals with epilepsy or seizure disorders. Use ct. verbenone if rosemary desired.',
    alternativeOils: ['lavender', 'frankincense'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'fennel',
    severity: 'major',
    mechanism: 'Fennel contains trans-anethole and methyl chavicol which are neurotoxic and can lower seizure threshold.',
    potentialEffects: ['Seizure trigger', 'Increased seizure frequency'],
    recommendation: 'AVOID. Contraindicated in epilepsy.',
    alternativeOils: ['sweet-orange', 'mandarin'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'hyssop',
    severity: 'contraindicated',
    mechanism: 'Hyssop (Hyssopus officinalis) contains pinocamphone, a potent neurotoxin that can trigger seizures.',
    potentialEffects: ['Seizure trigger', 'Convulsions', 'Neurotoxicity'],
    recommendation: 'ABSOLUTELY CONTRAINDICATED in epilepsy and seizure disorders.',
    alternativeOils: ['lavender', 'frankincense'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'sage',
    severity: 'major',
    mechanism: 'Sage (Salvia officinalis) contains thujone, a neurotoxic compound that can trigger seizures.',
    potentialEffects: ['Seizure trigger', 'Neurotoxicity', 'Confusion'],
    recommendation: 'AVOID. Use clary sage (Salvia sclarea) instead, which is safe.',
    alternativeOils: ['clary-sage'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'wormwood',
    severity: 'contraindicated',
    mechanism: 'Wormwood contains high levels of thujone, a known convulsant.',
    potentialEffects: ['Seizure trigger', 'Severe neurotoxicity', 'Hallucinations'],
    recommendation: 'ABSOLUTELY CONTRAINDICATED in epilepsy. Avoid internal and significant external use.',
    alternativeOils: ['roman-chamomile', 'frankincense'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'camphor',
    severity: 'contraindicated',
    mechanism: 'Camphor is a potent neurotoxin that can trigger seizures, especially in children and those with seizure disorders.',
    potentialEffects: ['Seizure trigger', 'Status epilepticus', 'Neurotoxicity', 'Death (in overdose)'],
    recommendation: 'ABSOLUTELY CONTRAINDICATED. Never use camphor oil with epilepsy or in children.',
    alternativeOils: ['eucalyptus-radiata', 'ravintsara'],
    evidenceLevel: 'clinical',
  },

  // CHEMOTHERAPY INTERACTIONS
  {
    oilId: 'grapefruit',
    severity: 'contraindicated',
    mechanism: 'Grapefruit oil (like grapefruit juice) inhibits CYP3A4 enzyme, which metabolizes many chemotherapy drugs. Can increase drug toxicity.',
    potentialEffects: ['Increased chemotherapy toxicity', 'Overdose effects', 'Liver damage', 'Kidney damage'],
    recommendation: 'CONTRAINDICATED during chemotherapy. Avoid all citrus oils that inhibit CYP3A4.',
    alternativeOils: ['lavender', 'frankincense', 'geranium'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'bergamot',
    severity: 'contraindicated',
    mechanism: 'Bergamot contains bergapten (furocoumarin) which is phototoxic and may increase photosensitivity of skin during radiation therapy.',
    potentialEffects: ['Severe sunburn', 'Skin damage', 'Hyperpigmentation'],
    recommendation: 'Use bergapten-free (FCF) variety only. Avoid regular bergamot during radiation therapy.',
    alternativeOils: ['bergamot-fcf', 'sweet-orange'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'clove-bud',
    severity: 'major',
    mechanism: 'Clove contains eugenol which affects blood clotting. Chemotherapy often causes thrombocytopenia (low platelets).',
    potentialEffects: ['Increased bleeding risk', 'Bruising', 'Hemorrhage'],
    recommendation: 'AVOID during chemotherapy, especially if platelet counts are low.',
    alternativeOils: ['lavender', 'frankincense'],
    evidenceLevel: 'clinical',
  },

  // HORMONAL MEDICATION INTERACTIONS
  {
    oilId: 'clary-sage',
    severity: 'moderate',
    mechanism: 'Clary sage contains sclareol with estrogenic activity. May interfere with hormone therapies including tamoxifen and hormonal contraceptives.',
    potentialEffects: ['Hormonal imbalance', 'Reduced medication efficacy', 'Breakthrough bleeding', 'Mood changes'],
    recommendation: 'USE WITH CAUTION. Consult endocrinologist or oncologist. May require medication adjustment.',
    alternativeOils: ['geranium', 'bergamot-fcf'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'fennel',
    severity: 'major',
    mechanism: 'Fennel has significant estrogenic activity (trans-anethole). Can interfere with hormone replacement and cancer treatments.',
    potentialEffects: ['Hormonal disruption', 'Reduced tamoxifen efficacy', 'Endocrine imbalance'],
    recommendation: 'AVOID with hormone-sensitive conditions (breast cancer, uterine cancer, endometriosis) and hormone therapies.',
    alternativeOils: ['sweet-orange', 'cardamom'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'aniseed',
    severity: 'moderate',
    mechanism: 'Aniseed has estrogenic properties similar to fennel. May affect hormonal balance.',
    potentialEffects: ['Hormonal effects', 'Potential interference with HRT'],
    recommendation: 'USE WITH CAUTION with hormone therapies. Consult physician.',
    alternativeOils: ['sweet-orange', 'star-anise'],
    evidenceLevel: 'theoretical',
  },
  {
    oilId: 'sage',
    severity: 'major',
    mechanism: 'Sage contains phytoestrogens. May interfere with hormone therapies and contraceptives.',
    potentialEffects: ['Hormonal changes', 'Reduced contraceptive efficacy (theoretical)'],
    recommendation: 'AVOID with hormonal contraceptives and hormone therapies. Use clary sage instead.',
    alternativeOils: ['clary-sage'],
    evidenceLevel: 'theoretical',
  },

  // IMMUNOSUPPRESSANT INTERACTIONS
  {
    oilId: 'tea-tree',
    severity: 'minor',
    mechanism: 'Tea tree has immunomodulatory effects. Theoretical interaction with immunosuppressants.',
    potentialEffects: ['Possible interference with immunosuppression (theoretical)'],
    recommendation: 'Generally safe at normal dilutions. Monitor for signs of rejection if transplant patient.',
    alternativeOils: ['lavender', 'frankincense'],
    evidenceLevel: 'theoretical',
  },
  {
    oilId: 'eucalyptus',
    severity: 'minor',
    mechanism: 'Eucalyptus has immunomodulatory and anti-inflammatory effects.',
    potentialEffects: ['Theoretical immune modulation'],
    recommendation: 'Generally safe. Monitor if on high-dose immunosuppression.',
    alternativeOils: ['ravintsara', 'frankincense'],
    evidenceLevel: 'theoretical',
  },

  // CORTICOSTEROID INTERACTIONS
  {
    oilId: 'licorice-root',
    severity: 'major',
    mechanism: 'Licorice contains glycyrrhizin which raises cortisol levels and lowers potassium. Additive effects with corticosteroids.',
    potentialEffects: ['Hypokalemia (low potassium)', 'Hypertension', 'Fluid retention', 'Edema', 'Muscle weakness'],
    recommendation: 'CONTRAINDICATED with corticosteroid medications. Can cause severe electrolyte imbalances.',
    alternativeOils: ['fennel', 'aniseed'],
    evidenceLevel: 'clinical',
  },

  // PAIN MEDICATION INTERACTIONS
  {
    oilId: 'wintergreen',
    severity: 'contraindicated',
    mechanism: 'Wintergreen contains 95-100% methyl salicylate (natural aspirin). Combined with tramadol or other serotonergic drugs increases serotonin syndrome risk. Combined with NSAIDs increases bleeding.',
    potentialEffects: ['Serotonin syndrome', 'Severe bleeding', 'GI hemorrhage', 'Respiratory depression', 'Death'],
    recommendation: 'ABSOLUTELY CONTRAINDICATED with tramadol, SSRIs, SNRIs, MAOIs, NSAIDs, and anticoagulants.',
    alternativeOils: ['peppermint', 'eucalyptus'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'birch',
    severity: 'contraindicated',
    mechanism: 'Birch oil contains high levels of methyl salicylate, similar to wintergreen.',
    potentialEffects: ['Same as wintergreen'],
    recommendation: 'CONTRAINDICATED with same medications as wintergreen.',
    alternativeOils: ['peppermint', 'eucalyptus'],
    evidenceLevel: 'clinical',
  },

  // ST. JOHN'S WORT INTERACTIONS (Herbal Supplement)
  {
    oilId: 'bergamot',
    severity: 'moderate',
    mechanism: 'If taking St. John\'s Wort (strong CYP inducer) and using bergamot (CYP inhibitor), unpredictable drug metabolism.',
    potentialEffects: ['Altered drug levels', 'Reduced efficacy of medications', 'Increased side effects'],
    recommendation: 'Use caution. St. John\'s Wort alone has many drug interactions. Consult pharmacist.',
    alternativeOils: ['bergamot-fcf'],
    evidenceLevel: 'theoretical',
  },
  
  // BERGAMOT FCF SPECIFIC INTERACTIONS
  {
    oilId: 'bergamot-fcf',
    severity: 'minor',
    mechanism: 'FCF Bergamot has reduced CYP inhibition compared to regular bergamot, but may still affect metabolism of CYP3A4 substrates.',
    potentialEffects: ['Possible mild drug level changes', 'Theoretical interaction'],
    recommendation: 'Generally safer than regular bergamot. Monitor if taking medications metabolized by CYP3A4.',
    alternativeOils: ['sweet-orange', 'mandarin'],
    evidenceLevel: 'theoretical',
  },
  {
    oilId: 'bergamot-fcf',
    medicationId: 'simvastatin',
    severity: 'minor',
    mechanism: 'Bergamot contains compounds that may inhibit CYP3A4, potentially increasing statin levels. FCF variety has reduced but not eliminated risk.',
    potentialEffects: ['Possible increased statin levels', 'Muscle pain risk (theoretical)'],
    recommendation: 'Monitor for muscle pain. Generally safer than regular bergamot. Consider evening application away from medication timing.',
    alternativeOils: ['lavender', 'frankincense'],
    evidenceLevel: 'theoretical',
  },

  // ============================================================================
  // MODERN MEDICATION INTERACTIONS (2020s)
  // ============================================================================

  // GLP-1 RECEPTOR AGONISTS (Ozempic, Mounjaro, etc.)
  {
    oilId: 'peppermint',
    severity: 'minor',
    mechanism: 'GLP-1 agonists (Semaglutide, Tirzepatide) slow gastric emptying. Peppermint also affects GI motility. May compound nausea effects.',
    potentialEffects: ['Increased nausea', 'Gastric discomfort', 'Delayed stomach emptying'],
    recommendation: 'Generally compatible. Monitor for increased nausea. Use peppermint for GLP-1 induced nausea relief only at low concentrations.',
    alternativeOils: ['ginger', 'fennel'],
    evidenceLevel: 'theoretical',
  },
  {
    oilId: 'ginger',
    severity: 'minor',
    mechanism: 'Ginger has anti-nausea properties that may help with GLP-1 induced nausea. No direct pharmacological interaction.',
    potentialEffects: ['Possible nausea relief', 'No adverse interactions expected'],
    recommendation: 'SAFELY COMPATIBLE. Ginger may help with nausea side effects of GLP-1 medications.',
    alternativeOils: ['peppermint', 'fennel'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'fennel',
    severity: 'minor',
    mechanism: 'Fennel may help with GI side effects of GLP-1 agonists. No significant pharmacokinetic interaction.',
    potentialEffects: ['Possible digestive support', 'No adverse effects expected'],
    recommendation: 'Compatible. May help with bloating/discomfort from delayed gastric emptying.',
    alternativeOils: ['ginger', 'peppermint'],
    evidenceLevel: 'theoretical',
  },

  // SGLT2 INHIBITORS (Jardiance, Farxiga, Invokana)
  {
    oilId: 'juniper-berry',
    severity: 'moderate',
    mechanism: 'SGLT2 inhibitors and juniper berry both have diuretic effects. Additive diuresis may increase dehydration risk.',
    potentialEffects: ['Increased urination', 'Dehydration', 'Electrolyte imbalance', 'Dizziness'],
    recommendation: 'USE WITH CAUTION. Both increase fluid loss. Stay well hydrated. Monitor for dizziness.',
    alternativeOils: ['lemon', 'grapefruit'],
    evidenceLevel: 'theoretical',
  },
  {
    oilId: 'lemon',
    severity: 'minor',
    mechanism: 'Lemon oil is generally compatible with SGLT2 inhibitors. No significant pharmacokinetic interaction via UGT pathway.',
    potentialEffects: ['No adverse interactions expected'],
    recommendation: 'SAFELY COMPATIBLE. Lemon oil does not affect SGLT2 inhibitor metabolism significantly.',
    alternativeOils: ['lime', 'bergamot-fcf'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'coriander',
    severity: 'minor',
    mechanism: 'Coriander may have mild blood sugar lowering effects. Additive hypoglycemia theoretically possible with SGLT2 inhibitors.',
    potentialEffects: ['Possible mild blood sugar lowering', 'Monitor for hypoglycemia symptoms'],
    recommendation: 'Compatible with monitoring. Check blood sugar if using coriander regularly.',
    alternativeOils: ['fennel', 'cardamom'],
    evidenceLevel: 'theoretical',
  },

  // PCSK9 INHIBITORS (Repatha, Praluent)
  {
    oilId: 'bergamot',
    severity: 'minor',
    mechanism: 'Bergamot contains compounds that may have mild cholesterol-lowering effects. Additive effects with PCSK9 inhibitors theoretically possible but not clinically significant.',
    potentialEffects: ['Possible additive cholesterol reduction', 'No adverse interactions expected'],
    recommendation: 'SAFELY COMPATIBLE. No significant interaction expected. Monitor cholesterol levels as usual.',
    alternativeOils: ['bergamot-fcf', 'lemon'],
    evidenceLevel: 'theoretical',
  },
  {
    oilId: 'lemongrass',
    severity: 'minor',
    mechanism: 'Lemongrass may have mild lipid-modulating effects. No significant interaction with PCSK9 monoclonal antibodies.',
    potentialEffects: ['No adverse interactions expected'],
    recommendation: 'Compatible. PCSK9 inhibitors (monoclonal antibodies) have different mechanism than statins.',
    alternativeOils: ['lemon', 'grapefruit'],
    evidenceLevel: 'theoretical',
  },

  // JAK INHIBITORS (Xeljanz, Olumiant)
  {
    oilId: 'tea-tree',
    severity: 'minor',
    mechanism: 'JAK inhibitors suppress immune response. Tea tree has immunomodulatory effects. Theoretical interaction but not clinically significant at normal dilutions.',
    potentialEffects: ['Theoretical immune modulation'],
    recommendation: 'Generally safe at normal dilutions. Monitor for signs of infection as per usual JAK inhibitor precautions.',
    alternativeOils: ['lavender', 'frankincense'],
    evidenceLevel: 'theoretical',
  },
  {
    oilId: 'eucalyptus',
    severity: 'minor',
    mechanism: 'Eucalyptus has anti-inflammatory effects. No significant pharmacokinetic interaction with JAK inhibitors via CYP3A4.',
    potentialEffects: ['No adverse interactions expected'],
    recommendation: 'Compatible. Different metabolic pathways (JAK inhibitors metabolized by CYP3A4, eucalyptus effects are primarily local).',
    alternativeOils: ['ravintsara', 'frankincense'],
    evidenceLevel: 'theoretical',
  },

  // CGRP INHIBITORS (Aimovig, Nurtec)
  {
    oilId: 'peppermint',
    severity: 'minor',
    mechanism: 'Peppermint may help with migraine-associated nausea. No pharmacokinetic interaction with CGRP inhibitors.',
    potentialEffects: ['Possible nausea relief', 'No adverse interactions'],
    recommendation: 'SAFELY COMPATIBLE. Peppermint may complement migraine treatment.',
    alternativeOils: ['lavender', 'rosemary'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'lavender',
    severity: 'minor',
    mechanism: 'Lavender has calming/anxiolytic properties that may help with migraine. No interaction with CGRP pathway.',
    potentialEffects: ['Stress reduction', 'Possible migraine support', 'No adverse effects'],
    recommendation: 'SAFELY COMPATIBLE. Lavender may help with stress-triggered migraines.',
    alternativeOils: ['bergamot', 'frankincense'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'rosemary',
    severity: 'minor',
    mechanism: 'Rosemary has analgesic properties. No significant interaction with CGRP inhibitors.',
    potentialEffects: ['Possible complementary pain relief', 'No adverse interactions'],
    recommendation: 'Compatible. May provide additional comfort for migraine sufferers.',
    alternativeOils: ['peppermint', 'lavender'],
    evidenceLevel: 'theoretical',
  },

  // ARNI (Entresto - Sacubitril/Valsartan)
  {
    oilId: 'clary-sage',
    severity: 'minor',
    mechanism: 'ARNI medications contain valsartan (ARB). Clary sage has mild hypotensive effects. Additive blood pressure lowering theoretically possible.',
    potentialEffects: ['Possible mild blood pressure reduction', 'Monitor for dizziness'],
    recommendation: 'Compatible with monitoring. Both lower blood pressure - watch for excessive lowering.',
    alternativeOils: ['lavender', 'ylang-ylang'],
    evidenceLevel: 'theoretical',
  },
  {
    oilId: 'ylang-ylang',
    severity: 'minor',
    mechanism: 'Ylang ylang may have mild hypotensive effects. Monitor for additive effects with Entresto.',
    potentialEffects: ['Possible blood pressure lowering', 'Monitor for symptoms'],
    recommendation: 'Use with caution if prone to low blood pressure. Otherwise compatible.',
    alternativeOils: ['lavender', 'bergamot'],
    evidenceLevel: 'theoretical',
  },

  // COX-2 INHIBITORS (Celecoxib/Celebrex)
  {
    oilId: 'wintergreen',
    severity: 'contraindicated',
    mechanism: 'Celecoxib is an NSAID. Wintergreen contains methyl salicylate (natural aspirin). Additive antiplatelet effects and bleeding risk.',
    potentialEffects: ['Severe bleeding risk', 'GI hemorrhage', 'Prolonged bleeding time'],
    recommendation: 'CONTRAINDICATED. Both affect blood clotting - dangerous combination.',
    alternativeOils: ['peppermint', 'eucalyptus'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'clove-bud',
    severity: 'major',
    mechanism: 'Clove contains eugenol (potent anticoagulant). Additive bleeding risk with Celecoxib.',
    potentialEffects: ['Increased bleeding risk', 'Bruising', 'Prolonged bleeding'],
    recommendation: 'AVOID. Significant bleeding risk when combined with any NSAID including COX-2 inhibitors.',
    alternativeOils: ['lavender', 'frankincense'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'ginger',
    severity: 'minor',
    mechanism: 'Ginger has mild antiplatelet properties. Celecoxib also affects platelets. Monitor for increased bleeding tendency.',
    potentialEffects: ['Possible mild bleeding risk increase', 'Monitor for unusual bruising'],
    recommendation: 'Compatible with caution. Use at normal dilutions, monitor for bruising.',
    alternativeOils: ['fennel', 'coriander'],
    evidenceLevel: 'theoretical',
  },

  // MULTIMODAL ANTIDEPRESSANTS (Trintellix/Vortioxetine)
  {
    oilId: 'bergamot',
    severity: 'minor',
    mechanism: 'Vortioxetine is metabolized by CYP2D6 and CYP3A4. Bergamot may inhibit CYP3A4, potentially increasing levels.',
    potentialEffects: ['Possible increased vortioxetine levels', 'Increased side effects'],
    recommendation: 'Use bergamot FCF (furanocoumarin-free) to minimize CYP interaction. Monitor for increased antidepressant side effects.',
    alternativeOils: ['bergamot-fcf', 'sweet-orange'],
    evidenceLevel: 'theoretical',
  },
  {
    oilId: 'clary-sage',
    severity: 'minor',
    mechanism: 'Clary sage has calming/anxiolytic effects that may complement antidepressant therapy. No significant pharmacokinetic interaction.',
    potentialEffects: ['Possible mood support', 'No adverse interactions expected'],
    recommendation: 'SAFELY COMPATIBLE. May provide complementary emotional support.',
    alternativeOils: ['lavender', 'bergamot-fcf'],
    evidenceLevel: 'clinical',
  },

  // BREXPIPRAZOLE (Rexulti)
  {
    oilId: 'lavender',
    severity: 'minor',
    mechanism: 'Lavender has anxiolytic properties that may complement atypical antipsychotic treatment. No significant CYP interactions.',
    potentialEffects: ['Possible anxiety reduction', 'No adverse interactions'],
    recommendation: 'SAFELY COMPATIBLE. May help with anxiety symptoms.',
    alternativeOils: ['clary-sage', 'bergamot-fcf'],
    evidenceLevel: 'theoretical',
  },

  // NEWER ANTIEPILEPTICS (Briviact, Xcopri)
  {
    oilId: 'lavender',
    severity: 'minor',
    mechanism: 'Lavender has calming properties. No interaction with SV2A modulation (brivaracetam) or dual mechanism (cenobamate).',
    potentialEffects: ['Possible calming effect', 'No seizure threshold effects', 'No adverse interactions'],
    recommendation: 'SAFELY COMPATIBLE. Lavender is safe for epilepsy and may provide relaxation benefits.',
    alternativeOils: ['frankincense', 'roman-chamomile'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'frankincense',
    severity: 'minor',
    mechanism: 'Frankincense has anti-inflammatory and calming properties. Safe with modern antiepileptics.',
    potentialEffects: ['Possible anti-inflammatory benefit', 'No seizure interactions'],
    recommendation: 'SAFELY COMPATIBLE. Frankincense is one of the safest oils for epilepsy patients.',
    alternativeOils: ['lavender', 'cedarwood'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'hyssop',
    severity: 'contraindicated',
    mechanism: 'Hyssop contains pinocamphone, a neurotoxin that triggers seizures. Dangerous regardless of antiepileptic medication.',
    potentialEffects: ['Seizure trigger', 'Breakthrough seizures', 'Neurotoxicity'],
    recommendation: 'ABSOLUTELY CONTRAINDICATED in all epilepsy patients, even with modern antiepileptic medications.',
    alternativeOils: ['lavender', 'frankincense'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'rosemary',
    severity: 'moderate',
    mechanism: 'Rosemary contains camphor and 1,8-cineole. May lower seizure threshold despite antiepileptic medication.',
    potentialEffects: ['Possible seizure trigger', 'Breakthrough seizure risk'],
    recommendation: 'USE WITH CAUTION. Even with modern antiepileptics, rosemary camphor content poses risk.',
    alternativeOils: ['lavender', 'frankincense'],
    evidenceLevel: 'clinical',
  },

  // DPP-4 INHIBITORS (Nesina, Tradjenta)
  {
    oilId: 'cinnamon-bark',
    severity: 'minor',
    mechanism: 'DPP-4 inhibitors and cinnamon both affect blood glucose. Theoretical additive hypoglycemia risk.',
    potentialEffects: ['Possible mild blood sugar lowering', 'Monitor for hypoglycemia'],
    recommendation: 'Compatible with monitoring. Check blood glucose when starting cinnamon oil use.',
    alternativeOils: ['cinnamon-leaf', 'coriander'],
    evidenceLevel: 'theoretical',
  },
  {
    oilId: 'coriander',
    severity: 'minor',
    mechanism: 'Coriander may have mild glucose-lowering effects. Monitor when combined with DPP-4 inhibitors.',
    potentialEffects: ['Possible additive blood sugar reduction'],
    recommendation: 'Compatible with glucose monitoring.',
    alternativeOils: ['fennel', 'cardamom'],
    evidenceLevel: 'theoretical',
  },

  // T3 THYROID (Cytomel)
  {
    oilId: 'myrrh',
    severity: 'minor',
    mechanism: 'Myrrh has been traditionally used for thyroid support but evidence is limited. No significant interaction with exogenous T3.',
    potentialEffects: ['No adverse interactions expected'],
    recommendation: 'Generally compatible. Myrrh does not significantly affect T3 levels.',
    alternativeOils: ['frankincense', 'myrtle'],
    evidenceLevel: 'theoretical',
  },
  {
    oilId: 'myrtle',
    severity: 'minor',
    mechanism: 'Myrtle has been traditionally associated with thyroid support. Safe with liothyronine.',
    potentialEffects: ['No adverse interactions expected'],
    recommendation: 'SAFELY COMPATIBLE.',
    alternativeOils: ['frankincense', 'myrrh'],
    evidenceLevel: 'theoretical',
  },

  // IMMUNOTHERAPY (Keytruda/Pembrolizumab)
  {
    oilId: 'frankincense',
    severity: 'minor',
    mechanism: 'Frankincense has anti-inflammatory properties. No interaction with PD-1 checkpoint inhibition.',
    potentialEffects: ['Possible complementary anti-inflammatory effect', 'No adverse interactions'],
    recommendation: 'SAFELY COMPATIBLE. Frankincense is often used for wellness during cancer treatment.',
    alternativeOils: ['lavender', 'geranium'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'lavender',
    severity: 'minor',
    mechanism: 'Lavender has calming, sleep-promoting effects helpful during cancer treatment. No interaction with immunotherapy.',
    potentialEffects: ['Stress reduction', 'Sleep support', 'No adverse effects'],
    recommendation: 'SAFELY COMPATIBLE. Helpful for anxiety and sleep during immunotherapy.',
    alternativeOils: ['frankincense', 'roman-chamomile'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'grapefruit',
    severity: 'contraindicated',
    mechanism: 'Grapefruit inhibits CYP3A4. If patient is on any CYP3A4-metabolized supportive medications (antiemetics, pain meds), levels may increase.',
    potentialEffects: ['Altered drug metabolism', 'Increased side effects of supportive meds'],
    recommendation: 'AVOID grapefruit oil during immunotherapy due to potential drug interaction with supportive medications. Use grapefruit FCF or other citrus.',
    alternativeOils: ['bergamot-fcf', 'sweet-orange'],
    evidenceLevel: 'clinical',
  },

  // SGLT1/2 DUAL INHIBITOR (Inpefa/Sotagliflozin)
  {
    oilId: 'juniper-berry',
    severity: 'moderate',
    mechanism: 'Sotagliflozin has stronger diuretic effects than SGLT2-only inhibitors. Combined with juniper (diuretic) increases dehydration risk.',
    potentialEffects: ['Significant diuresis', 'Dehydration', 'Electrolyte imbalance', 'Hypotension'],
    recommendation: 'USE WITH CAUTION. Strong combined diuretic effect. Ensure adequate hydration.',
    alternativeOils: ['lemon', 'grapefruit'],
    evidenceLevel: 'theoretical',
  },

  // NALTREXONE/BUPROPION (Contrave)
  {
    oilId: 'lavender',
    severity: 'minor',
    mechanism: 'Lavender has calming properties. No interaction with opioid antagonism or norepinephrine-dopamine reuptake inhibition.',
    potentialEffects: ['Possible anxiety relief', 'No adverse interactions'],
    recommendation: 'SAFELY COMPATIBLE. May help with stress eating behaviors.',
    alternativeOils: ['bergamot', 'clary-sage'],
    evidenceLevel: 'theoretical',
  },
  {
    oilId: 'grapefruit',
    severity: 'moderate',
    mechanism: 'Bupropion is metabolized by CYP2B6. Grapefruit does not significantly inhibit CYP2B6 but may affect other pathways.',
    potentialEffects: ['Possible mild interaction', 'Monitor for side effects'],
    recommendation: 'Use with caution. Prefer grapefruit-free citrus oils.',
    alternativeOils: ['bergamot-fcf', 'sweet-orange'],
    evidenceLevel: 'theoretical',
  },

  // EDOCOLON (new DOAC - Lixiana/Savaysa)
  {
    oilId: 'clove-bud',
    severity: 'contraindicated',
    mechanism: 'Edoxaban is a Factor Xa inhibitor (blood thinner). Clove contains eugenol (potent anticoagulant). Additive bleeding risk.',
    potentialEffects: ['Severe bleeding', 'Hemorrhage', 'Dangerous bruising'],
    recommendation: 'CONTRAINDICATED. All DOACs (Apixaban, Rivaroxaban, Edoxaban, Betrixaban) have dangerous interactions with clove.',
    alternativeOils: ['lavender', 'frankincense'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'wintergreen',
    severity: 'contraindicated',
    mechanism: 'Edoxaban + methyl salicylate (in wintergreen) = dangerous bleeding combination.',
    potentialEffects: ['Severe bleeding', 'GI hemorrhage', 'Spontaneous bruising'],
    recommendation: 'CONTRAINDICATED with all DOACs including Edoxaban.',
    alternativeOils: ['peppermint', 'eucalyptus'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'ginger',
    severity: 'minor',
    mechanism: 'Ginger has very mild antiplatelet effects. With DOACs, minimal additional risk at normal dilutions.',
    potentialEffects: ['Possible mild bleeding tendency increase'],
    recommendation: 'Compatible with caution. Use at normal topical dilutions (1-2%).',
    alternativeOils: ['fennel', 'coriander'],
    evidenceLevel: 'theoretical',
  },
];

// ============================================================================
// HEALTH CONDITIONS CONTRAINDICATIONS
// ============================================================================

export const HEALTH_CONDITIONS = [
  {
    id: 'epilepsy',
    name: 'Epilepsy / Seizure Disorder',
    category: 'neurological',
    aliases: ['seizures', 'epileptic', 'convulsive disorder', 'seizure disorder'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'hemophilia',
    name: 'Hemophilia / Bleeding Disorder',
    category: 'hematological',
    aliases: ['bleeding disorder', 'coagulation disorder', 'hemophiliac', 'von willebrand'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'thrombocytopenia',
    name: 'Thrombocytopenia (Low Platelets)',
    category: 'hematological',
    aliases: ['low platelets', 'thrombocytopenic', 'platelet disorder', 'itp'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'severe_asthma',
    name: 'Severe Asthma',
    category: 'respiratory',
    aliases: ['brittle asthma', 'severe persistent asthma', 'status asthmaticus history'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'severe_copd',
    name: 'Severe COPD',
    category: 'respiratory',
    aliases: ['emphysema', 'chronic bronchitis', 'severe lung disease'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'pregnancy',
    name: 'Pregnancy',
    category: 'reproductive',
    aliases: ['pregnant', 'expecting', 'gestation'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'breastfeeding',
    name: 'Breastfeeding / Lactation',
    category: 'reproductive',
    aliases: ['nursing', 'lactating', 'breast feeding'],
    isLifeThreatening: false,
    requiresMedicalSupervision: false,
  },
  {
    id: 'liver_disease',
    name: 'Liver Disease / Hepatic Impairment',
    category: 'hepatic',
    aliases: ['hepatitis', 'cirrhosis', 'liver damage', 'fatty liver', 'hepatic'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'kidney_disease',
    name: 'Kidney Disease / Renal Impairment',
    category: 'renal',
    aliases: ['renal failure', 'nephropathy', 'kidney failure', 'dialysis', 'ckd'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'hypertension',
    name: 'Hypertension (High Blood Pressure)',
    category: 'cardiovascular',
    aliases: ['high bp', 'high blood pressure', 'htn'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'hypotension',
    name: 'Hypotension (Low Blood Pressure)',
    category: 'cardiovascular',
    aliases: ['low bp', 'low blood pressure', 'orthostatic hypotension'],
    isLifeThreatening: false,
    requiresMedicalSupervision: false,
  },
  {
    id: 'diabetes_type1',
    name: 'Type 1 Diabetes',
    category: 'endocrine',
    aliases: ['t1d', 'type 1', 'juvenile diabetes', 'insulin dependent'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'diabetes_type2',
    name: 'Type 2 Diabetes',
    category: 'endocrine',
    aliases: ['t2d', 'type 2', 'adult onset diabetes', 'non-insulin dependent'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'heart_disease',
    name: 'Heart Disease / Cardiovascular Disease',
    category: 'cardiovascular',
    aliases: ['chd', 'cad', 'heart condition', 'cardiac disease', 'heart failure'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'arrhythmia',
    name: 'Heart Arrhythmia',
    category: 'cardiovascular',
    aliases: ['irregular heartbeat', 'atrial fibrillation', 'afib', 'palpitations', 'cardiac arrhythmia'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'glaucoma',
    name: 'Glaucoma',
    category: 'ophthalmological',
    aliases: ['increased eye pressure', 'intraocular hypertension'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'hormone_sensitive_cancer',
    name: 'Hormone-Sensitive Cancer',
    category: 'oncological',
    aliases: ['breast cancer', 'uterine cancer', 'endometrial cancer', 'prostate cancer', 'hormone receptor positive'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'skin_sensitivity',
    name: 'Sensitive Skin / Dermatitis',
    category: 'dermatological',
    aliases: ['eczema', 'psoriasis', 'dermatitis', 'sensitive skin', 'allergic skin'],
    isLifeThreatening: false,
    requiresMedicalSupervision: false,
  },
  {
    id: 'multiple_chemical_sensitivity',
    name: 'Multiple Chemical Sensitivity',
    category: 'immunological',
    aliases: ['mcs', 'chemical sensitivity', 'environmental illness', 'fragrance sensitivity'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'autoimmune',
    name: 'Autoimmune Disease',
    category: 'immunological',
    aliases: ['lupus', 'rheumatoid arthritis', 'multiple sclerosis', 'crohns', 'ulcerative colitis', 'autoimmune'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'transplant',
    name: 'Organ Transplant Recipient',
    category: 'immunological',
    aliases: ['kidney transplant', 'liver transplant', 'heart transplant', 'immunosuppressed', 'transplant'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'asthma',
    name: 'Asthma',
    category: 'respiratory',
    aliases: ['reactive airway disease', 'bronchial asthma'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'copd',
    name: 'COPD (Chronic Obstructive Pulmonary Disease)',
    category: 'respiratory',
    aliases: ['chronic bronchitis', 'emphysema'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'allergies',
    name: 'Severe Allergies / Anaphylaxis History',
    category: 'immunological',
    aliases: ['anaphylaxis', 'severe allergy', 'epinephrine', 'epipen'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'gerd',
    name: 'GERD / Acid Reflux',
    category: 'gastrointestinal',
    aliases: ['gastroesophageal reflux', 'acid reflux', 'heartburn', 'peptic reflux', 'indigestion'],
    isLifeThreatening: false,
    requiresMedicalSupervision: false,
  },
  {
    id: 'migraine',
    name: 'Migraine Disorder',
    category: 'neurological',
    aliases: ['migraines', 'chronic migraine', 'migraine with aura', 'migraine without aura'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'depression',
    name: 'Depression / Major Depressive Disorder',
    category: 'psychiatric',
    aliases: ['major depression', 'clinical depression', 'mdd', 'depressive disorder'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'anxiety_disorder',
    name: 'Anxiety Disorder',
    category: 'psychiatric',
    aliases: ['generalized anxiety', 'gad', 'panic disorder', 'social anxiety', 'anxiety'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'bipolar',
    name: 'Bipolar Disorder',
    category: 'psychiatric',
    aliases: ['manic depression', 'bipolar 1', 'bipolar 2', 'manic depressive'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'schizophrenia',
    name: 'Schizophrenia / Psychotic Disorder',
    category: 'psychiatric',
    aliases: ['psychosis', 'schizoaffective', 'psychotic disorder'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'ptsd',
    name: 'PTSD / Trauma Disorder',
    category: 'psychiatric',
    aliases: ['post traumatic stress', 'ptsd', 'trauma', 'cptsd'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'adhd',
    name: 'ADHD / ADD',
    category: 'neurological',
    aliases: ['attention deficit', 'adhd', 'add', 'hyperactivity'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'chronic_pain',
    name: 'Chronic Pain Syndrome',
    category: 'pain',
    aliases: ['chronic pain', 'fibromyalgia', 'neuropathic pain', 'crps', 'chronic pain syndrome'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'osteoporosis',
    name: 'Osteoporosis',
    category: 'musculoskeletal',
    aliases: ['bone loss', 'osteopenia', 'fragile bones'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'anemia',
    name: 'Anemia',
    category: 'hematological',
    aliases: ['low iron', 'iron deficiency', 'low hemoglobin', 'b12 deficiency'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'g6pd_deficiency',
    name: 'G6PD Deficiency',
    category: 'genetic',
    aliases: ['favism', 'g6pd', 'glucose-6-phosphate dehydrogenase'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'phenylketonuria',
    name: 'Phenylketonuria (PKU)',
    category: 'genetic',
    aliases: ['pku', 'phenylalanine intolerance'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'sleep_apnea',
    name: 'Sleep Apnea',
    category: 'respiratory',
    aliases: ['osa', 'obstructive sleep apnea', 'central sleep apnea', 'cpap user'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'stroke_history',
    name: 'History of Stroke / TIA',
    category: 'cardiovascular',
    aliases: ['stroke', 'tia', 'transient ischemic attack', 'cerebrovascular accident', 'cva'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'dvt_history',
    name: 'History of DVT / Blood Clots',
    category: 'cardiovascular',
    aliases: ['dvt', 'deep vein thrombosis', 'pulmonary embolism', 'pe', 'blood clot history'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'thyroid_disease',
    name: 'Thyroid Disease',
    category: 'endocrine',
    aliases: ['hypothyroidism', 'hyperthyroidism', 'hashimotos', 'graves disease', 'thyroid', 'goiter'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'pcos',
    name: 'PCOS (Polycystic Ovary Syndrome)',
    category: 'endocrine',
    aliases: ['pcos', 'polycystic ovaries', 'polycystic ovarian syndrome'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'endometriosis',
    name: 'Endometriosis',
    category: 'gynecological',
    aliases: ['endo', 'endometriosis', 'chronic pelvic pain'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'uterine_fibroids',
    name: 'Uterine Fibroids',
    category: 'gynecological',
    aliases: ['fibroids', 'leiomyomas', 'uterine tumors'],
    isLifeThreatening: false,
    requiresMedicalSupervision: false,
  },
  {
    id: 'interstitial_cystitis',
    name: 'Interstitial Cystitis',
    category: 'urological',
    aliases: ['ic', 'painful bladder syndrome', 'bladder pain'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'chronic_kidney_disease',
    name: 'Chronic Kidney Disease (CKD)',
    category: 'renal',
    aliases: ['ckd', 'renal disease', 'kidney disease', 'renal insufficiency'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'liver_cirrhosis',
    name: 'Liver Cirrhosis',
    category: 'hepatic',
    aliases: ['cirrhosis', 'liver scarring', 'end stage liver disease', 'esld'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'hepatitis',
    name: 'Hepatitis (Active or Chronic)',
    category: 'hepatic',
    aliases: ['hepatitis b', 'hepatitis c', 'hbv', 'hcv', 'viral hepatitis'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'hiv',
    name: 'HIV / AIDS',
    category: 'immunological',
    aliases: ['hiv', 'aids', 'hiv positive', 'immunocompromised'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'cancer_active',
    name: 'Active Cancer / Oncology Treatment',
    category: 'oncological',
    aliases: ['cancer', 'chemotherapy', 'radiation', 'oncology patient', 'active malignancy'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'pancreatitis',
    name: 'Pancreatitis (History or Active)',
    category: 'gastrointestinal',
    aliases: ['pancreatitis', 'pancreas inflammation', 'chronic pancreatitis'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
  {
    id: 'gallstones',
    name: 'Gallstones / Gallbladder Disease',
    category: 'gastrointestinal',
    aliases: ['gallstones', 'cholelithiasis', 'gallbladder', 'biliary colic'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'ibs',
    name: 'IBS (Irritable Bowel Syndrome)',
    category: 'gastrointestinal',
    aliases: ['ibs', 'irritable bowel', 'spastic colon', 'functional bowel disorder'],
    isLifeThreatening: false,
    requiresMedicalSupervision: false,
  },
  {
    id: 'ibd',
    name: 'IBD (Inflammatory Bowel Disease)',
    category: 'gastrointestinal',
    aliases: ['crohns', 'crohn disease', 'ulcerative colitis', 'uc'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'celiac',
    name: 'Celiac Disease',
    category: 'gastrointestinal',
    aliases: ['celiac', 'gluten intolerance', 'gluten sensitivity', 'coeliac'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'pregnancy_planning',
    name: 'Planning Pregnancy / TTC',
    category: 'reproductive',
    aliases: ['ttc', 'trying to conceive', 'planning pregnancy', 'fertility treatment', 'ivf'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'menopause',
    name: 'Menopause / Perimenopause',
    category: 'reproductive',
    aliases: ['menopause', 'perimenopause', 'postmenopausal', 'hormone changes'],
    isLifeThreatening: false,
    requiresMedicalSupervision: false,
  },
  {
    id: 'varicose_veins',
    name: 'Varicose Veins / Venous Insufficiency',
    category: 'vascular',
    aliases: ['varicose veins', 'venous insufficiency', 'spider veins', 'venous stasis'],
    isLifeThreatening: false,
    requiresMedicalSupervision: false,
  },
  {
    id: 'raynauds',
    name: 'Raynaud\'s Phenomenon',
    category: 'vascular',
    aliases: ['raynauds', 'raynaud phenomenon', 'cold sensitivity fingers'],
    isLifeThreatening: false,
    requiresMedicalSupervision: false,
  },
  {
    id: 'tinnitus',
    name: 'Tinnitus',
    category: 'ent',
    aliases: ['ringing in ears', 'tinnitus', 'ear ringing', 'hearing disorder'],
    isLifeThreatening: false,
    requiresMedicalSupervision: false,
  },
  {
    id: 'motion_sickness',
    name: 'Motion Sensitivity / Vertigo',
    category: 'neurological',
    aliases: ['motion sickness', 'vertigo', 'dizziness', 'balance disorder'],
    isLifeThreatening: false,
    requiresMedicalSupervision: false,
  },
  {
    id: 'addiction_recovery',
    name: 'Addiction Recovery',
    category: 'psychiatric',
    aliases: ['substance abuse recovery', 'addiction recovery', 'sobriety', 'in recovery'],
    isLifeThreatening: false,
    requiresMedicalSupervision: true,
  },
  {
    id: 'eating_disorder',
    name: 'Eating Disorder (Active or History)',
    category: 'psychiatric',
    aliases: ['anorexia', 'bulimia', 'binge eating', 'eating disorder', 'ed'],
    isLifeThreatening: true,
    requiresMedicalSupervision: true,
  },
];

// ============================================================================
// OIL-CONDITION CONTRAINDICATIONS
// ============================================================================

export const OIL_CONDITION_CONTRAINDICATIONS = [
  // EPILEPSY CONTRAINDICATIONS
  {
    oilId: 'rosemary',
    conditionId: 'epilepsy',
    severity: 'contraindicated',
    reason: 'Contains camphor and 1,8-cineole, both neurotoxic and can trigger seizures in susceptible individuals.',
    specificRisks: ['Seizure induction', 'Status epilepticus', 'Neurotoxicity'],
    alternativeOils: ['lavender', 'frankincense', 'bergamot-fcf'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'fennel',
    conditionId: 'epilepsy',
    severity: 'contraindicated',
    reason: 'Contains trans-anethole which is neurotoxic and lowers seizure threshold.',
    specificRisks: ['Seizure trigger', 'Convulsions'],
    alternativeOils: ['sweet-orange', 'mandarin'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'hyssop',
    conditionId: 'epilepsy',
    severity: 'contraindicated',
    reason: 'Contains pinocamphone, a potent neurotoxin that can trigger seizures.',
    specificRisks: ['Seizure trigger', 'Convulsions', 'Neurotoxicity'],
    alternativeOils: ['lavender', 'frankincense'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'sage',
    conditionId: 'epilepsy',
    severity: 'contraindicated',
    reason: 'Contains thujone, a known convulsant and neurotoxin.',
    specificRisks: ['Seizure trigger', 'Neurotoxicity'],
    alternativeOils: ['clary-sage'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'camphor',
    conditionId: 'epilepsy',
    severity: 'contraindicated',
    reason: 'Potent neurotoxin that can trigger seizures.',
    specificRisks: ['Seizure trigger', 'Status epilepticus', 'Death in overdose'],
    alternativeOils: ['eucalyptus-radiata', 'ravintsara'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'wormwood',
    conditionId: 'epilepsy',
    severity: 'contraindicated',
    reason: 'Contains high levels of thujone, a convulsant.',
    specificRisks: ['Seizure trigger', 'Hallucinations', 'Neurotoxicity'],
    alternativeOils: ['roman-chamomile', 'frankincense'],
    evidenceLevel: 'clinical',
  },

  // BLEEDING DISORDERS
  {
    oilId: 'clove-bud',
    conditionId: 'hemophilia',
    severity: 'contraindicated',
    reason: 'High eugenol content (85%) has potent anticoagulant effects.',
    specificRisks: ['Severe hemorrhage', 'Uncontrolled bleeding', 'Death'],
    alternativeOils: ['lavender', 'frankincense'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'wintergreen',
    conditionId: 'hemophilia',
    severity: 'contraindicated',
    reason: 'Natural aspirin (methyl salicylate) affects platelet function.',
    specificRisks: ['Increased bleeding', 'Hemorrhage'],
    alternativeOils: ['peppermint', 'eucalyptus'],
    evidenceLevel: 'clinical',
  },

  // ASTHMA
  {
    oilId: 'peppermint',
    conditionId: 'severe_asthma',
    severity: 'major',
    reason: 'Menthol can trigger bronchospasm in sensitive individuals with severe asthma.',
    specificRisks: ['Bronchospasm', 'Asthma attack', 'Respiratory distress'],
    alternativeOils: ['lavender', 'frankincense', 'roman-chamomile'],
    ifUnavoidable: 'Use only in very low dilution (0.5%) with inhalation only, never topical near chest.',
    evidenceLevel: 'clinical',
  },

  // PREGNANCY
  {
    oilId: 'clary-sage',
    conditionId: 'pregnancy',
    severity: 'contraindicated',
    reason: 'Can stimulate uterine contractions. Traditionally used to induce labor.',
    specificRisks: ['Uterine stimulation', 'Preterm labor', 'Miscarriage risk (first trimester)'],
    alternativeOils: ['lavender', 'mandarin', 'neroli'],
    evidenceLevel: 'traditional',
  },
  {
    oilId: 'sage',
    conditionId: 'pregnancy',
    severity: 'contraindicated',
    reason: 'Contains thujone which is toxic and can affect fetal development. Uterine stimulant.',
    specificRisks: ['Neurotoxicity', 'Uterine stimulation', 'Fetal harm'],
    alternativeOils: ['clary-sage'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'hyssop',
    conditionId: 'pregnancy',
    severity: 'contraindicated',
    reason: 'Neurotoxic and can stimulate uterine contractions.',
    specificRisks: ['Neurotoxicity', 'Uterine stimulation', 'Miscarriage'],
    alternativeOils: ['lavender', 'frankincense'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'juniper-berry',
    conditionId: 'pregnancy',
    severity: 'major',
    reason: 'May stimulate uterine contractions and affect kidney function.',
    specificRisks: ['Uterine stimulation', 'Nephrotoxicity'],
    alternativeOils: ['grapefruit', 'mandarin'],
    evidenceLevel: 'traditional',
  },
  {
    oilId: 'rosemary',
    conditionId: 'pregnancy',
    severity: 'major',
    reason: 'Can stimulate uterine contractions and raise blood pressure.',
    specificRisks: ['Uterine stimulation', 'Hypertension', 'Preterm labor'],
    alternativeOils: ['lavender', 'frankincense'],
    evidenceLevel: 'traditional',
  },

  // LIVER DISEASE
  {
    oilId: 'wintergreen',
    conditionId: 'liver_disease',
    severity: 'contraindicated',
    reason: 'Methyl salicylate is hepatotoxic, especially in impaired liver function.',
    specificRisks: ['Hepatotoxicity', 'Liver failure', 'Death in overdose'],
    alternativeOils: ['peppermint', 'eucalyptus'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'aniseed',
    conditionId: 'liver_disease',
    severity: 'major',
    reason: 'Contains anethole which can be hepatotoxic.',
    specificRisks: ['Hepatotoxicity', 'Liver damage'],
    alternativeOils: ['sweet-orange', 'mandarin'],
    evidenceLevel: 'clinical',
  },

  // GLAUCOMA
  {
    oilId: 'rosemary',
    conditionId: 'glaucoma',
    severity: 'major',
    reason: 'Can increase intraocular pressure, worsening glaucoma.',
    specificRisks: ['Increased eye pressure', 'Vision damage', 'Glaucoma progression'],
    alternativeOils: ['lavender', 'frankincense'],
    evidenceLevel: 'clinical',
  },

  // HORMONE-SENSITIVE CONDITIONS
  {
    oilId: 'fennel',
    conditionId: 'hormone_sensitive_cancer',
    severity: 'contraindicated',
    reason: 'Strong estrogenic activity may stimulate hormone-sensitive cancer cells.',
    specificRisks: ['Cancer progression', 'Hormonal stimulation'],
    alternativeOils: ['sweet-orange', 'grapefruit-fcf'],
    evidenceLevel: 'clinical',
  },
  {
    oilId: 'aniseed',
    conditionId: 'hormone_sensitive_cancer',
    severity: 'major',
    reason: 'Estrogenic properties may affect hormone-sensitive cancers.',
    specificRisks: ['Hormonal stimulation', 'Cancer progression (theoretical)'],
    alternativeOils: ['sweet-orange', 'mandarin'],
    evidenceLevel: 'theoretical',
  },
  {
    oilId: 'clary-sage',
    conditionId: 'hormone_sensitive_cancer',
    severity: 'moderate',
    reason: 'Contains sclareol with estrogenic activity.',
    specificRisks: ['Hormonal effects', 'Theoretical cancer stimulation'],
    alternativeOils: ['geranium', 'bergamot-fcf'],
    evidenceLevel: 'theoretical',
  },
];

// ============================================================================
// AGE-BASED DOSAGE LIMITS (Maximum drops per application)
// Based on Tisserand & Young guidelines
// ============================================================================

export const AGE_DOSAGE_LIMITS = {
  infant_0_3mo: {
    label: '0-3 months',
    maxDrops: 0, // Generally avoid unless medically supervised
    maxDilution: 0.1, // 0.1%
    notes: 'Generally avoid essential oils unless under medical supervision. Hydrosols preferred.',
  },
  infant_3_6mo: {
    label: '3-6 months',
    maxDrops: 1,
    maxDilution: 0.25, // 0.25%
    notes: 'Extreme caution. Limited oils safe (lavender, chamomile).',
  },
  infant_6_12mo: {
    label: '6-12 months',
    maxDrops: 2,
    maxDilution: 0.5, // 0.5%
    notes: 'Very limited use. Lavender, chamomile, mandarin generally safe when properly diluted.',
  },
  child_1_2yr: {
    label: '1-2 years',
    maxDrops: 3,
    maxDilution: 0.5,
    notes: 'Avoid many oils. Safe: lavender, chamomile, mandarin, frankincense.',
  },
  child_2_6yr: {
    label: '2-6 years',
    maxDrops: 4,
    maxDilution: 1.0,
    notes: 'Expanded safe list. Still avoid stimulating oils (rosemary, peppermint).',
  },
  child_6_12yr: {
    label: '6-12 years',
    maxDrops: 6,
    maxDilution: 1.5,
    notes: 'Most oils safe except those with specific pediatric contraindications.',
  },
  teen_12_15yr: {
    label: '12-15 years',
    maxDrops: 8,
    maxDilution: 2.0,
    notes: 'Near-adult dosing. Still avoid highly toxic oils.',
  },
  adult: {
    label: 'Adult (15+)',
    maxDrops: 10,
    maxDilution: 5.0, // Up to 5% for short-term use
    notes: 'Standard adult dosing. Still observe oil-specific limits.',
  },
  elderly: {
    label: 'Elderly (65+)',
    maxDrops: 6,
    maxDilution: 2.0,
    notes: 'Reduced dosing due to thinner skin, medication interactions, and slower metabolism.',
  },
};

// ============================================================================
// UTILITIES
// ============================================================================

export function searchMedications(query: string): typeof COMMON_MEDICATIONS {
  const lowerQuery = query.toLowerCase();
  return COMMON_MEDICATIONS.filter(med => 
    med.genericName.toLowerCase().includes(lowerQuery) ||
    med.brandNames?.some(name => name.toLowerCase().includes(lowerQuery)) ||
    med.searchTerms?.some(term => term.toLowerCase().includes(lowerQuery)) ||
    med.drugClass.toLowerCase().includes(lowerQuery)
  );
}

export function getMedicationsByClass(drugClass: string): typeof COMMON_MEDICATIONS {
  return COMMON_MEDICATIONS.filter(med => 
    med.drugClass.toLowerCase().includes(drugClass.toLowerCase())
  );
}

export function getContraindicatedOils(medicationId: string): string[] {
  // Return oil IDs that have major or contraindicated interactions with the
  // given medication. Matches rows tagged with this exact medication
  // (medicationId), plus class-wide rows (medicationClass) when the queried
  // medication's drugClass contains the row's class keyword.
  //
  // Before 2026-07-21 this compared i.medicationId === medicationId while
  // 78/79 rows left medicationId unset, so it effectively always returned [].
  // Rows are being tagged incrementally — currently the warfarin section and
  // the class-wide anticoagulant row; untagged sections (blood pressure,
  // diabetes, SSRI/SNRI, benzodiazepines, epilepsy, chemotherapy, hormonal,
  // immunosuppressants, corticosteroids, pain, and the 2020s-era agents)
  // still match nothing here until tagged.
  const id = medicationId.toLowerCase();
  const med = COMMON_MEDICATIONS.find(m =>
    m.genericName.toLowerCase() === id ||
    m.brandNames?.some(b => b.toLowerCase() === id) ||
    m.searchTerms?.some(t => t.toLowerCase() === id)
  );

  const interactions = OIL_MEDICATION_INTERACTIONS.filter(i => {
    if (i.severity !== 'contraindicated' && i.severity !== 'major') return false;
    if (i.medicationId?.toLowerCase() === id) return true;
    if (i.medicationClass && med?.drugClass.toLowerCase().includes(i.medicationClass.toLowerCase())) return true;
    return false;
  });

  return [...new Set(interactions.map(i => i.oilId!))];
}
