'use client';

// Étape 1 — Véhicule : la plaque et le kilométrage d'abord, comme à l'entrée du tunnel
// « Créer une garantie » du garage. La recherche retrouve le véhicule (SIV + véhiculier :
// valeur à neuf, pondération, versions possibles) et pré-remplit une fiche que l'on
// vérifie ; sans plaque, ou plaque inconnue, la fiche se saisit à la main.

import { useState } from 'react';
import { Keyboard, Loader2, Search } from 'lucide-react';
import PlaqueInput from './PlaqueInput';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import { ENERGIES, type Energie, type VehiculeInput } from '@/types';
import type { ResultatRecherche, VersionCandidate, VersionSpecs } from '@/lib/vehicule/types';
import { PLAQUE_SIV_COMPLETE } from '@/lib/vehicule/plaque';

interface Props {
  data: VehiculeInput;
  onChange: (updates: Partial<VehiculeInput>) => void;
  onNext: () => void;
}

const field = `
  w-full px-4 py-3 rounded-lg border bg-white text-sm text-gray-900
  focus:outline-none focus:ring-2 focus:ring-[#381893]/30 focus:border-[#381893]
`;
const cls = (hasError: boolean) => `${field} ${hasError ? 'border-red-400' : 'border-gray-200'}`;
const label = 'block text-sm font-medium text-gray-700 mb-1.5';

const formatKm = (v: string) => v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const today = () => new Date().toISOString().slice(0, 10);

