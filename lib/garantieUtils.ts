/**
 * Retourne le(s) symbole(s) d'évaluation pour une garantie.
 * ECO → trèfles 🍀, autres gammes → étoiles ★
 */
export const getSymbol = (gamme: string, niveau: number): string =>
  gamme === 'eco' ? '🍀'.repeat(niveau) : '★'.repeat(niveau);

/** Alias pour compatibilité */
export const getRatingSymbol = getSymbol;

export const getRatingChar = (gamme: string): string =>
  gamme === 'eco' ? '🍀' : '★';
