export interface VehiculeInput {
  dateCirculation: Date;
  kilometrage: number;
  is4x4: boolean;
  isPlus2t3: boolean;
  isPlus14cv: boolean;
  isHybrideElectrique: boolean;
  valeurNeuf55k: boolean;
  valeurNeuf100k: boolean;
  valeurNeuf150k: boolean;
}

export interface GarantieProposee {
  gamme: 'classique' | 'eco' | 'luxe' | 'luxe_premium';
  niveau: 3 | 4 | 5;
  nomCommercial: string;
  etoilesAffichage: string;
  ageMaxAns: number;
  kmMax: number;
  plafondIntervention: string;
  plafondParDuree?: { '6': string; '12': string; '24': string };
  nombrePiecesCouvertes: string;
  prixBase: { '6': number; '12': number; '24': number };
  prixFinal: { '6': number; '12': number; '24': number };
  pondereApplique: boolean;
  avantagesCommuns: string[];
  avantagesSpecifiques: string[];
  fichierCG: string;
}

export interface DevisFormData {
  // Étape 1
  marque: string;
  modele: string;
  dateMiseEnCirculation: { mois: string; annee: string };
  kilometrage: number;
  is4x4: boolean;
  isPlus2t3: boolean;
  isPlus14cv: boolean;
  isHybrideElectrique: boolean;
  valeurNeuf55k: boolean;
  valeurNeuf100k: boolean;
  valeurNeuf150k: boolean;
  // Étape 2
  nomContact: string;
  nomGarage: string;
  email: string;
  telephone: string;
}

export interface Devis {
  id: string;
  created_at: string;
  updated_at: string;
  marque: string;
  modele: string;
  date_mise_en_circulation: string;
  kilometrage: number;
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
  statut: 'nouveau' | 'a_rappeler' | 'rappele' | 'converti' | 'perdu';
  notes_commerciales: string | null;
  commercial_assigne: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export type StatutDevis = 'nouveau' | 'a_rappeler' | 'rappele' | 'converti' | 'perdu';
