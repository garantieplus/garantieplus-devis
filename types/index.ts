// Types partagés du site devis.garantieplus.fr — alignés sur le tunnel « Créer une
// garantie » de l'espace garage (app garantieplus) : mêmes faits véhicule, mêmes
// garanties (gamme × niveau d'étoiles), mêmes prix TTC en CENTIMES.

export type Energie =
  | 'essence'
  | 'diesel'
  | 'essence_diesel'
  | 'hybride_non_rechargeable'
  | 'hybride_rechargeable'
  | 'electrique';

export type Gamme = 'classique' | 'eco' | 'luxe';
export type Niveau = 2 | 3 | 4 | 5;
export type Duree = '6' | '12' | '24';
/** Segment tarifaire : la Luxe se tarife différemment au-delà de 150 000 € à neuf. */
export type Segment = 'classique' | 'eco' | 'luxe_lt150' | 'luxe_gt150';
/** Variante de tarif du barème Covéa : jeune (J), Éco palier 2 (B), Luxe > 150 K€ (P / PJ). */
export type Variante = '' | 'J' | 'B' | 'P' | 'PJ';

export const ENERGIES: { value: Energie; label: string }[] = [
  { value: 'essence', label: 'Essence' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'hybride_non_rechargeable', label: 'Hybride non rechargeable' },
  { value: 'hybride_rechargeable', label: 'Hybride rechargeable' },
  { value: 'electrique', label: 'Électrique' },
];

export const libelleEnergie = (e: string | null | undefined): string =>
  ENERGIES.find(x => x.value === e)?.label ?? (e === 'essence_diesel' ? 'Essence / Diesel' : '—');

/** Véhicule tel que saisi (ou retrouvé par la plaque, puis vérifié) dans le parcours. */
export interface VehiculeInput {
  plaque: string;
  vin: string;
  marque: string;
  modele: string;
  version: string;
  typeMine: string;
  /** Première mise en circulation, AAAA-MM-JJ. */
  dateMiseEnCirculation: string;
  kilometrage: number;
  energie: Energie;
  /** Prix à neuf en euros (véhiculier SRA via la plaque, ou saisi). */
  valeurNeufEuros: number;
  puissanceFiscale: number | null;
  /** Seul critère de pondération hors valeur à neuf (décision GP 2026-10-15 : la puissance
   *  fiscale et le PTAC ne comptent plus pour Covéa). */
  is4x4: boolean;
  sourceVehicule: 'plaque' | 'manuel';
}

export const VEHICULE_VIDE: VehiculeInput = {
  plaque: '',
  vin: '',
  marque: '',
  modele: '',
  version: '',
  typeMine: '',
  dateMiseEnCirculation: '',
  kilometrage: 0,
  energie: 'essence',
  valeurNeufEuros: 0,
  puissanceFiscale: null,
  is4x4: false,
  sourceVehicule: 'manuel',
};

export interface GarantieProposee {
  /** Code catalogue de la garantie (ex. GVO-CLA-5), variante comprise (GVO-CLA-5-J). */
  code: string;
  gamme: Gamme;
  niveau: Niveau;
  segment: Segment;
  variante: Variante;
  nomCommercial: string;
  /** Bornes d'éligibilité affichées ; kmMax null : sans limite de kilométrage (Éco). */
  ageMaxAns: number;
  kmMax: number | null;
  /** « VRADE », « 10 000 € » ou « Variable selon durée » (3 Étoiles Classique). */
  plafondIntervention: string;
  plafondParDuree?: Record<Duree, string>;
  nombrePiecesCouvertes: string;
  organes: string[];
  /** Prix TTC (taxe d'assurance 9 % incluse) par durée, en centimes, pondération comprise. */
  prixCents: Record<Duree, number>;
  pondereApplique: boolean;
  tarifJeune: boolean;
  /** Document remis au client : le carnet de garantie 2026. */
  document: { label: string; href: string };
}

/** Données du parcours (client). */
export interface DevisFormData {
  vehicule: VehiculeInput;
  nomContact: string;
  nomGarage: string;
  email: string;
  telephone: string;
}

export type StatutDevis = 'nouveau' | 'a_rappeler' | 'rappele' | 'converti' | 'perdu' | 'archive';

/** Ligne de la table `devis` (Supabase). Les colonnes historiques sont conservées. */
export interface Devis {
  id: string;
  created_at: string;
  updated_at: string;
  marque: string;
  modele: string;
  version: string | null;
  plaque: string | null;
  vin: string | null;
  type_mine: string | null;
  date_mise_en_circulation: string;
  kilometrage: number;
  energie: Energie | null;
  valeur_neuf_euros: number | null;
  puissance_fiscale: number | null;
  source_vehicule: 'plaque' | 'manuel' | null;
  is_4x4: boolean;
  is_plus_2t3: boolean;
  is_plus_14cv: boolean;
  is_hybride_electrique: boolean;
  valeur_neuf_55k: boolean;
  valeur_neuf_100k: boolean;
  valeur_neuf_150k: boolean;
  nom_contact: string;
  nom_garage: string;
  email: string;
  telephone: string;
  garanties_proposees: GarantieProposee[];
  statut: StatutDevis;
  notes_commerciales: string | null;
  commercial_assigne: string | null;
  ip_address: string | null;
  user_agent: string | null;
}
