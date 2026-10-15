// Offres GVO proposables à un garage pour un véhicule — même logique que le tunnel
// « Créer une garantie » de l'espace garage (src/modules/garanties/offre-garage.ts de l'app
// garantieplus), appliquée au catalogue GVO Covéa (contrat n° 8.700.048) :
//   1. éligibilité de chaque garantie (âge, kilométrage, valeur à neuf, énergie) ;
//   2. variante de tarif (jeune, Éco palier 2, Luxe > 150 K€) ;
//   3. pondération ×1,5 (Classique et Éco uniquement) ;
//   4. prix TTC des 3 durées, plafond, pièces et organes couverts.
// Toutes les garanties éligibles sont proposées (un véhicule récent voit la 5, la 4, la 3
// et la 2 Étoiles), la plus étoilée en premier (décision GP 2026-10-15 pour le site devis :
// le comptoir garage, lui, classe par prix).
// Logique pure : aucune I/O, testée par scripts/test-offres.ts.

import type { Energie, Gamme, GarantieProposee, Niveau, Segment, Variante } from '@/types';
import { prixBareme } from './bareme-covea';
import { plafondGvo } from './plafond';
import { organesPour, piecesPour } from './organes';
import { CARNET_2026 } from './documents';

export interface FaitsVehicule {
  ageAnnees: number;
  kilometrage: number;
  valeurNeufEuros: number;
  energie: Energie;
  is4x4: boolean;
  isPlus14cv: boolean;
  isPlus2t3: boolean;
}

// Frontière de gamme par valeur à neuf (décision GP 2026-09) : Classique jusqu'à
// 100 000 € INCLUS, Luxe au-dessus. Bande de pondération : 55 000 à 100 000 € INCLUS.
export const CLASSIQUE_VALEUR_MAX = 100000;
export const LUXE_VALEUR_MIN = CLASSIQUE_VALEUR_MAX + 1;
export const PONDERATION_VALEUR_MIN = 55000;
export const PONDERATION_COEF = 1.5;
export const LUXE_PREMIUM_SEUIL = 150000;

type EnergieBucket = 'electrique' | 'hybride_rechargeable' | 'autre';

interface Eligibilite {
  ageMaxAns: number;
  kmMax: number | null;
  valeurMin?: number;
  valeurMax?: number;
  energies: EnergieBucket[];
}

interface GarantieCatalogue {
  code: string;
  label: string;
  gamme: Gamme;
  niveau: Niveau;
  eligibilite: Eligibilite;
}

const THERMIQUE: EnergieBucket[] = ['autre'];
const ECO: EnergieBucket[] = ['electrique', 'hybride_rechargeable'];

/** Catalogue GVO Covéa : garanties et bornes d'éligibilité (migrations 0039, 0043, 0045). */
export const CATALOGUE_GVO: GarantieCatalogue[] = [
  { code: 'GVO-CLA-5', label: 'Garantie 5 Étoiles', gamme: 'classique', niveau: 5, eligibilite: { ageMaxAns: 6, kmMax: 120000, valeurMax: CLASSIQUE_VALEUR_MAX, energies: THERMIQUE } },
  { code: 'GVO-CLA-4', label: 'Garantie 4 Étoiles', gamme: 'classique', niveau: 4, eligibilite: { ageMaxAns: 10, kmMax: 150000, valeurMax: CLASSIQUE_VALEUR_MAX, energies: THERMIQUE } },
  { code: 'GVO-CLA-3', label: 'Garantie 3 Étoiles', gamme: 'classique', niveau: 3, eligibilite: { ageMaxAns: 15, kmMax: 200000, valeurMax: CLASSIQUE_VALEUR_MAX, energies: THERMIQUE } },
  { code: 'GVO-CLA-2', label: 'Garantie 2 Étoiles', gamme: 'classique', niveau: 2, eligibilite: { ageMaxAns: 20, kmMax: 200000, valeurMax: CLASSIQUE_VALEUR_MAX, energies: THERMIQUE } },
  // Éco : moins de 10 ans SANS limite de kilométrage (décision GP du 24/09) ; le palier
  // < 6 ans et < 70 000 km n'est que la condition du tarif principal.
  { code: 'GVO-ECO-5', label: 'Garantie 5 Étoiles – 100 % Électrique & Hybride', gamme: 'eco', niveau: 5, eligibilite: { ageMaxAns: 10, kmMax: null, energies: ECO } },
  { code: 'GVO-LUX-5', label: 'Garantie 5 Étoiles – Luxe', gamme: 'luxe', niveau: 5, eligibilite: { ageMaxAns: 6, kmMax: 120000, valeurMin: LUXE_VALEUR_MIN, energies: THERMIQUE } },
  { code: 'GVO-LUX-4', label: 'Garantie 4 Étoiles – Luxe', gamme: 'luxe', niveau: 4, eligibilite: { ageMaxAns: 10, kmMax: 150000, valeurMin: LUXE_VALEUR_MIN, energies: THERMIQUE } },
  { code: 'GVO-LUX-3', label: 'Garantie 3 Étoiles – Luxe', gamme: 'luxe', niveau: 3, eligibilite: { ageMaxAns: 15, kmMax: 200000, valeurMin: LUXE_VALEUR_MIN, energies: THERMIQUE } },
  { code: 'GVO-LUX-2', label: 'Garantie 2 Étoiles – Luxe', gamme: 'luxe', niveau: 2, eligibilite: { ageMaxAns: 20, kmMax: 200000, valeurMin: LUXE_VALEUR_MIN, energies: THERMIQUE } },
];

