// Organes couverts et nombre de pièces par formule — copie de
// src/components/garanties/gammes-data.ts de l'app garantieplus : LA liste des cartes du
// site et des tunnels de souscription (décision GP 2026-09 : les mêmes cartes partout).

import type { Gamme, Niveau } from '@/types';

export const ORGANES_120 = [
  'Moteur', 'Turbo', 'Boîte de vitesse automatique', 'Boîte de vitesse manuelle',
  'Boîte de vitesse robotisée', 'Carter', 'Pont', 'Boîte de transfert', 'Transmission',
  'Direction', 'Système de suspension', 'Système de refroidissement', 'Freinage',
  'Alimentation', 'Équipements électriques', 'Équipements électroniques', 'Climatisation',
  'Sécurité', 'Instrumentation de bord', 'Diagnostic & Ingrédients', "Main d'œuvre",
];

/**
 * 2 étoiles (contrat Covéa, formule « Garantie Mécanique 2 étoiles – Étendue ») : liste
 * RESTREINTE. Ingrédients et diagnostic : 50 € (150 € à partir du 3 étoiles).
 */
export const ORGANES_2_ETOILES = [
  'Moteur', 'Boîte de vitesse automatique', 'Boîte de vitesse manuelle', 'Carter', 'Pont',
  'Boîte de transfert', 'Transmission', 'Alternateur et démarreur',
  'Pompe à eau et sonde de température', 'Maître-cylindre de frein',
  "Diagnostic & Ingrédients (jusqu'à 50 €)", "Main d'œuvre",
];

export const ORGANES_300 = [
  'Moteur', 'Turbo', 'Boîte de vitesse automatique', 'Boîte de vitesse manuelle',
  'Boîte de vitesse robotisée', 'Embrayage', 'Carter', 'Pont', 'Boîte de transfert',
  'Transmission', 'Direction', 'Système de suspension', 'Système de refroidissement',
  'Freinage', 'Alimentation', 'Système AdBlue', 'Équipements électriques',
  'Équipements électroniques', 'Climatisation', 'Sécurité', 'Instrumentation de bord',
  'Aide à la conduite', 'Diagnostic & Ingrédients', "Main d'œuvre",
];

export const ORGANES_ECO = [
  'Batterie de Traction',
  ...ORGANES_300, 'Essai routier', 'MAJ', 'Groupe motopropulseur', 'Batterie de servitude',
];

export function organesPour(gamme: Gamme, niveau: Niveau): string[] {
  if (gamme === 'eco') return ORGANES_ECO;
  if (niveau >= 5) return ORGANES_300;
  return niveau <= 2 ? ORGANES_2_ETOILES : ORGANES_120;
}

/** Les 5 étoiles (Classique comme Luxe) et l'Éco sont des garanties « TOUT SAUF ». */
export const TOUT_SAUF = 'TOUT SAUF';
export const PIECES_2_ETOILES = '+ de 40 pièces';

export function piecesPour(gamme: Gamme, niveau: Niveau): string {
  if (gamme === 'eco' || niveau >= 5) return TOUT_SAUF;
  return niveau <= 2 ? PIECES_2_ETOILES : '+ de 120 pièces';
}

/** Les « + » communs à toutes les formules (bandeau du site et des e-mails). */
export const AVANTAGES_PLUS = [
  'Pas de Vétusté',
  'Cessible Gratuitement',
  'Pas de Franchise',
  'Kilométrage Illimité',
  'Pas de Carence',
  'Plafond par Intervention',
  "Pas d'avance de Frais",
  '100% Digital',
  'Couverture Européenne',
];
