-- ============================================================
-- Garantie Plus — Schéma Supabase (base neuve)
-- À exécuter dans l'éditeur SQL de Supabase. Base existante : voir
-- supabase-migration-2026-10-gvo-covea.sql (colonnes véhicule, cache plaque, rate limit).
-- ============================================================

CREATE TABLE IF NOT EXISTS devis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  marque TEXT NOT NULL,
  modele TEXT NOT NULL,
  version TEXT,
  -- Véhicule retrouvé par la plaque (SIV + véhiculier) ou saisi
  plaque TEXT,
  vin TEXT,
  type_mine TEXT,
  date_mise_en_circulation DATE NOT NULL,
  kilometrage INTEGER NOT NULL,
  energie TEXT,
  valeur_neuf_euros INTEGER,
  puissance_fiscale INTEGER,
  source_vehicule TEXT CHECK (source_vehicule IN ('plaque', 'manuel')),
  is_4x4 BOOLEAN DEFAULT FALSE,
  is_plus_2t3 BOOLEAN DEFAULT FALSE,
  is_plus_14cv BOOLEAN DEFAULT FALSE,
  is_hybride_electrique BOOLEAN DEFAULT FALSE,
  valeur_neuf_55k BOOLEAN DEFAULT FALSE,
  valeur_neuf_100k BOOLEAN DEFAULT FALSE,
  valeur_neuf_150k BOOLEAN DEFAULT FALSE,
  nom_contact TEXT NOT NULL,
  nom_garage TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT NOT NULL,
  garanties_proposees JSONB NOT NULL DEFAULT '[]',
  statut TEXT NOT NULL DEFAULT 'nouveau'
    CHECK (statut IN ('nouveau', 'a_rappeler', 'rappele', 'converti', 'perdu')),
  notes_commerciales TEXT,
  commercial_assigne TEXT,
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_devis_created_at ON devis(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devis_statut ON devis(statut);
CREATE INDEX IF NOT EXISTS idx_devis_email ON devis(email);
CREATE INDEX IF NOT EXISTS idx_devis_plaque ON devis(plaque);

ALTER TABLE devis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access" ON devis
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public can insert" ON devis
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can select own" ON devis
  FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS devis_updated_at ON devis;
CREATE TRIGGER devis_updated_at
  BEFORE UPDATE ON devis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Plafonds anti-abus et cache de la recherche par plaque ───────────────
CREATE TABLE IF NOT EXISTS rate_limit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'inscription',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_scope_time ON rate_limit_logs(ip, scope, created_at);

CREATE TABLE IF NOT EXISTS plaque_cache (
  plaque TEXT PRIMARY KEY,
  resultat JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE plaque_cache ENABLE ROW LEVEL SECURITY;

-- ── Ouvertures de documents (carnet de garantie, plaquette) ──────────────
CREATE TABLE IF NOT EXISTS cg_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  devis_id UUID REFERENCES devis(id) ON DELETE CASCADE,
  garantie_nom TEXT,
  fichier_cg TEXT,
  ip_address TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cg_clicks_devis ON cg_clicks(devis_id);