export function energieBucket(e: Energie): EnergieBucket {
  return e === 'electrique' ? 'electrique' : e === 'hybride_rechargeable' ? 'hybride_rechargeable' : 'autre';
}

/** Palier de valeur à neuf (55 k / 100 k / 150 k), pour le choix de variante uniquement. */
export function paliersValeur(valeurNeufEuros: number): number {
  if (valeurNeufEuros >= 150000) return 150000;
  if (valeurNeufEuros >= 100000) return 100000;
  if (valeurNeufEuros >= 55000) return 55000;
  return 0;
}

/**
 * Éligibilité : bornes d'âge et de kilométrage INCLUSES (décision GP 2026-10 : 120 000 km
 * pile reste 5 Étoiles) ; valeur à neuf comparée à la valeur RÉELLE.
 */
export function estEligible(e: Eligibilite, f: FaitsVehicule): boolean {
  if (f.ageAnnees > e.ageMaxAns) return false;
  if (e.kmMax != null && f.kilometrage > e.kmMax) return false;
  if (e.valeurMin != null && f.valeurNeufEuros < e.valeurMin) return false;
  if (e.valeurMax != null && f.valeurNeufEuros > e.valeurMax) return false;
  if (!e.energies.includes(energieBucket(f.energie))) return false;
  return true;
}

/** Variante de tarif. Le tarif jeune n'existe que pour la 5 Étoiles. */
export function choisirVariante(gamme: Gamme, niveau: Niveau, f: FaitsVehicule): Variante {
  // Éco : pas de tarif jeune (le barème n'en a pas) — le palier < 6 ans et < 70 000 km
  // EST le tarif principal, « B » au-delà.
  if (gamme === 'eco') return f.ageAnnees > 6 || f.kilometrage > 70000 ? 'B' : '';
  const jeune = niveau === 5 && f.ageAnnees <= 4 && f.kilometrage <= 70000;
  if (gamme === 'luxe' && paliersValeur(f.valeurNeufEuros) >= LUXE_PREMIUM_SEUIL) return jeune ? 'PJ' : 'P';
  return jeune ? 'J' : '';
}

/** Pondération ×1,5 : Classique et Éco seulement, jamais la Luxe. */
export function ponderationApplicable(gamme: Gamme, f: FaitsVehicule): boolean {
  if (gamme !== 'classique' && gamme !== 'eco') return false;
  const parLaValeur = f.valeurNeufEuros >= PONDERATION_VALEUR_MIN && f.valeurNeufEuros <= CLASSIQUE_VALEUR_MAX;
  return Boolean(f.is4x4 || f.isPlus14cv || f.isPlus2t3 || parLaValeur);
}

