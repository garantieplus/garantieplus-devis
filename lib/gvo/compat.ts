// Lecture tolérante des garanties enregistrées : les devis d'avant octobre 2026 portent
// l'ancienne forme (prix en euros `prixFinal`, `etoilesAffichage`) ; les nouveaux la forme
// de GarantieProposee (centimes). Le back-office lit les deux.

import type { Duree, GarantieProposee } from '@/types';

interface AncienneGarantie {
  nomCommercial?: string;
  etoilesAffichage?: string;
  plafondIntervention?: string;
  prixFinal?: Partial<Record<Duree, number>>;
  gamme?: string;
  niveau?: number;
}

type GarantieStockee = GarantieProposee | AncienneGarantie;

export function prixCentsDe(g: GarantieStockee, d: Duree): number | null {
  if ('prixCents' in g && g.prixCents) return g.prixCents[d] ?? null;
  const euros = (g as AncienneGarantie).prixFinal?.[d];
  return typeof euros === 'number' ? Math.round(euros * 100) : null;
}

export function nomDe(g: GarantieStockee): string {
  return g.nomCommercial ?? (g as AncienneGarantie).etoilesAffichage ?? '—';
}

export function plafondDe(g: GarantieStockee): string {
  return g.plafondIntervention ?? '—';
}

export function gammeDe(g: GarantieStockee): string {
  return g.gamme ?? 'classique';
}
