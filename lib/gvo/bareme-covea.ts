// Barème GVO Covéa — « Proposition d'assurance Garantie Plus GVO » (Covéa Affinity /
// MMA IARD, version définitive du 07/04/2026, §I.5 « Les tarifs »). Copie des PRIX DE
// VENTE TTC de src/modules/catalog/bareme-gvo-covea.ts de l'app garantieplus (la source
// de vérité du produit) : seuls les TTC sont repris ici, la décomposition (prime, frais,
// commission) ne regarde pas un garage qui demande un devis.
//
// Paliers du PDF et variantes du catalogue :
//   5 étoiles  < 6 ans  et < 120 000 km  -> variante principale
//   5 étoiles  < 4 ans  et < 70 000 km   -> « J » : tarif jeune (« tarif différencié », §V.2)
//   4 étoiles  < 10 ans et < 150 000 km
//   3 étoiles  < 15 ans et < 200 000 km
//   2 étoiles  < 20 ans et < 200 000 km
//   Éco 5 étoiles : < 6 ans et < 70 000 km -> principale ; < 10 ans -> « B »
//   Luxe > 150 K€ -> « P », et « PJ » pour le tarif jeune de la 5 étoiles Luxe > 150 K€.
// Le tarif jeune n'existe QUE pour la 5 étoiles : la 4 étoiles n'a qu'un tarif.

import type { Duree, Gamme, Niveau, Variante } from '@/types';

export type SegmentCovea = 'Classique' | 'Eco < 6 ans' | 'Eco < 10 ans' | 'Luxe < 150 K€' | 'Luxe > 150 K€';

interface LigneTtc {
  duree: 6 | 12 | 24;
  segment: SegmentCovea;
  eligibilite: string;
  ttcCents: number;
}

const L = (duree: 6 | 12 | 24, segment: SegmentCovea, eligibilite: string, ttcCents: number): LigneTtc => ({
  duree, segment, eligibilite, ttcCents,
});

/** Les 51 lignes du PDF (3 durées × 17 paliers), prix TTC au centime. */
export const BAREME_TTC: LigneTtc[] = [
  L(6, 'Classique', '< 6 ans < 120 000 kms', 30900),
  L(6, 'Classique', '< 4 ans < 70 000 kms', 24900),
  L(6, 'Classique', '< 10 ans < 150 000 kms', 29900),
  L(6, 'Classique', '< 15 ans < 200 000 kms', 24900),
  L(6, 'Classique', '< 20 ans < 200 000 kms', 12000),
  L(6, 'Eco < 6 ans', '< 6 ans < 70 000 kms', 29000),
  L(6, 'Eco < 10 ans', '< 10 ans < 120 000 kms', 39000),
  L(6, 'Luxe < 150 K€', '< 6 ans < 120 000 kms', 69000),
  L(6, 'Luxe < 150 K€', '< 4 ans < 70 000 kms', 56000),
  L(6, 'Luxe < 150 K€', '< 10 ans < 150 000 kms', 59000),
  L(6, 'Luxe < 150 K€', '< 15 ans < 200 000 kms', 49000),
  L(6, 'Luxe < 150 K€', '< 20 ans < 200 000 kms', 21000),
  L(6, 'Luxe > 150 K€', '< 6 ans < 120 000 kms', 99000),
  L(6, 'Luxe > 150 K€', '< 4 ans < 70 000 kms', 80000),
  L(6, 'Luxe > 150 K€', '< 10 ans < 150 000 kms', 89000),
  L(6, 'Luxe > 150 K€', '< 15 ans < 200 000 kms', 69000),
  L(6, 'Luxe > 150 K€', '< 20 ans < 200 000 kms', 29000),
  L(12, 'Classique', '< 6 ans < 120 000 kms', 39900),
  L(12, 'Classique', '< 4 ans < 70 000 kms', 31900),
  L(12, 'Classique', '< 10 ans < 150 000 kms', 38900),
  L(12, 'Classique', '< 15 ans < 200 000 kms', 33900),
  L(12, 'Classique', '< 20 ans < 200 000 kms', 18000),
  L(12, 'Eco < 6 ans', '< 6 ans < 70 000 kms', 39000),
  L(12, 'Eco < 10 ans', '< 10 ans < 120 000 kms', 49000),
  L(12, 'Luxe < 150 K€', '< 6 ans < 120 000 kms', 89000),
  L(12, 'Luxe < 150 K€', '< 4 ans < 70 000 kms', 72000),
  L(12, 'Luxe < 150 K€', '< 10 ans < 150 000 kms', 79000),
  L(12, 'Luxe < 150 K€', '< 15 ans < 200 000 kms', 69000),
  L(12, 'Luxe < 150 K€', '< 20 ans < 200 000 kms', 30000),
  L(12, 'Luxe > 150 K€', '< 6 ans < 120 000 kms', 119000),
  L(12, 'Luxe > 150 K€', '< 4 ans < 70 000 kms', 96000),
  L(12, 'Luxe > 150 K€', '< 10 ans < 150 000 kms', 109000),
  L(12, 'Luxe > 150 K€', '< 15 ans < 200 000 kms', 99000),
  L(12, 'Luxe > 150 K€', '< 20 ans < 200 000 kms', 43000),
  L(24, 'Classique', '< 6 ans < 120 000 kms', 69900),
  L(24, 'Classique', '< 4 ans < 70 000 kms', 55900),
  L(24, 'Classique', '< 10 ans < 150 000 kms', 68900),
  L(24, 'Classique', '< 15 ans < 200 000 kms', 63900),
  L(24, 'Classique', '< 20 ans < 200 000 kms', 33000),
  L(24, 'Eco < 6 ans', '< 6 ans < 70 000 kms', 69000),
  L(24, 'Eco < 10 ans', '< 10 ans < 120 000 kms', 89000),
  L(24, 'Luxe < 150 K€', '< 6 ans < 120 000 kms', 159000),
  L(24, 'Luxe < 150 K€', '< 4 ans < 70 000 kms', 128000),
  L(24, 'Luxe < 150 K€', '< 10 ans < 150 000 kms', 149000),
  L(24, 'Luxe < 150 K€', '< 15 ans < 200 000 kms', 129000),
  L(24, 'Luxe < 150 K€', '< 20 ans < 200 000 kms', 57000),
  L(24, 'Luxe > 150 K€', '< 6 ans < 120 000 kms', 219000),
  L(24, 'Luxe > 150 K€', '< 4 ans < 70 000 kms', 176000),
  L(24, 'Luxe > 150 K€', '< 10 ans < 150 000 kms', 209000),
  L(24, 'Luxe > 150 K€', '< 15 ans < 200 000 kms', 179000),
  L(24, 'Luxe > 150 K€', '< 20 ans < 200 000 kms', 78000),
];

