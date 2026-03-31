'use client';
import { useState } from 'react';
import { GarantieProposee } from '@/types';

type Duree = '6' | '12' | '24';

interface Props {
  garanties: GarantieProposee[];
  marque: string;
  modele: string;
  email: string;
}

const getGammeStyle = (gamme: string) => {
  switch (gamme) {
    case 'eco':
      return {
        label: 'ECO',
        headerGradient: 'from-[#2E7D4F] to-[#3a9960]',
        accentColor: '#2E7D4F',
        accentClass: 'text-[#2E7D4F]',
        borderClass: 'border-[#2E7D4F]',
        ringClass: 'ring-[#2E7D4F]/30',
        badgeBg: 'bg-[#2E7D4F]',
      };
    case 'luxe':
      return {
        label: 'LUXE',
        headerGradient: 'from-[#1A1A2E] to-[#2a2a4e]',
        accentColor: '#1A1A2E',
        accentClass: 'text-[#1A1A2E]',
        borderClass: 'border-[#1A1A2E]',
        ringClass: 'ring-[#1A1A2E]/30',
        badgeBg: 'bg-[#1A1A2E]',
      };
    case 'luxe_premium':
      return {
        label: 'LUXE PREMIUM',
        headerGradient: 'from-[#0D0D1A] to-[#1a1a30]',
        accentColor: '#0D0D1A',
        accentClass: 'text-[#0D0D1A]',
        borderClass: 'border-[#0D0D1A]',
        ringClass: 'ring-[#0D0D1A]/30',
        badgeBg: 'bg-[#0D0D1A]',
      };
    default:
      return {
        label: 'CLASSIQUE',
        headerGradient: 'from-[#381893] to-[#47b4e1]',
        accentColor: '#381893',
        accentClass: 'text-[#381893]',
        borderClass: 'border-[#381893]',
        ringClass: 'ring-[#381893]/30',
        badgeBg: 'bg-[#381893]',
      };
  }
};

const formatPrix = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const AVANTAGES_PLUS = [
  'Pas de Vetuste',
  'Cessible Gratuitement',
  'Pas de Franchise',
  'Kilometrage Illimite',
  'Pas de Carence',
  'Plafond par Intervention',
  "Pas d'avance de Frais",
  '100% Digital',
  'Couverture Europeenne',
];

