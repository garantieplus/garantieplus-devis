// Fournisseur SIV (apiplaqueimmatriculation.com), copie de src/adapters/apiplaque.ts de
// l'app garantieplus. Rend l'identifiant SRA (sra_id) qui sert ensuite à retrouver la
// valeur à neuf dans le véhiculier (lib/vehicule/recherche.ts).

import type { Energie } from '@/types';
import type { VehiculeTrouve } from './types';

function mapEnergy(raw: string | undefined): Energie | undefined {
  if (!raw) return undefined;
  const v = raw.toLowerCase();
  if (v.includes('recharge')) return 'hybride_rechargeable';
  if (v.includes('hybride') || v.includes('hybrid')) return 'hybride_non_rechargeable';
  if (v.includes('elec')) return 'electrique';
  if (v.includes('diesel') || v.includes('gazole') || v.includes('gasoil')) return 'diesel';
  if (v.includes('essence')) return 'essence';
  return 'essence_diesel';
}

function toNum(raw: unknown): number | undefined {
  const m = String(raw ?? '').match(/\d+/);
  const n = m ? parseInt(m[0], 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function is4x4(...parts: (string | undefined)[]): boolean {
  const s = parts.filter(Boolean).join(' ').toLowerCase();
  return /(^|\s)(4x4|4wd|awd|quattro|4motion|xdrive|4matic|4-?matic|integrale?|intégrale?)\b/.test(s) ||
    s.includes('4 roues motrices') ||
    s.includes('transmission integrale') ||
    s.includes('transmission intégrale');
}

export async function rechercheApiPlaque(plate: string, token: string): Promise<VehiculeTrouve | null> {
  const url = `https://api.apiplaqueimmatriculation.com/plaque?immatriculation=${encodeURIComponent(plate)}&token=${encodeURIComponent(token)}&pays=FR`;
  const res = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(15_000) });
  // 400 = plaque refusée par le fournisseur (format invalide, ex. « ES-35-SF » à qui il manque
  // un chiffre) : c'est une plaque non reconnue, pas une panne — le garage saisit le véhicule.
  if (res.status === 400) {
    const corps = (await res.json().catch(() => ({}))) as { message?: string };
    console.warn(`[plaque] refusée par le fournisseur : ${corps.message ?? 'HTTP 400'}`);
    return null;
  }
  if (!res.ok) throw new Error(`apiplaque lookup failed: ${res.status}`);
  const json = (await res.json()) as Record<string, unknown>;
  const d = ((json.data as Record<string, unknown>) ?? json) as Record<string, unknown>;
  if (json.code_erreur && json.code_erreur !== 200) throw new Error(`apiplaque erreur ${json.code_erreur}`);
  if (d.erreur && String(d.erreur).trim() !== '') throw new Error(String(d.erreur));
  const str = (k: string) => (d[k] != null && String(d[k]).trim() !== '' ? String(d[k]).trim() : undefined);
  const brand = str('marque');
  const model = str('modele_en') ?? str('modele');
  if (!brand || !model) return null;
  const puissance = toNum(d.puisFisc);
  const ptac = toNum(d.ptac);
  return {
    brand,
    model,
    version: str('version') ?? str('sra_commercial'),
    first_registration_date: str('date1erCir_us'),
    fiscal_power: puissance,
    energy: mapEnergy(str('energieNGC') ?? str('type_moteur')),
    type_mine: str('type_mine') ?? str('cnit'),
    vin: str('vin'),
    sra_id: str('sra_id'),
    ptac_kg: ptac,
    is_4x4: is4x4(str('type_transmission'), str('version'), str('sra_commercial')),
    is_over_14cv: puissance != null ? puissance > 14 : undefined,
    is_2300_3500kg: ptac != null ? ptac >= 2300 && ptac <= 3500 : undefined,
  };
}
