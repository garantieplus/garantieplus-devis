// Document remis avec le devis : le « Carnet de Garantie 2026 », unique pour toutes les
// formules depuis les documents Covéa du contrat n° 8.700.048 (décision GP 2026-10-09),
// version corrigée du 2026-10-14 (v2) — le même fichier que l'app garantieplus
// (src/modules/garanties/carnet.ts). Aucun autre document : les anciennes CG par gamme
// et niveau n'ont plus cours.

export const CARNET_2026 = {
  label: 'Carnet de garantie 2026 (PDF)',
  /** Servi depuis public/ ; le nom est celui remis au client. */
  href: '/documents/Carnet-de-Garantie-2026.pdf',
  fichier: 'Carnet-de-Garantie-2026.pdf',
};

/** Documents téléchargeables depuis un lien tracé (/api/track-doc) : liste fermée. */
export const DOCUMENTS_AUTORISES: Record<string, string> = {
  carnet: CARNET_2026.href,
  plaquette: '/plaquette.pdf',
};
