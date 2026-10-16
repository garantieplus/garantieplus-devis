-- Référentiel véhicules SRA (136 720 versions) — copie locale pour la recherche par plaque :
-- valeur à neuf (prix_origine, à défaut dernier_prix_connu), 4x4 (transmission 4P/4D),
-- puissance fiscale, et versions possibles par type mine ou marque + modèle.
-- Appliquée sur le projet Supabase « garantieplus-devis » le 2026-10-16 (données chargées
-- une fois depuis l'ancienne base). Lecture serveur uniquement : aucune policy publique.

create table if not exists public.vehiculier (
  sra_identifiant text primary key,
  marque text not null,
  modele text not null,
  version text,
  energie text,
  code_energie text,
  type_mines text,
  numero_cnit text,
  carrosserie text,
  code_carrosserie text,
  code_segment text,
  transmission text,
  code_marque text,
  code_modele text,
  dernier_prix_connu integer,
  prix_origine integer,
  puissance_administrative integer,
  puissance_reelle_din integer,
  ptac_kg integer,
  poids_a_sec integer,
  cylindree_cm integer,
  emission_co2 integer,
  nombre_places integer,
  annee_commercialisation integer,
  annee_fin_commercialisation integer
);
create index if not exists vehiculier_type_mines_idx on public.vehiculier (type_mines);
create index if not exists vehiculier_marque_modele_idx on public.vehiculier (marque, modele);
alter table public.vehiculier enable row level security;