export function segmentDe(gamme: Gamme, valeurNeufEuros: number): Segment {
  if (gamme === 'luxe') return valeurNeufEuros >= LUXE_PREMIUM_SEUIL ? 'luxe_gt150' : 'luxe_lt150';
  return gamme;
}

/** Bornes affichées sur la carte : celles du catalogue (l'Éco n'a pas de limite de km). */
function bornesAffichees(g: GarantieCatalogue, variante: Variante): { ageMaxAns: number; kmMax: number | null } {
  if (g.gamme === 'eco' && variante === '') return { ageMaxAns: 6, kmMax: 70000 };
  return { ageMaxAns: g.eligibilite.ageMaxAns, kmMax: g.eligibilite.kmMax };
}

/** Toutes les garanties éligibles au véhicule, prix TTC par durée, la plus étoilée en premier. */
export function calculerOffres(f: FaitsVehicule): GarantieProposee[] {
  const offres: GarantieProposee[] = [];
  for (const g of CATALOGUE_GVO) {
    if (!estEligible(g.eligibilite, f)) continue;
    const variante = choisirVariante(g.gamme, g.niveau, f);
    const base = prixBareme(g.gamme, g.niveau, variante);
    if (!base) continue;
    const pondere = ponderationApplicable(g.gamme, f);
    const coef = pondere ? PONDERATION_COEF : 1;
    const prixCents = {
      '6': Math.round(base['6'] * coef),
      '12': Math.round(base['12'] * coef),
      '24': Math.round(base['24'] * coef),
    };
    const plafond = plafondGvo(g.gamme, g.niveau, pondere);
    offres.push({
      code: variante ? `${g.code}-${variante}` : g.code,
      gamme: g.gamme,
      niveau: g.niveau,
      segment: segmentDe(g.gamme, f.valeurNeufEuros),
      variante,
      nomCommercial: g.label,
      ...bornesAffichees(g, variante),
      plafondIntervention: plafond.plafondIntervention,
      ...(plafond.mode === 'bareme' ? { plafondParDuree: plafond.plafondParDuree } : {}),
      nombrePiecesCouvertes: piecesPour(g.gamme, g.niveau),
      organes: organesPour(g.gamme, g.niveau),
      prixCents,
      pondereApplique: pondere,
      tarifJeune: variante === 'J' || variante === 'PJ',
      document: { label: CARNET_2026.label, href: CARNET_2026.href },
    });
  }
  // Étoiles décroissantes ; à niveau égal (jamais le cas au catalogue GVO), le prix 12 mois.
  return offres.sort((a, b) => b.niveau - a.niveau || b.prixCents['12'] - a.prixCents['12']);
}

/** Motif d'inéligibilité lisible, quand aucune offre ne sort. */
export function motifIneligibilite(f: FaitsVehicule): string {
  const eco = energieBucket(f.energie) !== 'autre';
  if (eco) {
    return f.ageAnnees > 10
      ? "Les véhicules électriques et hybrides rechargeables sont garantis jusqu'à 10 ans."
      : 'Véhicule non éligible à la gamme Éco.';
  }
  if (f.ageAnnees > 20) return 'Le véhicule a plus de 20 ans : hors des bornes de la garantie (20 ans et 200 000 km au plus).';
  if (f.kilometrage > 200000) return 'Le véhicule dépasse 200 000 km : hors des bornes de la garantie (20 ans et 200 000 km au plus).';
  return 'Véhicule hors des bornes de la garantie (20 ans et 200 000 km au plus).';
}

// ---------------------------------------------------------------------------------------
// Faits véhicule depuis la saisie du parcours (âge calculé à la date du jour : la garantie
// d'un devis prend effet à sa souscription).

import { ageAnnees } from '@/lib/format';
import type { VehiculeInput } from '@/types';

export function faitsDepuisVehicule(v: VehiculeInput, reference = new Date()): FaitsVehicule {
  return {
    ageAnnees: ageAnnees(v.dateMiseEnCirculation, reference),
    kilometrage: Number(v.kilometrage) || 0,
    valeurNeufEuros: Number(v.valeurNeufEuros) || 0,
    energie: v.energie,
    is4x4: !!v.is4x4,
    isPlus14cv: !!v.isPlus14cv,
    isPlus2t3: !!v.isPlus2t3,
  };
}
