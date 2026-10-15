// Plafond d'indemnisation par intervention (GVO) — copie de src/modules/garanties/plafond.ts
// de l'app garantieplus (règle validée 2A-bis), réduite à ce que le devis affiche :
//  - Classique 5★ : VRADE (pas de plafond chiffré) ; pondéré : 10 000 € ;
//  - Classique 4★ : 10 000 € ; 3★ : barème par durée {6 : 1 500, 12 : 2 500, 24 : 3 000} ;
//    2★ : 1 500 € ;
//  - Luxe 5★ : 15 000 € ; 4★ : 10 000 € ; 3★ : 7 500 € ; 2★ : 3 000 € (décision GP 05/10) ;
//  - Éco : 10 000 €.
// Le plafond effectif reste toujours borné par la VRADE (valeur de remplacement à dire
// d'expert) : c'est ce que le carnet de garantie précise.

import type { Duree, Gamme, Niveau } from '@/types';

export type PlafondAffiche =
  | { mode: 'vrade'; plafondIntervention: 'VRADE' }
  | { mode: 'fixe'; plafondIntervention: string; montant: number }
  | { mode: 'bareme'; plafondIntervention: 'Variable selon durée'; plafondParDuree: Record<Duree, string>; bareme: Record<Duree, number> };

const BAREME_CLASSIQUE_3: Record<Duree, number> = { '6': 1500, '12': 2500, '24': 3000 };

const euros = (v: number) => `${v.toLocaleString('fr-FR')} €`;

export function plafondGvo(gamme: Gamme, niveau: Niveau, pondere = false): PlafondAffiche {
  const fixe = (montant: number): PlafondAffiche => ({ mode: 'fixe', plafondIntervention: euros(montant), montant });
  if (gamme === 'eco') return fixe(10000);
  if (gamme === 'luxe') {
    return fixe(niveau === 5 ? 15000 : niveau === 4 ? 10000 : niveau === 3 ? 7500 : 3000);
  }
  switch (niveau) {
    case 5:
      return pondere ? fixe(10000) : { mode: 'vrade', plafondIntervention: 'VRADE' };
    case 4:
      return fixe(10000);
    case 3:
      return {
        mode: 'bareme',
        plafondIntervention: 'Variable selon durée',
        bareme: BAREME_CLASSIQUE_3,
        plafondParDuree: { '6': euros(1500), '12': euros(2500), '24': euros(3000) },
      };
    default:
      return fixe(1500);
  }
}
