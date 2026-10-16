// Recherche d'un véhicule par sa plaque (serveur uniquement).
//
//  1. SIV : fournisseur apiplaqueimmatriculation.com (VEHICLE_LOOKUP_TOKEN) — marque, modèle,
//     version, date de 1ère mise en circulation, énergie, type mine, identifiant SRA ;
//  2. véhiculier SRA : table `vehiculier` de la base Supabase de CE site (136 720 versions) —
//     valeur à neuf, 4x4, puissance fiscale, et les versions possibles quand le SIV ne tranche
//     pas (un type mine couvre souvent plusieurs versions, aux valeurs à neuf différentes) ;
//  3. sans token : pas de recherche, saisie manuelle.
//
// Chaque appel au fournisseur est facturé : cache de 30 jours par plaque (table
// plaque_cache) et plafond par IP (table rate_limit_logs, scope « plaque »).

import 'server-only';
import { supabaseAdmin } from '@/lib/supabase';
import { normaliserPlaque } from './plaque';
import { rechercheApiPlaque } from './apiplaque';
import type { ResultatRecherche, VehiculeTrouve, VersionCandidate, VersionSpecs } from './types';

const CACHE_JOURS = 30;
const PLAFOND_PAR_IP_PAR_HEURE = 40;
/** Lignes du véhiculier lues par type mine, et versions proposées au maximum. */
const MAX_LIGNES_VERSIONS = 400;
const MAX_VERSIONS = 60;

/** Vrai si une source de recherche est configurée (sinon le formulaire part en saisie manuelle). */
export function rechercheConfiguree(): boolean {
  return !!process.env.VEHICLE_LOOKUP_TOKEN;
}

