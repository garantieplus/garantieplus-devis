// Véhicule retrouvé par la plaque — forme rendue par l'API « site-devis » de l'app
// garantieplus (POST /api/partenaires/site-devis/vehicule), elle-même alignée sur
// VehicleLookupResult de ses adapters, enrichie du véhiculier SRA.

import type { Energie } from '@/types';

export interface VehiculeTrouve {
  brand: string;
  model: string;
  version?: string;
  vin?: string;
  type_mine?: string;
  /** AAAA-MM-JJ. */
  first_registration_date?: string;
  energy?: Energie;
  fiscal_power?: number;
  ptac_kg?: number;
  sra_id?: string;
  /** Valeur à neuf (véhiculier), en euros — absente quand le référentiel ne la connaît pas. */
  value_new_euros?: number;
  is_4x4?: boolean;
  is_over_14cv?: boolean;
  is_2300_3500kg?: boolean;
}

/** Version candidate du véhiculier : sa valeur à neuf est tout l'intérêt du choix. */
export interface VersionCandidate {
  version: string;
  sra: string;
  valueNewEuros: number;
}

export interface VersionSpecs {
  sraIdentifiant: string;
  version: string;
  valueNewEuros: number;
  fiscalPower?: number;
  isOver14cv: boolean;
  is23003500kg: boolean;
  is4x4: boolean;
}

export interface ResultatRecherche {
  vehicule: VehiculeTrouve | null;
  versions: VersionCandidate[];
  /** Vrai quand la recherche a été refusée (trop d'appels) ou n'est pas configurée. */
  indisponible?: boolean;
  /** Pourquoi : aucune source configurée, plafond par IP atteint, ou fournisseur en erreur. */
  motif?: 'non_configuree' | 'quota' | 'fournisseur';
}
