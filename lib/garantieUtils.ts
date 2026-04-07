/**
 * Retourne le(s) symbole(s) d'évaluation pour une garantie.
 * ECO → trèfles 🍀, autres gammes → étoiles ★
 */
export const getRatingSymbol = (gamme: string, niveau: number): string =>
  gamme === 'eco' ? '🍀'.repeat(niveau) : '★'.repeat(niveau);

export const getRatingChar = (gamme: string): string =>
  gamme === 'eco' ? '🍀' : '★';
