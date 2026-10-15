// Tests du calcul d'offres (barème Covéa, variantes, pondération, plafonds).
// Lancer : npx tsx scripts/test-offres.ts
import assert from 'node:assert/strict';
import { calculerOffres, type FaitsVehicule } from '../lib/gvo/offres';

const base: FaitsVehicule = {
  ageAnnees: 3, kilometrage: 50000, valeurNeufEuros: 30000, energie: 'essence',
  is4x4: false,
};
const codes = (o: ReturnType<typeof calculerOffres>) => o.map(g => g.code);

// Classique récente : 5★ au tarif jeune, puis 4, 3, 2 — la plus étoilée en premier.
let o = calculerOffres(base);
assert.deepEqual(codes(o), ['GVO-CLA-5-J', 'GVO-CLA-4', 'GVO-CLA-3', 'GVO-CLA-2']);
assert.equal(o.find(g => g.niveau === 5)!.prixCents['12'], 31900);
assert.equal(o.find(g => g.niveau === 5)!.plafondIntervention, 'VRADE');
assert.equal(o.find(g => g.niveau === 4)!.prixCents['6'], 29900);
const sansEspaces = (r: Record<string, string>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.replace(/\s/g, '')]));
assert.deepEqual(sansEspaces(o.find(g => g.niveau === 3)!.plafondParDuree!), { '6': '1500€', '12': '2500€', '24': '3000€' });
assert.equal(o.find(g => g.niveau === 2)!.prixCents['24'], 33000);
assert.equal(o.find(g => g.niveau === 2)!.nombrePiecesCouvertes, '+ de 40 pièces');

// 5 ans / 100 000 km : pas de tarif jeune.
o = calculerOffres({ ...base, ageAnnees: 5, kilometrage: 100000 });
assert.equal(o.find(g => g.niveau === 5)!.code, 'GVO-CLA-5');
assert.equal(o.find(g => g.niveau === 5)!.prixCents['12'], 39900);

// Bornes INCLUSES : 6 ans et 120 000 km pile restent 5 Étoiles.
o = calculerOffres({ ...base, ageAnnees: 6, kilometrage: 120000 });
assert.ok(o.some(g => g.niveau === 5));

// 4x4 : pondération ×1,5 sur la Classique, plafond 5★ ramené à 10 000 €.
o = calculerOffres({ ...base, is4x4: true, ageAnnees: 7, kilometrage: 100000 });
assert.deepEqual(codes(o), ['GVO-CLA-4', 'GVO-CLA-3', 'GVO-CLA-2']);
assert.ok(o.every(g => g.pondereApplique));
assert.equal(o[0].prixCents['12'], Math.round(38900 * 1.5));
// Luxe récente : 5★ jeune en tête malgré un prix inférieur à la 4★.
assert.deepEqual(codes(calculerOffres({ ...base, valeurNeufEuros: 120000 })), ['GVO-LUX-5-J', 'GVO-LUX-4', 'GVO-LUX-3', 'GVO-LUX-2']);
o = calculerOffres({ ...base, is4x4: true });
assert.equal(o.find(g => g.niveau === 5)!.plafondIntervention.replace(/\s/g, ''), '10000€');

// Puissance fiscale et PTAC : plus de pondération (décision GP 2026-10-15) — rien à passer.
assert.ok(calculerOffres({ ...base, ageAnnees: 7, kilometrage: 100000 }).every(g => !g.pondereApplique));

// Valeur 55 000 à 100 000 € inclus : pondérée ; 100 001 € : Luxe, jamais pondérée.
assert.ok(calculerOffres({ ...base, valeurNeufEuros: 100000 }).every(g => g.pondereApplique && g.gamme === 'classique'));
o = calculerOffres({ ...base, valeurNeufEuros: 100001 });
assert.ok(o.every(g => g.gamme === 'luxe' && !g.pondereApplique && g.segment === 'luxe_lt150'));
assert.equal(o.find(g => g.niveau === 5)!.code, 'GVO-LUX-5-J');
assert.equal(o.find(g => g.niveau === 5)!.prixCents['12'], 72000);
assert.equal(o.find(g => g.niveau === 2)!.plafondIntervention.replace(/\s/g, ''), '3000€');

// Luxe > 150 K€ : variante P / PJ.
o = calculerOffres({ ...base, valeurNeufEuros: 160000, ageAnnees: 8, kilometrage: 90000 });
assert.deepEqual(codes(o), ['GVO-LUX-4-P', 'GVO-LUX-3-P', 'GVO-LUX-2-P']);
assert.equal(o[0].prixCents['12'], 109000);
o = calculerOffres({ ...base, valeurNeufEuros: 160000 });
assert.equal(o.find(g => g.niveau === 5)!.code, 'GVO-LUX-5-PJ');
assert.equal(o.find(g => g.niveau === 5)!.prixCents['6'], 80000);

// Éco : palier principal (< 6 ans et < 70 000 km) puis « B » sans limite de km.
o = calculerOffres({ ...base, energie: 'electrique', valeurNeufEuros: 40000, ageAnnees: 4, kilometrage: 50000 });
assert.deepEqual(codes(o), ['GVO-ECO-5']);
assert.equal(o[0].prixCents['12'], 39000);
assert.equal(o[0].kmMax, 70000);
o = calculerOffres({ ...base, energie: 'hybride_rechargeable', valeurNeufEuros: 40000, ageAnnees: 8, kilometrage: 130000 });
assert.deepEqual(codes(o), ['GVO-ECO-5-B']);
assert.equal(o[0].prixCents['12'], 49000);
assert.equal(o[0].kmMax, null);
assert.equal(o[0].plafondIntervention.replace(/\s/g, ''), '10000€');
assert.equal(calculerOffres({ ...base, energie: 'electrique', ageAnnees: 11 }).length, 0);
// Hybride non rechargeable : gamme Classique.
assert.ok(calculerOffres({ ...base, energie: 'hybride_non_rechargeable' }).every(g => g.gamme === 'classique'));

// Hors bornes.
assert.equal(calculerOffres({ ...base, ageAnnees: 18, kilometrage: 250000 }).length, 0);
assert.equal(calculerOffres({ ...base, ageAnnees: 21 }).length, 0);
assert.deepEqual(codes(calculerOffres({ ...base, ageAnnees: 18, kilometrage: 150000 })), ['GVO-CLA-2']);

console.log('✅ test-offres : tous les cas passent.');
