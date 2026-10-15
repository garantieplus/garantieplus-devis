// Recherche d'un véhicule par sa plaque (serveur uniquement).
//
//  1. API « site-devis » de l'app garantieplus (GARANTIEPLUS_API_URL + GARANTIEPLUS_API_KEY) :
//     SIV + véhiculier SRA (valeur à neuf, pondération, versions) — la même base que le
//     tunnel « Créer une garantie » du garage ;
//  2. à défaut, le fournisseur SIV en direct (VEHICLE_LOOKUP_TOKEN), sans valeur à neuf ;
//  3. sinon, pas de recherche : saisie manuelle.
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

function apiPrincipale(): { url: string; cle: string } | null {
  const url = process.env.GARANTIEPLUS_API_URL?.replace(/\/+$/, '');
  const cle = process.env.GARANTIEPLUS_API_KEY;
  return url && cle ? { url, cle } : null;
}

/** Vrai si une source de recherche est configurée (sinon le formulaire part en saisie manuelle). */
export function rechercheConfiguree(): boolean {
  return !!apiPrincipale() || !!process.env.VEHICLE_LOOKUP_TOKEN;
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

async function viaAppGarantiePlus(plaque: string): Promise<ResultatRecherche | null> {
  const api = apiPrincipale();
  if (!api) return null;
  const res = await fetch(`${api.url}/api/partenaires/site-devis/vehicule`, {
    method: 'POST',
    headers: { authorization: `Bearer ${api.cle}`, 'content-type': 'application/json' },
    body: JSON.stringify({ plate: plaque }),
    signal: AbortSignal.timeout(20_000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API garantieplus : HTTP ${res.status}`);
  const json = (await res.json()) as { vehicule: VehiculeTrouve | null; versions?: VersionCandidate[] };
  return { vehicule: json.vehicule ?? null, versions: json.versions ?? [] };
}

/**
 * Recherche plafonnée et mise en cache. Jamais d'exception : fournisseur indisponible ou
 * plafond atteint, le résultat est « véhicule inconnu » et le parcours continue en saisie.
 */
export async function rechercherVehicule(brut: string, ip: string): Promise<ResultatRecherche> {
  const plaque = normaliserPlaque(brut);
  if (plaque.length < 4) return { vehicule: null, versions: [] };
  if (!rechercheConfiguree()) {
    console.warn('[plaque] aucune source configurée (GARANTIEPLUS_API_URL/KEY ou VEHICLE_LOOKUP_TOKEN)');
    return { vehicule: null, versions: [], indisponible: true, motif: 'non_configuree' };
  }

  const cache = await lireCache(plaque);
  if (cache) return cache;

  if (!(await sousPlafond(ip))) return { vehicule: null, versions: [], indisponible: true, motif: 'quota' };

  try {
    let resultat = await viaAppGarantiePlus(plaque);
    if (!resultat) {
      const token = process.env.VEHICLE_LOOKUP_TOKEN!;
      resultat = { vehicule: await rechercheApiPlaque(plaque, token), versions: [] };
    }
    if (resultat.vehicule) await ecrireCache(plaque, resultat);
    return resultat;
  } catch (e) {
    console.warn('[plaque] recherche indisponible :', e instanceof Error ? e.message : e);
    return { vehicule: null, versions: [], indisponible: true, motif: 'fournisseur' };
  }
}

/** Caractéristiques d'une version du véhiculier (valeur à neuf) — via l'app garantieplus. */
export async function specsVersion(sra: string): Promise<VersionSpecs | null> {
  const api = apiPrincipale();
  if (!api || !sra) return null;
  try {
    const res = await fetch(`${api.url}/api/partenaires/site-devis/version?sra=${encodeURIComponent(sra)}`, {
      headers: { authorization: `Bearer ${api.cle}` },
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { specs: VersionSpecs | null };
    return json.specs ?? null;
  } catch {
    return null;
  }
}