async function sousPlafond(ip: string): Promise<boolean> {
  if (!ip || ip === 'unknown') return true;
  try {
    const db = supabaseAdmin();
    const since = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await db
      .from('rate_limit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .eq('scope', 'plaque')
      .gte('created_at', since);
    if (count !== null && count >= PLAFOND_PAR_IP_PAR_HEURE) return false;
    await db.from('rate_limit_logs').insert({ ip, scope: 'plaque' });
  } catch (e) {
    console.error('[plaque] plafond non vérifié :', e);
  }
  return true;
}

async function lireCache(plaque: string): Promise<ResultatRecherche | null> {
  try {
    const db = supabaseAdmin();
    const { data } = await db.from('plaque_cache').select('resultat, fetched_at').eq('plaque', plaque).maybeSingle();
    if (!data) return null;
    const age = Date.now() - new Date(data.fetched_at as string).getTime();
    if (age > CACHE_JOURS * 86_400_000) return null;
    return data.resultat as ResultatRecherche;
  } catch {
    return null;
  }
}

async function ecrireCache(plaque: string, resultat: ResultatRecherche): Promise<void> {
  try {
    const db = supabaseAdmin();
    await db.from('plaque_cache').upsert({ plaque, resultat, fetched_at: new Date().toISOString() }, { onConflict: 'plaque' });
  } catch (e) {
    console.warn('[plaque] cache non écrit :', e);
  }
}

// ---------------------------------------------------------------- véhiculier SRA

/** Ligne de la table `vehiculier` (colonnes utilisées ici). */
interface LigneVehiculier {
  sra_identifiant: string;
  marque: string;
  modele: string;
  version: string | null;
  type_mines: string | null;
  transmission: string | null;
  carrosserie: string | null;
  code_energie: string | null;
  prix_origine: number | null;
  dernier_prix_connu: number | null;
  puissance_administrative: number | null;
  ptac_kg: number | null;
  annee_commercialisation: number | null;
}

const COLONNES =
  'sra_identifiant, marque, modele, version, type_mines, transmission, carrosserie, code_energie, prix_origine, dernier_prix_connu, puissance_administrative, ptac_kg, annee_commercialisation';

/** Prix SRA en euros : prix d'origine, à défaut dernier prix connu. */
const prixNeuf = (l: LigneVehiculier): number => l.prix_origine ?? l.dernier_prix_connu ?? 0;

/** 4x4 fiable via la transmission (4P / 4D) ; repli sur la carrosserie si elle manque. */
function est4x4(l: LigneVehiculier): boolean {
  if (l.transmission) return l.transmission === '4P' || l.transmission === '4D';
  return /4X4|TOUT[ -]?CHEMIN|TOUT[ -]?TERRAIN/.test((l.carrosserie ?? '').toUpperCase());
}

function versSpecs(l: LigneVehiculier): VersionSpecs {
  const puissance = l.puissance_administrative ?? 0;
  const ptac = l.ptac_kg;
  return {
    sraIdentifiant: l.sra_identifiant,
    version: l.version ?? '',
    valueNewEuros: prixNeuf(l),
    fiscalPower: l.puissance_administrative ?? undefined,
    isOver14cv: puissance > 14,
    is23003500kg: ptac != null && ptac >= 2300 && ptac <= 3500,
    is4x4: est4x4(l),
  };
}

async function ligneParSra(sra: string): Promise<LigneVehiculier | null> {
  const { data, error } = await supabaseAdmin()
    .from('vehiculier')
    .select(COLONNES)
    .eq('sra_identifiant', sra)
    .maybeSingle();
  if (error) throw error;
  return (data as LigneVehiculier | null) ?? null;
}

interface Candidate { version: string; sra: string; annee: number; prix: number }

/** Versions distinctes d'un lot de lignes : valeur à neuf la plus haute, SRA de l'année la plus récente. */
function regrouperParVersion(lignes: LigneVehiculier[]): Candidate[] {
  const parVersion = new Map<string, Candidate>();
  for (const l of lignes) {
    const version = (l.version ?? '').trim();
    if (!version) continue;
    const annee = l.annee_commercialisation ?? 0;
    const prix = prixNeuf(l);
    const cur = parVersion.get(version);
    if (!cur) parVersion.set(version, { version, sra: l.sra_identifiant, annee, prix });
    else {
      if (annee > cur.annee) { cur.sra = l.sra_identifiant; cur.annee = annee; }
      if (prix > cur.prix) cur.prix = prix;
    }
  }
  return [...parVersion.values()];
}

const tokens = (s: string): string[] => s.toUpperCase().split(/[^A-Z0-9.]+/).filter(t => t.length > 1);

/**
 * Classe les versions candidates : d'abord celles qui partagent le plus de mots avec la
 * version annoncée par le SIV (« 35 L4H3 », « 2.0 TDI 150 »…), puis par ordre alphabétique,
 * et ne garde que les MAX_VERSIONS premières — un modèle courant compte des centaines de
 * versions, inutilisables en liste.
 */
function classerVersions(candidates: Candidate[], versionSiv: string | undefined): VersionCandidate[] {
  const ref = new Set(tokens(versionSiv ?? ''));
  const score = (v: string) => tokens(v).filter(t => ref.has(t)).length;
  return candidates
    .map(c => ({ c, s: score(c.version) }))
    .sort((a, b) => b.s - a.s || a.c.version.localeCompare(b.c.version, 'fr'))
    .slice(0, MAX_VERSIONS)
    .map(({ c }) => ({ version: c.version, sra: c.sra, valueNewEuros: c.prix }));
}

/**
 * Versions du véhiculier correspondant au véhicule : par type mine quand le SIV le donne ET
 * que le référentiel le connaît (de loin le rapprochement le plus sûr), sinon par marque +
 * modèle (fonction SQL vehiculier_versions : regroupement côté base, le modèle pouvant
 * compter des centaines de lignes). Le SIV donne souvent un CNIT (« N10VWGCTX60J732 ») là
 * où le référentiel SRA a un type mine court (« SYN1E ») : d'où le repli.
 */
async function versionsPour(v: VehiculeTrouve): Promise<VersionCandidate[]> {
  const db = supabaseAdmin();
  const typeMine = v.type_mine?.trim();
  if (typeMine) {
    const { data, error } = await db
      .from('vehiculier')
      .select(COLONNES)
      .eq('type_mines', typeMine)
      .not('version', 'is', null)
      .limit(MAX_LIGNES_VERSIONS);
    if (error) throw error;
    const parTypeMine = regrouperParVersion((data ?? []) as LigneVehiculier[]);
    if (parTypeMine.length > 0) return classerVersions(parTypeMine, v.version);
  }
  const marque = v.brand?.trim();
  const modele = v.model?.trim();
  if (!marque || !modele) return [];
  // Le SIV suffixe parfois le modèle (« CRAFTER Van ») : à défaut du libellé complet, son premier mot.
  const premierMot = modele.split(/\s+/)[0];
  for (const m of premierMot !== modele ? [modele, premierMot] : [modele]) {
    const { data, error } = await db.rpc('vehiculier_versions', { p_marque: marque, p_modele: m });
    if (error) throw error;
    const rows = (data ?? []) as { version: string; sra: string; prix: number | null }[];
    if (rows.length > 0) {
      return classerVersions(
        rows.map(r => ({ version: r.version, sra: r.sra, annee: 0, prix: r.prix ?? 0 })),
        v.version,
      );
    }
  }
  return [];
}

/**
 * Complète le véhicule du SIV par le véhiculier : valeur à neuf, 4x4, puissance fiscale et
 * PTAC (quand le SIV ne les donne pas), et la liste des versions possibles. Le véhiculier
 * en panne ne fait pas échouer la recherche : le véhicule du SIV est rendu tel quel.
 */
async function enrichir(vehicule: VehiculeTrouve): Promise<ResultatRecherche> {
  try {
    const ligne = vehicule.sra_id ? await ligneParSra(vehicule.sra_id) : null;
    let v = vehicule;
    if (ligne) {
      const specs = versSpecs(ligne);
      v = {
        ...vehicule,
        version: vehicule.version ?? (ligne.version ?? undefined),
        fiscal_power: vehicule.fiscal_power ?? specs.fiscalPower,
        ptac_kg: vehicule.ptac_kg ?? ligne.ptac_kg ?? undefined,
        value_new_euros: specs.valueNewEuros || undefined,
        is_4x4: vehicule.is_4x4 || specs.is4x4,
        is_over_14cv: specs.isOver14cv,
        is_2300_3500kg: specs.is23003500kg,
      };
    }
    const versions = await versionsPour(v);
    // Sans identifiant SRA, une version unique donne quand même la valeur à neuf.
    if (!v.value_new_euros && versions.length === 1 && versions[0].valueNewEuros) {
      v = { ...v, value_new_euros: versions[0].valueNewEuros };
    }
    return { vehicule: v, versions };
  } catch (e) {
    console.warn('[plaque] véhiculier indisponible :', e instanceof Error ? e.message : e);
    return { vehicule, versions: [] };
  }
}

/**
 * Recherche plafonnée et mise en cache. Jamais d'exception : fournisseur indisponible ou
 * plafond atteint, le résultat est « véhicule inconnu » et le parcours continue en saisie.
 */
export async function rechercherVehicule(brut: string, ip: string): Promise<ResultatRecherche> {
  const plaque = normaliserPlaque(brut);
  if (plaque.length < 4) return { vehicule: null, versions: [] };
  const token = process.env.VEHICLE_LOOKUP_TOKEN;
  if (!token) {
    console.warn('[plaque] aucune source configurée (VEHICLE_LOOKUP_TOKEN)');
    return { vehicule: null, versions: [], indisponible: true, motif: 'non_configuree' };
  }

  const cache = await lireCache(plaque);
  if (cache) return cache;

  if (!(await sousPlafond(ip))) return { vehicule: null, versions: [], indisponible: true, motif: 'quota' };

  let vehicule: VehiculeTrouve | null;
  try {
    vehicule = await rechercheApiPlaque(plaque, token);
  } catch (e) {
    console.warn('[plaque] recherche indisponible :', e instanceof Error ? e.message : e);
    return { vehicule: null, versions: [], indisponible: true, motif: 'fournisseur' };
  }
  if (!vehicule) return { vehicule: null, versions: [] };

  const resultat = await enrichir(vehicule);
  await ecrireCache(plaque, resultat);
  return resultat;
}

/** Caractéristiques d'une version du véhiculier (valeur à neuf, 4x4, puissance fiscale). */
export async function specsVersion(sra: string): Promise<VersionSpecs | null> {
  const id = sra.trim();
  if (!id) return null;
  try {
    const ligne = await ligneParSra(id);
    return ligne ? versSpecs(ligne) : null;
  } catch (e) {
    console.warn('[plaque] véhiculier indisponible :', e instanceof Error ? e.message : e);
    return null;
  }
}
