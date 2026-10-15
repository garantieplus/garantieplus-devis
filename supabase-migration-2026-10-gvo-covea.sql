-- ============================================================
-- Garantie Plus — devis.garantieplus.fr
-- Migration octobre 2026 : parcours GVO Covéa (plaque, véhicule complet, carnet 2026)
-- À exécuter UNE FOIS dans l'éditeur SQL de Supabase, sur une base déjà créée avec
-- supabase-schema.sql (les anciennes colonnes sont conservées, rien n'est supprimé).
-- ============================================================

-- 1. Véhicule complet (recherche par plaque + véhiculier, ou saisie).
ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS version TEXT,
  ADD COLUMN IF NOT EXISTS plaque TEXT,
  ADD COLUMN IF NOT EXISTS vin TEXT,
  ADD COLUMN IF NOT EXISTS type_mine TEXT,
  ADD COLUMN IF NOT EXISTS energie TEXT,
  ADD COLUMN IF NOT EXISTS valeur_neuf_euros INTEGER,
  ADD COLUMN IF NOT EXISTS puissance_fiscale INTEGER,
  ADD COLUMN IF NOT EXISTS source_vehicule TEXT CHECK (source_vehicule IN ('plaque', 'manuel'));

CREATE INDEX IF NOT EXISTS idx_devis_plaque ON devis(plaque);

-- 2. Plafond des recherches de plaque : la table de rate limiting de l'inscription
--    partenaire gagne un scope ('inscription' par défaut, 'plaque' pour la recherche).
CREATE TABLE IF NOT EXISTS rate_limit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE rate_limit_logs ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'inscription';
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_scope_time ON rate_limit_logs(ip, scope, created_at);

-- 3. Cache des recherches de plaque (30 jours) : chaque appel au fournisseur SIV est facturé.
CREATE TABLE IF NOT EXISTS plaque_cache (
  plaque TEXT PRIMARY KEY,
  resultat JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE plaque_cache ENABLE ROW LEVEL SECURITY;
-- Lue et écrite par la clé service role uniquement (aucune policy publique).

-- 4. Journal des ouvertures de documents (carnet, plaquette) depuis le PDF / l'e-mail.
CREATE TABLE IF NOT EXISTS cg_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  devis_id UUID REFERENCES devis(id) ON DELETE CASCADE,
  garantie_nom TEXT,
  fichier_cg TEXT,
  ip_address TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cg_clicks_devis ON cg_clicks(devis_id);
