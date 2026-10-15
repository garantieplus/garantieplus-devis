// Formatage de la plaque à la frappe — copie de src/components/souscription/plaque.ts de
// l'app garantieplus : majuscules d'office et, pour le format SIV (AA-123-BB), les tirets
// se placent tout seuls. Les anciens formats (FNI : « 1234 AB 56 ») passent en majuscules.

/** Plaque SIV complète (AA-123-BB) : la recherche peut partir sans attendre le bouton. */
export const PLAQUE_SIV_COMPLETE = /^[A-Z]{2}-[0-9]{3}-[A-Z]{2}$/;

export function formaterPlaque(brut: string): string {
  const compact = brut.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const siv = compact.match(/^([A-Z]{2})([0-9]{1,3})([A-Z]{0,2})$/);
  if (siv) return `${siv[1]}-${siv[2]}${siv[3] ? `-${siv[3]}` : ''}`;
  if (/^[A-Z]{0,2}$/.test(compact)) return compact;
  return brut
    .toUpperCase()
    .replace(/[^A-Z0-9 -]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 12);
}

/** Normalisation serveur : majuscules, sans espace ni tiret (clé de cache et d'appel). */
export function normaliserPlaque(brut: string): string {
  return brut.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}
