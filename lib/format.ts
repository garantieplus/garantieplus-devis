// Helpers de présentation partagés (client, serveur, e-mails, PDF).

const FORMAT_EUROS = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Centimes -> « 1 234,50 € ». JAMAIS d'arrondi à l'euro (décision GP). */
export const formatEuros = (cents: number): string => FORMAT_EUROS.format(cents / 100);

export const formatKm = (km: number): string => `${km.toLocaleString('fr-FR')} km`;

/** « 2021-06-01 » -> « 01/06/2021 ». */
export const formatDateFr = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

/** Âge en années (décimal) entre la première mise en circulation et aujourd'hui. */
export function ageAnnees(dateMiseEnCirculation: string, reference = new Date()): number {
  const mec = new Date(dateMiseEnCirculation);
  if (Number.isNaN(mec.getTime())) return 0;
  return Math.max(0, (reference.getTime() - mec.getTime()) / (365.25 * 24 * 3600 * 1000));
}

const ENTITES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Texte -> HTML sûr (données saisies par un tiers, interpolées dans un e-mail). */
export function echapperHtml(valeur: unknown): string {
  if (valeur == null) return '';
  return String(valeur).replace(/[&<>"']/g, c => ENTITES[c]);
}
