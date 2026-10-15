'use client';

// Cartes de garantie — copie de src/components/garanties/GarantieCards.tsx de l'app
// garantieplus (les mêmes cartes qu'au comptoir du garage) : sélecteur de durée 6/12/24,
// prix TTC à 2 décimales, plafond, pièces, organes couverts, carnet de garantie.
// Convention argent : CENTIMES.

import { Check, Download } from 'lucide-react';
import type { Duree, Gamme, GarantieProposee } from '@/types';
import { formatEuros } from '@/lib/format';

export function gammeStyle(gamme: Gamme) {
  switch (gamme) {
    case 'eco':
      return {
        label: 'ECO',
        header: 'bg-[#166534]',
        accent: 'text-[#166534]',
        border: 'border-[#16a34a]',
        ring: 'ring-[#16a34a]/30',
        activeDur: 'bg-[#166534] text-white',
        eligBg: 'bg-[#dcfce7]',
        eligText: 'text-[#166534]',
        reco: 'bg-[#16a34a]',
      };
    case 'luxe':
      return {
        label: 'LUXE',
        header: 'bg-gradient-to-br from-[#1A1A2E] to-[#2a2a4e]',
        accent: 'text-[#1A1A2E]',
        border: 'border-[#1A1A2E]',
        ring: 'ring-[#1A1A2E]/30',
        activeDur: 'bg-gradient-to-r from-[#1A1A2E] to-[#2a2a4e] text-white',
        eligBg: 'bg-white/15',
        eligText: 'text-white/80',
        reco: 'bg-[#F5A623]',
      };
    default:
      return {
        label: 'CLASSIQUE',
        header: 'bg-gradient-to-br from-[#381893] to-[#47b4e1]',
        accent: 'text-[#381893]',
        border: 'border-[#381893]',
        ring: 'ring-[#381893]/30',
        activeDur: 'bg-gradient-to-r from-[#381893] to-[#47b4e1] text-white',
        eligBg: 'bg-white/15',
        eligText: 'text-white/80',
        reco: 'bg-[#F5A623]',
      };
  }
}

const ratingChar = (gamme: Gamme) => (gamme === 'eco' ? '🍀' : '★');

export default function GarantieCards({
  garanties,
  durees,
  onDuree,
  recommande = true,
}: {
  garanties: GarantieProposee[];
  durees: Record<number, Duree>;
  onDuree: (index: number, d: Duree) => void;
  /** Pastille « RECOMMANDÉ » sur la première carte (la plus chère, comme au comptoir). */
  recommande?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {garanties.map((g, i) => {
        const s = gammeStyle(g.gamme);
        const duree = durees[i] ?? '12';
        const prix = g.prixCents[duree];
        const isReco = recommande && i === 0;
        const plafond = g.plafondParDuree ? g.plafondParDuree[duree] : g.plafondIntervention;
        const visibles = 8;
        const ligne = (o: string) => (
          <li key={o} className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            {o}
            <Check size={14} className={`ml-auto shrink-0 ${s.accent}`} strokeWidth={3} />
          </li>
        );
        return (
          <div
            key={g.code}
            className={`relative flex flex-col overflow-hidden rounded-2xl border-2 shadow-xl transition ${
              isReco ? `${s.border} ring-2 ${s.ring}` : 'border-gray-200'
            }`}
          >
            {isReco && (
              <div className={`absolute right-3 top-3 z-10 rounded-full ${s.reco} px-3 py-1 text-xs font-bold text-white shadow`}>
                RECOMMANDÉ
              </div>
            )}

            <div className={`${s.header} px-5 pb-4 pt-5`}>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/70">
                Gamme {s.label}
                {g.segment === 'luxe_gt150' && <span className="ml-1 normal-case tracking-normal">· valeur à neuf &gt; 150 000 €</span>}
              </div>
              <div className="mb-2 flex gap-0.5">
                {Array.from({ length: 5 }, (_, k) => (
                  <span key={k} className={`text-base ${k < g.niveau ? (g.gamme === 'eco' ? '' : 'text-[#F5A623]') : 'text-white/25'}`}>
                    {ratingChar(g.gamme)}
                  </span>
                ))}
              </div>
              <div className="mb-3 text-lg font-bold leading-tight text-white">{g.nomCommercial}</div>
              <div className={`${s.eligBg} overflow-hidden rounded-lg px-3 py-1.5 text-center`}>
                <span className={`${s.eligText} block overflow-hidden text-ellipsis whitespace-nowrap text-center text-[11px]`}>
                  &lt; {g.ageMaxAns} ans{g.kmMax != null && ` / ${g.kmMax.toLocaleString('fr-FR')} km`}
                </span>
              </div>
              {(g.pondereApplique || g.tarifJeune) && (
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {g.pondereApplique && (
                    <span className="inline-flex rounded-full bg-white/20 px-2 py-1 text-xs text-white">Pondéré ×1,5 appliqué</span>
                  )}
                  {g.tarifJeune && (
                    <span className="inline-flex rounded-full bg-white/20 px-2 py-1 text-xs text-white">Tarif jeune véhicule</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-4 bg-white px-5 pb-5 pt-4">
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Durée du contrat</p>
                <div className="flex overflow-hidden rounded-lg border border-gray-200">
                  {(['6', '12', '24'] as Duree[]).map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => onDuree(i, d)}
                      className={`flex-1 py-2 text-sm font-bold transition-all ${duree === d ? s.activeDur : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                      {d} mois
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center rounded-xl bg-gray-50 py-3 text-center">
                <div className="text-4xl font-black tracking-tight text-[#1A1A2E] sm:text-5xl">{formatEuros(prix)}</div>
                <div className="mt-1.5 text-xs font-medium text-gray-400">Prix TTC — Taxe d&apos;assurance incluse</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`flex flex-col items-center justify-center rounded-xl border-2 ${s.border} bg-white p-3 text-center`}>
                  <div className="mb-1 whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide text-gray-500">Plafond / sinistre</div>
                  <div className={`whitespace-nowrap text-[13px] font-black leading-tight ${s.accent}`}>{plafond}</div>
                </div>
                <div className={`rounded-xl border-2 ${s.border} bg-white p-3 text-center`}>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Pièces couvertes</div>
                  <div className={`text-[13px] font-black leading-tight ${s.accent}`}>{g.nombrePiecesCouvertes}</div>
                </div>
              </div>

              <div className="flex-1">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Organes couverts</p>
                <ul className="space-y-1.5">{g.organes.slice(0, visibles).map(ligne)}</ul>
                {g.organes.length > visibles && (
                  <details className="group mt-1.5">
                    <summary className={`cursor-pointer list-none text-[11px] font-bold underline underline-offset-2 ${s.accent} [&::-webkit-details-marker]:hidden`}>
                      <span className="group-open:hidden">Voir les {g.organes.length - visibles} autres organes couverts</span>
                      <span className="hidden group-open:inline">Réduire</span>
                    </summary>
                    <ul className="mt-1.5 space-y-1.5">{g.organes.slice(visibles).map(ligne)}</ul>
                  </details>
                )}
              </div>

              <a
                href={g.document.href}
                target="_blank"
                rel="noreferrer"
                className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 ${s.border} ${s.accent} py-2.5 text-xs font-bold transition-colors hover:bg-[#F8F6FC]`}
              >
                <Download size={14} /> {g.document.label}
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