/** Colonne « Eligibilité » du PDF pour un niveau d'étoiles (variante principale). */
const ELIGIBILITE_PAR_NIVEAU: Record<Niveau, string> = {
  5: '< 6 ans < 120 000 kms',
  4: '< 10 ans < 150 000 kms',
  3: '< 15 ans < 200 000 kms',
  2: '< 20 ans < 200 000 kms',
};
const ELIGIBILITE_JEUNE = '< 4 ans < 70 000 kms';

/** Ligne du PDF (segment + éligibilité) d'une garantie du catalogue et de sa variante. */
export function palierCovea(gamme: Gamme, niveau: Niveau, variante: Variante): { segment: SegmentCovea; eligibilite: string } {
  if (gamme === 'eco') {
    return variante === 'B'
      ? { segment: 'Eco < 10 ans', eligibilite: '< 10 ans < 120 000 kms' }
      : { segment: 'Eco < 6 ans', eligibilite: '< 6 ans < 70 000 kms' };
  }
  const jeune = variante === 'J' || variante === 'PJ';
  const eligibilite = jeune ? ELIGIBILITE_JEUNE : ELIGIBILITE_PAR_NIVEAU[niveau];
  if (gamme === 'luxe') {
    const premium = variante === 'P' || variante === 'PJ';
    return { segment: premium ? 'Luxe > 150 K€' : 'Luxe < 150 K€', eligibilite };
  }
  return { segment: 'Classique', eligibilite };
}

/**
 * Prix TTC (centimes) des trois durées d'une garantie × variante, hors pondération.
 * Null si une durée manque au barème (jamais pour les 17 paliers du PDF).
 */
export function prixBareme(gamme: Gamme, niveau: Niveau, variante: Variante): Record<Duree, number> | null {
  const { segment, eligibilite } = palierCovea(gamme, niveau, variante);
  const prix: Partial<Record<Duree, number>> = {};
  for (const l of BAREME_TTC) {
    if (l.segment === segment && l.eligibilite === eligibilite) prix[String(l.duree) as Duree] = l.ttcCents;
  }
  if (prix['6'] == null || prix['12'] == null || prix['24'] == null) return null;
  return prix as Record<Duree, number>;
}
