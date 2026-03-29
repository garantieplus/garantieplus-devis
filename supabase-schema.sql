-- ============================================================
-- Garantie Plus — Schéma Supabase
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS devis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  marque TEXT NOT NULL,
  modele TEXT NOT NULL,
  date_mise_en_circulation DATE NOT NULL,
  kilometrage INTEGER NOT NULL,
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