export default function StepResultats({ garanties, marque, modele, email }: Props) {
  const [durees, setDurees] = useState<Record<number, Duree>>(() =>
    Object.fromEntries(garanties.map((_, i) => [i, '12' as Duree]))
  );

  if (garanties.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Vehicule non eligible</h2>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Votre vehicule ne correspond pas aux criteres d&apos;eligibilite actuels (age &gt; 15 ans ou kilometrage &gt; 200 000 km).
        </p>
        <a
          href="mailto:contact@garantieplus.fr"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#381893] to-[#47b4e1] text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          Contactez-nous
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-[#1A1A2E] mb-1">Vos garanties disponibles</h2>
        <p className="text-gray-500 text-sm">
          Resultats pour <strong>{marque} {modele}</strong> — Devis envoye a <strong>{email}</strong>
        </p>
      </div>

      {/* Grille des cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {garanties.map((g, i) => {
          const style = getGammeStyle(g.gamme);
          const duree = durees[i] || '12';
          const prix = g.prixFinal[duree];
          const isRecommended = g.niveau === 5;
          const plafondAffiche = g.plafondParDuree ? g.plafondParDuree[duree] : g.plafondIntervention;
          const niveauLabel = `${g.niveau} / 5`;

          return (
            <div
              key={i}
              className={`
                relative rounded-2xl overflow-hidden shadow-xl border-2 flex flex-col
                ${isRecommended
                  ? `${style.borderClass} ring-4 ${style.ringClass}`
                  : 'border-gray-200'}
              `}
            >
              {/* Badge recommande */}
              {isRecommended && (
                <div className="absolute top-3 right-3 z-10 bg-[#F5A623] text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                  RECOMMANDE
                </div>
              )}

              {/* ── HEADER COLORE ── */}
              <div className={`bg-gradient-to-br ${style.headerGradient} px-5 pt-5 pb-4`}>
                <div className="text-white/70 text-[10px] font-bold tracking-widest uppercase mb-2">
                  Gamme {style.label}
                </div>

                {/* Niveau */}
                <div className="mb-1">
                  <span className="text-white/80 text-sm font-bold tracking-wide">{niveauLabel}</span>
                </div>

                <div className="text-white font-bold text-lg leading-tight mb-3">
                  {g.nomCommercial}
                </div>

                {/* Criteres eligibilite */}
                <div className="bg-white/15 rounded-lg px-3 py-2">
                  <span className="text-white/80 text-xs">
                    Eligibilite : moins de {g.ageMaxAns} ans et moins de {g.kmMax.toLocaleString('fr-FR')} km
                  </span>
                </div>

                {g.pondereApplique && (
                  <div className="mt-2 inline-flex bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                    Ponderee x1,5 appliquee
                  </div>
                )}
              </div>

              {/* ── CORPS ── */}
              <div className="bg-white px-5 pb-5 pt-4 flex flex-col flex-1 gap-4">

                {/* Selecteur duree */}
                <div>
                  <p className="text-[10px] text-gray-500 mb-1.5 font-bold uppercase tracking-widest">
                    Duree du contrat
                  </p>
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    {(['6', '12', '24'] as Duree[]).map(d => (
                      <button
                        key={d}
                        onClick={() => setDurees(prev => ({ ...prev, [i]: d }))}
                        className={`
                          flex-1 py-2 text-sm font-bold transition-all
                          ${duree === d
                            ? `bg-gradient-to-r ${style.headerGradient} text-white`
                            : 'text-gray-500 hover:bg-gray-50'}
                        `}
                      >
                        {d} mois
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prix */}
                <div className="text-center py-3 bg-gray-50 rounded-xl">
                  <div className="text-4xl sm:text-5xl font-black text-[#1A1A2E] tracking-tight">
                    {formatPrix(prix)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1.5 font-medium">
                    Prix TTC — Taxe d&apos;assurance incluse
                  </div>
                </div>

                {/* Bloc plafond + pieces — mis en avant */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-xl p-3 text-center border-2 ${style.borderClass} bg-[#F8F6FC]`}>
                    <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-1">
                      Plafond / intervention
                    </div>
                    <div className={`font-black text-base ${style.accentClass} leading-tight`}>
                      {plafondAffiche === 'VRADE'
                        ? 'Plafond VRADE'
                        : plafondAffiche.includes('€')
                          ? `Jusqu\'a ${plafondAffiche}`
                          : plafondAffiche}
                    </div>
                  </div>
                  <div className={`rounded-xl p-3 text-center border-2 ${style.borderClass} bg-[#F8F6FC]`}>
                    <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-1">
                      Pieces couvertes
                    </div>
                    <div className={`font-black text-base ${style.accentClass} leading-tight`}>
                      {g.nombrePiecesCouvertes}
                    </div>
                  </div>
                </div>

                {/* Tableau 2 colonnes : couverture */}
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">
                    Organes couverts
                  </p>
                  <ul className="space-y-1.5">
                    {g.avantagesSpecifiques.map((a, j) => (
                      <li key={j} className="text-xs text-gray-700 flex items-start gap-2">
                        <span className={`font-black flex-shrink-0 mt-0.5 text-sm ${style.accentClass}`}>+</span>
                        <span className="leading-relaxed">{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bouton CG */}
                <a
                  href={g.fichierCG}
                  download
                  className={`
                    mt-auto flex items-center justify-center gap-2 w-full py-3 rounded-xl
                    border-2 ${style.borderClass} ${style.accentClass}
                    text-sm font-bold hover:bg-[#F8F6FC] transition-colors
                  `}
                >
                  Telecharger les Conditions Generales (PDF)
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── LES + DE GARANTIE PLUS ── */}
      <div className="rounded-2xl overflow-hidden shadow-md border border-[#381893]/20">
        {/* Header section */}
        <div className="bg-gradient-to-r from-[#381893] to-[#47b4e1] px-8 py-6 text-center">
          <h3 className="text-xl font-black text-white tracking-wide mb-1">
            LES + DE GARANTIE PLUS
          </h3>
          <p className="text-white/75 text-sm">
            Ce que vous ne trouvez nulle part ailleurs
          </p>
        </div>

        {/* Badges */}
        <div className="bg-white px-8 py-8">
          <div className="flex flex-wrap justify-center gap-3">
            {AVANTAGES_PLUS.map((a, i) => (
              <span
                key={i}
                style={{
                  background: i % 2 === 0 ? '#381893' : 'white',
                  color: i % 2 === 0 ? 'white' : '#47b4e1',
                  border: `2px solid ${i % 2 === 0 ? '#381893' : '#47b4e1'}`,
                }}
                className="inline-flex items-center px-5 py-2.5 rounded-full text-sm font-bold shadow-sm"
              >
                {a}
              </span>
            ))}
          </div>

          <p className="text-center text-gray-600 text-sm mt-8 font-medium">
            Une question ? Notre equipe vous rappelle sous 24h —{' '}
            <a href="mailto:contact@garantieplus.fr" className="text-[#381893] font-bold underline">
              contact@garantieplus.fr
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
