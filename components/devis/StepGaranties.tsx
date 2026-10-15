'use client';

// Étape 2 — Garanties & tarifs : les mêmes cartes qu'au comptoir du garage, calculées
// sur le barème GVO Covéa (toutes les garanties éligibles, la plus chère en premier).
// Le prix est recalculé côté serveur à l'envoi du devis : rien n'est envoyé du client.

import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import GarantieCards from './GarantieCards';
import Button from '@/components/ui/Button';
import { calculerOffres, faitsDepuisVehicule, motifIneligibilite } from '@/lib/gvo/offres';
import { formatDateFr, formatKm } from '@/lib/format';
import { libelleEnergie, type Duree, type VehiculeInput } from '@/types';

interface Props {
  vehicule: VehiculeInput;
  onPrev: () => void;
  onNext: () => void;
}

export function ResumeVehicule({ v }: { v: VehiculeInput }) {
  const items = [
    v.plaque,
    `${v.marque} ${v.modele}${v.version ? ` ${v.version}` : ''}`.trim(),
    `MEC ${formatDateFr(v.dateMiseEnCirculation)}`,
    formatKm(v.kilometrage),
    libelleEnergie(v.energie),
    `${v.valeurNeufEuros.toLocaleString('fr-FR')} € à neuf`,
    v.is4x4 && '4x4',
  ].filter(Boolean) as string[];
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <span key={i} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${i === 0 && v.plaque ? 'bg-[#1A1A2E] text-white font-mono tracking-wider' : 'bg-[#EDE9FE] text-[#381893]'}`}>
          {it}
        </span>
      ))}
    </div>
  );
}

export default function StepGaranties({ vehicule, onPrev, onNext }: Props) {
  const faits = useMemo(() => faitsDepuisVehicule(vehicule), [vehicule]);
  const offres = useMemo(() => calculerOffres(faits), [faits]);
  const [durees, setDurees] = useState<Record<number, Duree>>({});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1A2E] mb-1">Garanties & tarifs</h2>
          <p className="text-gray-500 text-sm">Garanties éligibles pour ce véhicule — prix TTC, taxe d&apos;assurance incluse.</p>
        </div>
        <button type="button" onClick={onPrev} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#381893]">
          <ArrowLeft size={15} /> Modifier le véhicule
        </button>
      </div>

      <ResumeVehicule v={vehicule} />

      {offres.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <h3 className="text-lg font-bold text-amber-900 mb-2">Véhicule non éligible</h3>
          <p className="text-sm text-amber-800 max-w-md mx-auto">{motifIneligibilite(faits)}</p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
            <Button type="button" variant="outline" onClick={onPrev}>Modifier le véhicule</Button>
            <a href="mailto:contact@garantieplus.fr" className="inline-flex items-center justify-center rounded-lg border-2 border-transparent bg-gradient-to-r from-[#381893] to-[#47b4e1] px-6 py-3 text-base font-semibold text-white hover:opacity-90">
              Nous contacter
            </a>
          </div>
        </div>
      ) : (
        <>
          <GarantieCards garanties={offres} durees={durees} onDuree={(i, d) => setDurees(p => ({ ...p, [i]: d }))} />
          <div className="flex flex-col gap-3 rounded-2xl border border-[#381893]/20 bg-[#F8F6FC] p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              Recevez ce devis par e-mail avec le <strong>carnet de garantie 2026</strong> remis à vos clients et la plaquette Garantie Plus.
            </p>
            <Button type="button" size="lg" onClick={onNext} className="w-full sm:w-auto">
              Recevoir le devis par e-mail <ArrowRight size={18} />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