export default function StepVehicule({ data, onChange, onNext }: Props) {
  // La fiche est visible après une recherche (trouvée ou non), en saisie manuelle, ou au
  // retour sur l'étape (véhicule déjà renseigné).
  const [details, setDetails] = useState(!!data.marque);
  const [looking, setLooking] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'warn'; text: string } | null>(null);
  const [versions, setVersions] = useState<VersionCandidate[]>([]);
  const [versionChoisie, setVersionChoisie] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const rechercher = async () => {
    if (!data.plaque.trim() || looking) return;
    if (!data.kilometrage || data.kilometrage <= 0) {
      setErrors({ kilometrage: 'Indiquez le kilométrage avant de rechercher le véhicule' });
      return;
    }
    setErrors({});
    setLooking(true);
    setMessage(null);
    setVersions([]);
    setVersionChoisie('');
    try {
      const res = await fetch('/api/vehicule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plaque: data.plaque }),
      });
      const r = (await res.json()) as ResultatRecherche;
      if (r.vehicule) {
        const v = r.vehicule;
        onChange({
          marque: v.brand,
          modele: v.model,
          version: v.version ?? '',
          vin: v.vin ?? '',
          typeMine: v.type_mine ?? '',
          dateMiseEnCirculation: v.first_registration_date ?? '',
          energie: v.energy ?? data.energie ?? 'essence',
          valeurNeufEuros: v.value_new_euros ?? 0,
          puissanceFiscale: v.fiscal_power ?? null,
          is4x4: !!v.is_4x4,
          isPlus14cv: !!v.is_over_14cv,
          isPlus2t3: !!v.is_2300_3500kg,
          sourceVehicule: 'plaque',
        });
        if (r.versions.length > 1) setVersions(r.versions);
        setMessage({ type: 'ok', text: `Véhicule trouvé : ${v.brand} ${v.model} ${v.version ?? ''} — vérifiez la fiche ci-dessous.` });
      } else {
        onChange({ sourceVehicule: 'manuel' });
        setMessage({
          type: 'warn',
          text: r.indisponible
            ? 'La recherche par plaque est momentanément indisponible : renseignez le véhicule ci-dessous.'
            : `Plaque ${data.plaque} non reconnue : renseignez le véhicule ci-dessous, cela ne prend qu'une minute.`,
        });
      }
    } catch {
      onChange({ sourceVehicule: 'manuel' });
      setMessage({ type: 'warn', text: 'La recherche a échoué : renseignez le véhicule ci-dessous.' });
    } finally {
      setLooking(false);
      setDetails(true);
    }
  };

  /** Choix d'une version : sa valeur à neuf (et ses flags) remplacent ceux du SIV. */
  const choisirVersion = async (version: string) => {
    setVersionChoisie(version);
    const cand = versions.find(v => v.version === version);
    if (!cand) return;
    onChange({ version, valeurNeufEuros: cand.valueNewEuros || data.valeurNeufEuros });
    try {
      const res = await fetch(`/api/vehicule?sra=${encodeURIComponent(cand.sra)}`);
      const { specs } = (await res.json()) as { specs: VersionSpecs | null };
      if (specs) {
        onChange({
          valeurNeufEuros: specs.valueNewEuros || cand.valueNewEuros || data.valeurNeufEuros,
          puissanceFiscale: specs.fiscalPower ?? data.puissanceFiscale,
          is4x4: specs.is4x4,
          isPlus14cv: specs.isOver14cv,
          isPlus2t3: specs.is23003500kg,
        });
      }
    } catch { /* la valeur de la liste suffit */ }
  };

  const saisieManuelle = () => {
    setMessage(null);
    onChange({ sourceVehicule: 'manuel' });
    setDetails(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!data.marque.trim()) e.marque = 'La marque est obligatoire';
    if (!data.modele.trim()) e.modele = 'Le modèle est obligatoire';
    if (!data.dateMiseEnCirculation) e.dateMiseEnCirculation = 'La date de mise en circulation est obligatoire';
    else if (data.dateMiseEnCirculation > today()) e.dateMiseEnCirculation = 'Date dans le futur';
    if (!data.kilometrage || data.kilometrage <= 0) e.kilometrage = 'Le kilométrage est obligatoire';
    if (!data.energie) e.energie = "L'énergie est obligatoire";
    if (!data.valeurNeufEuros || data.valeurNeufEuros < 1000) e.valeurNeufEuros = 'Le prix à neuf est obligatoire (il détermine la gamme)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1A1A2E] mb-1">Le véhicule</h2>
        <p className="text-gray-500 text-sm">
          Saisissez l&apos;immatriculation et le kilométrage : le véhicule est retrouvé et sa fiche pré-remplie.
        </p>
      </div>

      {/* Plaque + kilométrage : les deux données qui décident de l'éligibilité et du tarif. */}
      <div className="rounded-xl border border-gray-100 bg-[#F8F6FC] p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
          <div>
            <label className={label}>Immatriculation</label>
            <PlaqueInput
              value={data.plaque}
              onChange={p => onChange({ plaque: p })}
              onEnter={rechercher}
              autoFocus={!data.marque}
            />
          </div>
          <div>
            <label className={label}>Kilométrage actuel *</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Ex : 80 000"
              value={data.kilometrage ? formatKm(String(data.kilometrage)) : ''}
              onChange={e => {
                const num = parseInt(e.target.value.replace(/\s/g, ''), 10);
                onChange({ kilometrage: Number.isNaN(num) ? 0 : num });
              }}
              className={`${cls(!!errors.kilometrage)} py-4 text-lg font-semibold`}
            />
            {errors.kilometrage && <p className="text-xs text-red-500 mt-1">{errors.kilometrage}</p>}
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            onClick={rechercher}
            disabled={looking || !PLAQUE_SIV_COMPLETE.test(data.plaque) && data.plaque.trim().length < 4}
            className="w-full sm:w-auto"
          >
            {looking ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            {looking ? 'Recherche du véhicule…' : 'Rechercher le véhicule'}
          </Button>
          {!details && (
            <button type="button" onClick={saisieManuelle} className="inline-flex items-center gap-1.5 text-sm text-gray-500 underline hover:text-[#381893]">
              <Keyboard size={14} /> Je n&apos;ai pas la plaque : saisir le véhicule
            </button>
          )}
        </div>
        {message && (
          <p
            className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
              message.type === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            {message.text}
          </p>
        )}
      </div>

      {details && (
        <>
          <div>
            <h3 className="text-sm font-bold text-[#381893]">
              {data.sourceVehicule === 'plaque' ? 'Vérifiez la fiche du véhicule' : 'Les informations du véhicule'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Tous les champs restent modifiables.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Marque *</label>
              <input value={data.marque} onChange={e => onChange({ marque: e.target.value })} placeholder="Peugeot" className={cls(!!errors.marque)} />
              {errors.marque && <p className="text-xs text-red-500 mt-1">{errors.marque}</p>}
            </div>
            <div>
              <label className={label}>Modèle *</label>
              <input value={data.modele} onChange={e => onChange({ modele: e.target.value })} placeholder="308" className={cls(!!errors.modele)} />
              {errors.modele && <p className="text-xs text-red-500 mt-1">{errors.modele}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Version</label>
              {versions.length > 1 ? (
                <>
                  <select value={versionChoisie} onChange={e => choisirVersion(e.target.value)} className={cls(false)}>
                    <option value="">{versions.length} versions possibles — choisissez la bonne</option>
                    {versions.map(v => (
                      <option key={v.sra} value={v.version}>
                        {v.version}{v.valueNewEuros ? ` — ${v.valueNewEuros.toLocaleString('fr-FR')} € à neuf` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-400">La version choisie fixe le prix à neuf, qui détermine la gamme (Classique ou Luxe).</p>
                </>
              ) : (
                <input value={data.version} onChange={e => onChange({ version: e.target.value })} placeholder="1.2 PureTech 130" className={cls(false)} />
              )}
            </div>
            <div>
              <label className={label}>1ère mise en circulation *</label>
              <input
                type="date"
                value={data.dateMiseEnCirculation}
                max={today()}
                onChange={e => onChange({ dateMiseEnCirculation: e.target.value })}
                className={cls(!!errors.dateMiseEnCirculation)}
              />
              {errors.dateMiseEnCirculation && <p className="text-xs text-red-500 mt-1">{errors.dateMiseEnCirculation}</p>}
            </div>
            <div>
              <label className={label}>Énergie *</label>
              <select value={data.energie} onChange={e => onChange({ energie: e.target.value as Energie })} className={cls(!!errors.energie)}>
                {ENERGIES.map(e => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Prix à neuf (€) *</label>
              <input
                type="number"
                inputMode="numeric"
                min={1000}
                step={100}
                value={data.valeurNeufEuros || ''}
                onChange={e => onChange({ valeurNeufEuros: parseInt(e.target.value, 10) || 0 })}
                placeholder="Ex : 28 500"
                className={cls(!!errors.valeurNeufEuros)}
              />
              {errors.valeurNeufEuros ? (
                <p className="text-xs text-red-500 mt-1">{errors.valeurNeufEuros}</p>
              ) : (
                <p className="mt-1 text-xs text-gray-400">
                  Prix catalogue du véhicule neuf, options comprises : Classique jusqu&apos;à 100 000 €, Luxe au-delà.
                </p>
              )}
            </div>
            <div>
              <label className={label}>Puissance fiscale (CV)</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={data.puissanceFiscale ?? ''}
                onChange={e => {
                  const n = parseInt(e.target.value, 10);
                  onChange({ puissanceFiscale: Number.isNaN(n) ? null : n, isPlus14cv: Number.isNaN(n) ? data.isPlus14cv : n > 14 });
                }}
                className={cls(false)}
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Caractéristiques (pondération ×1,5 sur les gammes Classique et Éco)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Checkbox id="is4x4" label="4x4 / SUV" sublabel="Transmission intégrale" checked={data.is4x4} onChange={v => onChange({ is4x4: v })} />
              <Checkbox id="isPlus14cv" label="Plus de 14 CV fiscaux" checked={data.isPlus14cv} onChange={v => onChange({ isPlus14cv: v })} />
              <Checkbox id="isPlus2t3" label="PTAC 2,3 – 3,5 t" sublabel="Utilitaire lourd" checked={data.isPlus2t3} onChange={v => onChange({ isPlus2t3: v })} />
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" size="lg" className="w-full">
              Voir les garanties et les tarifs
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
