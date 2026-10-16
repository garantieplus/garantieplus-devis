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

-- Versions distinctes d'un modèle (regroupement côté base : un modèle courant compte des
-- centaines de lignes). Appelée par le serveur uniquement (clé service).
create or replace function public.vehiculier_versions(p_marque text, p_modele text)
returns table (version text, sra text, prix integer)
language sql stable security invoker set search_path = public as $$
  select v.version,
         (array_agg(v.sra_identifiant order by v.annee_commercialisation desc nulls last))[1] as sra,
         max(coalesce(v.prix_origine, v.dernier_prix_connu)) as prix
  from public.vehiculier v
  where v.marque ilike p_marque and v.modele ilike p_modele and v.version is not null
  group by v.version
  order by v.version
  limit 400
$$;
revoke execute on function public.vehiculier_versions(text, text) from public, anon, authenticated;
grant execute on function public.vehiculier_versions(text, text) to service_role;
