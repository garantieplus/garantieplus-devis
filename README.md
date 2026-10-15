# devis.garantieplus.fr

Devis de Garantie Véhicule d'Occasion (garantie panne mécanique) pour les garages **non
partenaires** : un commercial au téléphone, ou le garage lui-même, saisit la plaque et le
kilométrage, vérifie la fiche du véhicule, voit les garanties et les tarifs, puis reçoit le
devis par e-mail — avec l'invitation à devenir partenaire.

Le parcours reprend celui de « Créer une garantie » dans l'espace garage de l'app
`garantieplus` jusqu'à la formule ; ensuite, au lieu du bénéficiaire et du paiement, le devis
part par e-mail.

## Parcours

1. **Véhicule** — plaque + kilométrage ; la recherche (SIV + véhiculier SRA via l'app
   garantieplus) pré-remplit marque, modèle, version(s), date de 1ère mise en circulation,
   énergie, **prix à neuf**, puissance fiscale et flags de pondération. Sans plaque ou plaque
   inconnue : saisie manuelle.
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
| `lib/gvo/offres.ts` | `src/modules/garanties/offre-garage.ts` (éligibilité, variantes J/B/P/PJ, pondération ×1,5) |
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
cp .env.example .env.local      # renseigner Supabase, Brevo, l'API garantieplus
npm run dev                     # http://localhost:3000
```

Base Supabase : `supabase-schema.sql` (base neuve) ou `supabase-migration-2026-10-gvo-covea.sql`
(base existante : colonnes véhicule, cache plaque, rate limiting). Le bucket privé
`inscriptions-documents` et les tables `inscriptions` / `security_logs` restent ceux de
`app/api/inscription/route.ts`.

Côté app garantieplus : poser `SITE_DEVIS_API_KEY` (la même valeur que `GARANTIEPLUS_API_KEY`
ici) — l'endpoint `/api/partenaires/site-devis/vehicule` est fermé tant qu'elle est vide.

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` / `npm run build` | Next.js dev / build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | TypeScript |
| `npx tsx scripts/test-offres.ts` | Tests du calcul d'offres |
| `/demo` | Scénarios de démonstration (dev) ; `/api/test-pdf` : PDF d'exemple (hors production) |
