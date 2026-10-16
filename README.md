# devis.garantieplus.fr

Devis de Garantie Véhicule d'Occasion (garantie panne mécanique) pour les garages **non
partenaires** : un commercial au téléphone, ou le garage lui-même, saisit la plaque et le
kilométrage, vérifie la fiche du véhicule, voit les garanties et les tarifs, puis reçoit le
devis par e-mail — avec l'invitation à devenir partenaire.

Le parcours reprend celui de « Créer une garantie » dans l'espace garage de l'app
`garantieplus` jusqu'à la formule ; ensuite, au lieu du bénéficiaire et du paiement, le devis
part par e-mail.

## Parcours

1. **Véhicule** — plaque + kilométrage ; la recherche (SIV apiplaque + véhiculier SRA de la
   base du site) pré-remplit marque, modèle, version(s), date de 1ère mise en circulation,
   énergie, **prix à neuf**, puissance fiscale et 4x4. Sans plaque ou plaque inconnue : saisie
   manuelle.
2. **Garanties & tarifs** — toutes les garanties éligibles (2 à 5 étoiles, Classique / Éco /
   Luxe), la plus étoilée en premier, prix TTC 6 / 12 / 24 mois, plafond, pièces et organes
   couverts : les mêmes cartes qu'au comptoir du garage.
3. **Coordonnées** — nom, garage, e-mail, téléphone, consentement RGPD.
4. **Devis envoyé** — e-mail au garage (devis PDF, **Carnet de garantie 2026**, plaquette) et
   e-mail interne ; CTA « Devenir partenaire » pré-rempli vers `/inscription`.

## Règles métier (copie de l'app garantieplus)

| Fichier | Source dans `garantieplus` |
|---|---|
| `lib/gvo/bareme-covea.ts` | `src/modules/catalog/bareme-gvo-covea.ts` (prix TTC du barème Covéa, contrat n° 8.700.048) |
| `lib/gvo/offres.ts` | `src/modules/garanties/offre-garage.ts` (éligibilité, variantes J/B/P/PJ, pondération ×1,5 — ici sur le 4x4 et la valeur à neuf seulement, décision GP 2026-10-15) |
| `lib/gvo/plafond.ts` | `src/modules/garanties/plafond.ts` |
| `lib/gvo/organes.ts` | `src/components/garanties/gammes-data.ts` |
| `lib/gvo/documents.ts` | `src/modules/garanties/carnet.ts` (carnet 2026 v2, unique pour toutes les formules) |
| `lib/vehicule/plaque.ts` | `src/components/souscription/plaque.ts` |

Quand le barème ou les règles changent dans l'app, les reporter ici. Tests : `npx tsx scripts/test-offres.ts`.

Aucun document ni mention d'un ancien assureur : le seul document remis est
`public/documents/Carnet-de-Garantie-2026.pdf`.

## Démarrage

```bash
npm install
cp .env.example .env.local      # renseigner Supabase, Brevo, le token apiplaque
npm run dev                     # http://localhost:3000
```

Base Supabase : `supabase-schema.sql` (base neuve) ou `supabase-migration-2026-10-gvo-covea.sql`
(base existante : colonnes véhicule, cache plaque, rate limiting). Le bucket privé
`inscriptions-documents` et les tables `inscriptions` / `security_logs` restent ceux de
`app/api/inscription/route.ts`.

### Véhiculier SRA

La table `vehiculier` (136 720 versions : marque, modèle, version, type mine, énergie,
transmission, **prix à neuf**, puissance fiscale, PTAC…) est une copie du référentiel SRA.
`supabase-migration-2026-10-vehiculier.sql` crée la table ; les données ont été chargées une
fois (octobre 2026) depuis l'ancienne base. La recherche par plaque s'en sert pour la valeur
à neuf (par `sra_identifiant` rendu par le SIV), le 4x4 (transmission 4P/4D) et la liste des
versions possibles (par type mine, sinon marque + modèle) quand le SIV ne tranche pas.
Lecture serveur uniquement (clé service) ; aucune policy publique.

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` / `npm run build` | Next.js dev / build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | TypeScript |
| `npx tsx scripts/test-offres.ts` | Tests du calcul d'offres |
| `/demo` | Scénarios de démonstration (dev) ; `/api/test-pdf` : PDF d'exemple (hors production) |
