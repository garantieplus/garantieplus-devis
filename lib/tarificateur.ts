import { VehiculeInput, GarantieProposee } from '@/types';

// ─── Constantes ───────────────────────────────────────────────────────────────

const AVANTAGES_COMMUNS = [
  'Pas de vétusté appliquée',
  'Pas de franchise',
  'Pas de carence',
  "Pas d'avance de frais",
  'Cessible gratuitement',
  'Kilométrage illimité',
  'Couverture Européenne',
  '100% Digital',
  "Plafond PAR intervention — pas d'enveloppe globale",
  'Plafond fixe sans dégressivité — même après 7 ou 10 ans',
];

const AVANTAGES_SPECIFIQUES: Record<string, string[]> = {
  classique_5: [
    'Garantie TOUT SAUF — la couverture la plus complète du marché',
    'Plafond VRADE (valeur réelle du véhicule à la date du sinistre)',
    'Embrayage inclus',
    'Système AdBlue couvert',
    'Aide à la conduite couverte',
    'Diagnostic & Ingrédients inclus',
    "Main d'œuvre incluse",
  ],
  classique_4: [
    'Plus de 120 pièces couvertes',
    "Jusqu'à 10 000€ par intervention",
    'Diagnostic & Ingrédients inclus',
    'Climatisation couverte',
    'Systèmes de sécurité couverts',
    "Main d'œuvre incluse",
  ],
  classique_3: [
    'Plus de 120 pièces couvertes',
    'Plafond selon durée : 1 500€ (6 mois) / 2 500€ (12 mois) / 3 000€ (24 mois)',
    'Diagnostic & Ingrédients inclus',
    'Climatisation couverte',
    'Systèmes de sécurité couverts',
    "Main d'œuvre incluse",
  ],
  eco_5: [
    'Garantie TOUT SAUF — la couverture la plus complète du marché',
    "Jusqu'à 10 000€ par intervention",
    'Groupe motopropulseur électrique couvert',
    'Batterie de servitude incluse',
    'Système de charge complet (AC & DC)',
    'Faisceaux et câbles haute tension couverts',
    'Calculateurs de gestion batterie/moteur inclus',
    'Mise à jour logicielle (MAJ) couverte',
    "Main d'œuvre + Essai routier inclus",
  ],
  eco_4: [
    'Garantie TOUT SAUF — la couverture la plus complète du marché',
    "Jusqu'à 10 000€ par intervention",
    'Groupe motopropulseur électrique couvert',
    'Batterie de servitude incluse',
    'Système de charge complet (AC & DC)',
    'Faisceaux et câbles haute tension couverts',
    'Calculateurs de gestion inclus',
    "Main d'œuvre incluse",
  ],
  luxe_5: [
    'Garantie TOUT SAUF — la couverture la plus complète du marché',
    "Jusqu'à 15 000€ par intervention",
    'Embrayage inclus',
    'Système AdBlue couvert',
    'Aide à la conduite couverte',
    'Diagnostic & Ingrédients inclus',
    "Main d'œuvre incluse",
  ],
  luxe_4: [
    'Plus de 120 pièces couvertes',
    "Jusqu'à 10 000€ par intervention",
    'Diagnostic & Ingrédients inclus',
    'Climatisation couverte',
    'Systèmes de sécurité couverts',
    "Main d'œuvre incluse",
  ],
  luxe_3: [
    'Plus de 120 pièces couvertes',
    "Jusqu'à 7 500€ par intervention",
    'Diagnostic & Ingrédients inclus',
    'Climatisation couverte',
    'Systèmes de sécurité couverts',
    "Main d'œuvre incluse",
  ],
  luxe_premium_5: [
    'Garantie TOUT SAUF — la couverture la plus complète du marché',
    "Jusqu'à 15 000€ par intervention",
    'Embrayage inclus',
    'Système AdBlue couvert',
    'Aide à la conduite couverte',
    'Diagnostic & Ingrédients inclus',
    "Main d'œuvre incluse",
  ],
  luxe_premium_4: [
    'Plus de 120 pièces couvertes',
    "Jusqu'à 10 000€ par intervention",
    'Diagnostic & Ingrédients inclus',
    'Climatisation couverte',
    'Systèmes de sécurité couverts',
    "Main d'œuvre incluse",
  ],
  luxe_premium_3: [
    'Plus de 120 pièces couvertes',
    "Jusqu'à 7 500€ par intervention",
    'Diagnostic & Ingrédients inclus',
    'Climatisation couverte',
    'Systèmes de sécurité couverts',
    "Main d'œuvre incluse",
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getAgeAns = (dateCirculation: Date): number => {
  const now = new Date();
  return (now.getTime() - dateCirculation.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
};

const estPondere = (input: VehiculeInput, gamme: string): boolean => {
  if (gamme === 'luxe' || gamme === 'luxe_premium') return false;
  if (gamme === 'eco') return input.is4x4 || input.isPlus14cv || input.isPlus2t3;
  return input.is4x4 || input.isPlus14cv || input.isPlus2t3 || input.valeurNeuf55k;
};

const appliquerPonderation = (prix: number): number => Math.ceil(prix * 1.5);

const applyPrix = (
  base: { '6': number; '12': number; '24': number },
  pondere: boolean
): { '6': number; '12': number; '24': number } => {
  if (!pondere) return base;
  return {
    '6': appliquerPonderation(base['6']),
    '12': appliquerPonderation(base['12']),
    '24': appliquerPonderation(base['24']),
  };
};

// ─── Tarificateur principal ────────────────────────────────────────────────────

export const calculerGaranties = (input: VehiculeInput): GarantieProposee[] => {
  const age = getAgeAns(input.dateCirculation);
  const km = input.kilometrage;

  // Exclusions totales
  if (age > 15 || km > 200000) return [];

  const garanties: GarantieProposee[] = [];

  // ── GAMME ECO (hybride/électrique) ────────────────────────────────────────
  if (input.isHybrideElectrique) {
    const pondere5 = estPondere(input, 'eco');
    const base5 = { '6': 290, '12': 390, '24': 690 };
    if (age <= 6 && km <= 70000) {
      garanties.push({
        gamme: 'eco',
        niveau: 5,
        nomCommercial: 'Garantie ECO 5 Feuilles',
        etoilesAffichage: '🍀🍀🍀🍀🍀',
        ageMaxAns: 6,
        kmMax: 70000,
        plafondIntervention: '10 000€',
        nombrePiecesCouvertes: '+300 pièces',
        prixBase: base5,
        prixFinal: applyPrix(base5, pondere5),
        pondereApplique: pondere5,
        avantagesCommuns: AVANTAGES_COMMUNS,
        avantagesSpecifiques: AVANTAGES_SPECIFIQUES['eco_5'],
        fichierCG: '/cg/CG_ECO_5etoiles.pdf',
      });
    }

    const pondere4 = estPondere(input, 'eco');
    const base4 = { '6': 390, '12': 490, '24': 890 };
    if (age <= 10 && km <= 120000) {
      garanties.push({
        gamme: 'eco',
        niveau: 4,
        nomCommercial: 'Garantie ECO 4 Feuilles',
        etoilesAffichage: '🍀🍀🍀🍀',
        ageMaxAns: 10,
        kmMax: 120000,
        plafondIntervention: '10 000€',
        nombrePiecesCouvertes: '+300 pièces',
        prixBase: base4,
        prixFinal: applyPrix(base4, pondere4),
        pondereApplique: pondere4,
        avantagesCommuns: AVANTAGES_COMMUNS,
        avantagesSpecifiques: AVANTAGES_SPECIFIQUES['eco_4'],
        fichierCG: '/cg/CG_ECO_4etoiles.pdf',
      });
    }

    return garanties;
  }

  // ── GAMME LUXE PREMIUM (>150 000€) ────────────────────────────────────────
  if (input.valeurNeuf150k) {
    const base5 = { '6': 990, '12': 1190, '24': 2190 };
    if (age <= 6 && km <= 120000) {
      garanties.push({
        gamme: 'luxe_premium',
        niveau: 5,
        nomCommercial: 'Garantie Luxe Premium 5 Étoiles',
        etoilesAffichage: '⭐⭐⭐⭐⭐ Luxe Premium',
        ageMaxAns: 6,
        kmMax: 120000,
        plafondIntervention: '15 000€',
        nombrePiecesCouvertes: '+300 pièces',
        prixBase: base5,
        prixFinal: base5,
        pondereApplique: false,
        avantagesCommuns: AVANTAGES_COMMUNS,
        avantagesSpecifiques: AVANTAGES_SPECIFIQUES['luxe_premium_5'],
        fichierCG: '/cg/CG_LuxePremium_5etoiles.pdf',
      });
    }

    const base4 = { '6': 890, '12': 1090, '24': 2090 };
    if (age <= 10 && km <= 150000) {
      garanties.push({
        gamme: 'luxe_premium',
        niveau: 4,
        nomCommercial: 'Garantie Luxe Premium 4 Étoiles',
        etoilesAffichage: '⭐⭐⭐⭐ Luxe Premium',
        ageMaxAns: 10,
        kmMax: 150000,
        plafondIntervention: '10 000€',
        nombrePiecesCouvertes: '+120 pièces',
        prixBase: base4,
        prixFinal: base4,
        pondereApplique: false,
        avantagesCommuns: AVANTAGES_COMMUNS,
        avantagesSpecifiques: AVANTAGES_SPECIFIQUES['luxe_premium_4'],
        fichierCG: '/cg/CG_LuxePremium_4etoiles.pdf',
      });
    }

    const base3 = { '6': 690, '12': 990, '24': 1790 };
    if (age <= 15 && km <= 200000) {
      garanties.push({
        gamme: 'luxe_premium',
        niveau: 3,
        nomCommercial: 'Garantie Luxe Premium 3 Étoiles',
        etoilesAffichage: '⭐⭐⭐ Luxe Premium',
        ageMaxAns: 15,
        kmMax: 200000,
        plafondIntervention: '7 500€',
        nombrePiecesCouvertes: '+120 pièces',
        prixBase: base3,
        prixFinal: base3,
        pondereApplique: false,
        avantagesCommuns: AVANTAGES_COMMUNS,
        avantagesSpecifiques: AVANTAGES_SPECIFIQUES['luxe_premium_3'],
        fichierCG: '/cg/CG_LuxePremium_3etoiles.pdf',
      });
    }

    return garanties;
  }

  // ── GAMME LUXE (>100 000€) ────────────────────────────────────────────────
  if (input.valeurNeuf100k) {
    const base5 = { '6': 690, '12': 890, '24': 1590 };
    if (age <= 6 && km <= 120000) {
      garanties.push({
        gamme: 'luxe',
        niveau: 5,
        nomCommercial: 'Garantie Luxe 5 Étoiles',
        etoilesAffichage: '⭐⭐⭐⭐⭐ Luxe',
        ageMaxAns: 6,
        kmMax: 120000,
        plafondIntervention: '15 000€',
        nombrePiecesCouvertes: '+300 pièces',
        prixBase: base5,
        prixFinal: base5,
        pondereApplique: false,
        avantagesCommuns: AVANTAGES_COMMUNS,
        avantagesSpecifiques: AVANTAGES_SPECIFIQUES['luxe_5'],
        fichierCG: '/cg/CG_Luxe_5etoiles.pdf',
      });
    }

    const base4 = { '6': 590, '12': 790, '24': 1490 };
    if (age <= 10 && km <= 150000) {
      garanties.push({
        gamme: 'luxe',
        niveau: 4,
        nomCommercial: 'Garantie Luxe 4 Étoiles',
        etoilesAffichage: '⭐⭐⭐⭐ Luxe',
        ageMaxAns: 10,
        kmMax: 150000,
        plafondIntervention: '10 000€',
        nombrePiecesCouvertes: '+120 pièces',
        prixBase: base4,
        prixFinal: base4,
        pondereApplique: false,
        avantagesCommuns: AVANTAGES_COMMUNS,
        avantagesSpecifiques: AVANTAGES_SPECIFIQUES['luxe_4'],
        fichierCG: '/cg/CG_Luxe_4etoiles.pdf',
      });
    }

    const base3 = { '6': 490, '12': 690, '24': 1290 };
    if (age <= 15 && km <= 200000) {
      garanties.push({
        gamme: 'luxe',
        niveau: 3,
        nomCommercial: 'Garantie Luxe 3 Étoiles',
        etoilesAffichage: '⭐⭐⭐ Luxe',
        ageMaxAns: 15,
        kmMax: 200000,
        plafondIntervention: '7 500€',
        nombrePiecesCouvertes: '+120 pièces',
        prixBase: base3,
        prixFinal: base3,
        pondereApplique: false,
        avantagesCommuns: AVANTAGES_COMMUNS,
        avantagesSpecifiques: AVANTAGES_SPECIFIQUES['luxe_3'],
        fichierCG: '/cg/CG_Luxe_3etoiles.pdf',
      });
    }

    return garanties;
  }

  // ── GAMME CLASSIQUE ───────────────────────────────────────────────────────
  const pondere = estPondere(input, 'classique');

  const base5 = { '6': 309, '12': 399, '24': 699 };
  if (age <= 6 && km <= 120000) {
    garanties.push({
      gamme: 'classique',
      niveau: 5,
      nomCommercial: 'Garantie Classique 5 Étoiles',
      etoilesAffichage: '⭐⭐⭐⭐⭐',
      ageMaxAns: 6,
      kmMax: 120000,
      plafondIntervention: 'VRADE',
      nombrePiecesCouvertes: '+300 pièces',
      prixBase: base5,
      prixFinal: applyPrix(base5, pondere),
      pondereApplique: pondere,
      avantagesCommuns: AVANTAGES_COMMUNS,
      avantagesSpecifiques: AVANTAGES_SPECIFIQUES['classique_5'],
      fichierCG: '/cg/CG_Classique_5etoiles.pdf',
    });
  }

  const base4 = { '6': 299, '12': 389, '24': 689 };
  if (age <= 10 && km <= 150000) {
    garanties.push({
      gamme: 'classique',
      niveau: 4,
      nomCommercial: 'Garantie Classique 4 Étoiles',
      etoilesAffichage: '⭐⭐⭐⭐',
      ageMaxAns: 10,
      kmMax: 150000,
      plafondIntervention: '10 000€',
      nombrePiecesCouvertes: '+120 pièces',
      prixBase: base4,
      prixFinal: applyPrix(base4, pondere),
      pondereApplique: pondere,
      avantagesCommuns: AVANTAGES_COMMUNS,
      avantagesSpecifiques: AVANTAGES_SPECIFIQUES['classique_4'],
      fichierCG: '/cg/CG_Classique_4etoiles.pdf',
    });
  }

  const base3 = { '6': 249, '12': 339, '24': 639 };
  if (age <= 15 && km <= 200000) {
    garanties.push({
      gamme: 'classique',
      niveau: 3,
      nomCommercial: 'Garantie Classique 3 Étoiles',
      etoilesAffichage: '⭐⭐⭐',
      ageMaxAns: 15,
      kmMax: 200000,
      plafondIntervention: 'Variable selon durée',
      plafondParDuree: { '6': '1 500€', '12': '2 500€', '24': '3 000€' },
      nombrePiecesCouvertes: '+120 pièces',
      prixBase: base3,
      prixFinal: applyPrix(base3, pondere),
      pondereApplique: pondere,
      avantagesCommuns: AVANTAGES_COMMUNS,
      avantagesSpecifiques: AVANTAGES_SPECIFIQUES['classique_3'],
      fichierCG: '/cg/CG_Classique_3etoiles.pdf',
    });
  }

  return garanties;
};

// ─── Tests unitaires intégrés ─────────────────────────────────────────────────

export const runTests = (): void => {
  const makeDate = (yearsAgo: number) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - yearsAgo);
    return d;
  };

  const base = {
    is4x4: false, isPlus2t3: false, isPlus14cv: false,
    isHybrideElectrique: false, valeurNeuf55k: false,
    valeurNeuf100k: false, valeurNeuf150k: false,
  };

  // Peugeot 308, 5 ans, 80 000 km → 3 classiques
  const t1 = calculerGaranties({ ...base, dateCirculation: makeDate(5), kilometrage: 80000 });
  console.assert(t1.length === 3 && t1.every(g => g.gamme === 'classique'), 'T1 failed');

  // Toyota hybride, 4 ans, 50 000 km → 2 eco (niveaux 5 et 4)
  const t2 = calculerGaranties({ ...base, isHybrideElectrique: true, dateCirculation: makeDate(4), kilometrage: 50000 });
  console.assert(t2.length === 2 && t2.every(g => g.gamme === 'eco'), 'T2 failed');

  // BMW Série 7, 8 ans, 90 000 km, >100k€ → luxe 4 + 3
  const t3 = calculerGaranties({ ...base, valeurNeuf100k: true, valeurNeuf55k: true, dateCirculation: makeDate(8), kilometrage: 90000 });
  console.assert(t3.length === 2 && t3.every(g => g.gamme === 'luxe'), 'T3 failed');

  // Vieux diesel, 18 ans, 250 000 km → aucune
  const t4 = calculerGaranties({ ...base, dateCirculation: makeDate(18), kilometrage: 250000 });
  console.assert(t4.length === 0, 'T4 failed');

  // Ferrari, >150k€, 3 ans, 30 000 km → luxe_premium 5
  const t5 = calculerGaranties({ ...base, valeurNeuf150k: true, valeurNeuf100k: true, valeurNeuf55k: true, dateCirculation: makeDate(3), kilometrage: 30000 });
  console.assert(t5.length === 3 && t5.every(g => g.gamme === 'luxe_premium'), 'T5 failed');

  // Kangoo 4x4, 7 ans, 100 000 km, <55k€ → classique 4 + 3 ×1.5
  const t6 = calculerGaranties({ ...base, is4x4: true, dateCirculation: makeDate(7), kilometrage: 100000 });
  console.assert(t6.length === 2 && t6.every(g => g.pondereApplique), 'T6 failed');
  console.assert(t6[0].prixFinal['12'] === Math.ceil(389 * 1.5), 'T6 prix failed');

  // Tesla hybride, 5 ans, 65 000 km → eco uniquement
  const t7 = calculerGaranties({ ...base, isHybrideElectrique: true, dateCirculation: makeDate(5), kilometrage: 65000 });
  console.assert(t7.every(g => g.gamme === 'eco'), 'T7 failed');

  console.log('✅ Tous les tests tarificateur sont passés.');
};
