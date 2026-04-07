'use client';
import { useState } from 'react';
import { GarantieProposee } from '@/types';
import { getRatingChar } from '@/lib/garantieUtils';

type Duree = '6' | '12' | '24';

interface Props {
  garanties: GarantieProposee[];
  marque: string;
  modele: string;
  email: string;
  onReset?: () => void;
}

const getGammeStyle = (gamme: string) => {
  switch (gamme) {
    case 'eco':
      return {
        label: 'ECO',
        headerClass: 'bg-[#166534]',
        headerGradient: '',
        accentClass: 'text-[#166534]',
        borderClass: 'border-[#16a34a]',
        ringClass: 'ring-[#16a34a]/30',
        activeDurationClass: 'bg-[#166534] text-white',
        eligBgClass: 'bg-[#dcfce7]',
        eligTextClass: 'text-[#166534]',
        recommendedBg: 'bg-[#16a34a]',
      };
    case 'luxe':
      return {
        label: 'LUXE',
        headerClass: 'bg-gradient-to-br from-[#1A1A2E] to-[#2a2a4e]',
        headerGradient: 'from-[#1A1A2E] to-[#2a2a4e]',
        accentClass: 'text-[#1A1A2E]',
        borderClass: 'border-[#1A1A2E]',
        ringClass: 'ring-[#1A1A2E]/30',
        activeDurationClass: 'bg-gradient-to-r from-[#1A1A2E] to-[#2a2a4e] text-white',
        eligBgClass: 'bg-white/15',
        eligTextClass: 'text-white/80',
        recommendedBg: 'bg-[#F5A623]',
      };
    case 'luxe_premium':
      return {
        label: 'LUXE PREMIUM',
        headerClass: 'bg-gradient-to-br from-[#0D0D1A] to-[#1a1a30]',
        headerGradient: 'from-[#0D0D1A] to-[#1a1a30]',
        accentClass: 'text-[#0D0D1A]',
        borderClass: 'border-[#0D0D1A]',
        ringClass: 'ring-[#0D0D1A]/30',
        activeDurationClass: 'bg-gradient-to-r from-[#0D0D1A] to-[#1a1a30] text-white',
        eligBgClass: 'bg-white/15',
        eligTextClass: 'text-white/80',
        recommendedBg: 'bg-[#F5A623]',
      };
    default:
      return {
        label: 'CLASSIQUE',
        headerClass: 'bg-gradient-to-br from-[#381893] to-[#47b4e1]',
        headerGradient: 'from-[#381893] to-[#47b4e1]',
        accentClass: 'text-[#381893]',
        borderClass: 'border-[#381893]',
        ringClass: 'ring-[#381893]/30',
        activeDurationClass: 'bg-gradient-to-r from-[#381893] to-[#47b4e1] text-white',
        eligBgClass: 'bg-white/15',
        eligTextClass: 'text-white/80',
        recommendedBg: 'bg-[#F5A623]',
      };
  }
};

const formatPrix = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const AVANTAGES_PLUS = [
  'Pas de Vétusté',
  'Cessible Gratuitement',
  'Pas de Franchise',
  'Kilométrage Illimité',
  'Pas de Carence',
  'Plafond par Intervention',
  "Pas d'avance de Frais",
  '100% Digital',
  'Couverture Européenne',
];

function BoutonRefaire({ onReset }: { onReset: () => void }) {
  return (
    <button
      onClick={onReset}
      className="inline-flex items-center gap-2 border border-gray-300 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
    >
      ← Refaire un devis
    </button>
  );
}

export default function StepResultats({ garanties, marque, modele, email, onReset }: Props) {
  const [durees, setDurees] = useState<Record<number, Duree>>(() =>
    Object.fromEntries(garanties.map((_, i) => [i, '12' as Duree]))
  );

  if (garanties.length === 0) {
    return (
      <div className="text-center py-12">
        {onReset && (
          <div className="flex justify-start mb-6">
            <BoutonRefaire onReset={onReset} />
          </div>
        )}
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Véhicule non éligible</h2>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Votre véhicule ne correspond pas aux critères d&apos;éligibilité actuels (âge &gt; 15 ans ou kilométrage &gt; 200 000 km).
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
      {/* En-tête avec bouton Refaire */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1A2E] mb-1">Vos garanties disponibles</h2>
          <p className="text-gray-500 text-sm">
            Résultats pour <strong>{marque} {modele}</strong> — Devis envoyé à <strong>{email}</strong>
          </p>
        </div>
        {onReset && <BoutonRefaire onReset={onReset} />}
      </div>

      {/* Grille des cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {garanties.map((g, i) => {
          const style = getGammeStyle(g.gamme);
          const duree = durees[i] || '12';
          const prix = g.prixFinal[duree];
          const isRecommended = g.niveau === 5;
          const plafondAffiche = g.plafondParDuree ? g.plafondParDuree[duree] : g.plafondIntervention;

          return (
            <div
              key={i}
              className={`
                relative rounded-2xl overflow-hidden shadow-xl border-2 flex flex-col
                ${isRecommended ? `${style.borderClass} ring-4 ${style.ringClass}` : 'border-gray-200'}
              `}
            >
              {/* Badge recommandé */}
              {isRecommended && (
                <div className={`absolute top-3 right-3 z-10 ${style.recommendedBg} text-white text-xs font-bold px-3 py-1 rounded-full shadow`}>
                  RECOMMANDÉ
                </div>
              )}

              {/* ── HEADER ── */}
              <div className={`${style.headerClass} px-5 pt-5 pb-4`}>
                <div className="text-white/70 text-[10px] font-bold tracking-widest uppercase mb-2">
                  Gamme {style.label}
                </div>

                {/* Étoiles ou trèfles selon la gamme */}
                <div className="flex gap-0.5 mb-2">
                  {Array.from({ length: 5 }, (_, k) => (
                    <span key={k} className={`text-base ${k < g.niveau ? (g.gamme === 'eco' ? '' : 'text-[#F5A623]') : 'text-white/25'}`}>
                      {getRatingChar(g.gamme)}
                    </span>
                  ))}
                </div>

                <div className="text-white font-bold text-lg leading-tight mb-3">
                  {g.nomCommercial}
                </div>

                {/* Éligibilité — nowrap, format compact */}
                <div className={`${style.eligBgClass} rounded-lg px-3 py-1.5 overflow-hidden text-center`}>
                  <span className={`${style.eligTextClass} text-[11px] whitespace-nowrap block overflow-hidden text-ellipsis text-center`}>
                    &lt; {g.ageMaxAns} ans / {g.kmMax.toLocaleString('fr-FR')} km
                  </span>
                </div>

                {g.pondereApplique && (
                  <div className="mt-2 flex justify-center">
                    <span className="inline-flex bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                      Pondéré ×1,5 appliqué
                    </span>
                  </div>
                )}
              </div>

              {/* ── CORPS ── */}
              <div className="bg-white px-5 pb-5 pt-4 flex flex-col flex-1 gap-4">

                {/* Sélecteur durée */}
                <div>
                  <p className="text-[10px] text-gray-500 mb-1.5 font-bold uppercase tracking-widest">
                    Durée du contrat
                  </p>
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    {(['6', '12', '24'] as Duree[]).map(d => (
                      <button
                        key={d}
                        onClick={() => setDurees(prev => ({ ...prev, [i]: d }))}
                        className={`
                          flex-1 py-2 text-sm font-bold transition-all
                          ${duree === d ? style.activeDurationClass : 'text-gray-500 hover:bg-gray-50'}
                        `}
                      >
                        {d} mois
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prix — centré */}
                <div className={`flex flex-col items-center text-center py-3 rounded-xl ${g.gamme === 'eco' && duree === '12' ? 'bg-[#f0fdf4]' : 'bg-gray-50'}`}>
                  <div className={`text-4xl sm:text-5xl font-black tracking-tight ${g.gamme === 'eco' && duree === '12' ? 'text-[#166534]' : 'text-[#1A1A2E]'}`}>
                    {formatPrix(prix)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1.5 font-medium">
                    Prix TTC — Taxe d&apos;assurance incluse
                  </div>
                </div>

                {/* Plafond + Pièces couvertes */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Plafond — overflow contrôlé */}
                  <div className={`rounded-xl p-3 text-center border-2 ${style.borderClass} bg-white overflow-hidden`}>
                    <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-1 whitespace-nowrap text-center">
                      Plafond / sinistre
                    </div>
                    <div className={`font-black text-[13px] ${style.accentClass} leading-tight overflow-hidden text-ellipsis whitespace-nowrap text-center`}>
                      {plafondAffiche === 'VRADE' ? 'VRADE' : plafondAffiche}
                    </div>
                  </div>
                  <div className={`rounded-xl p-3 text-center border-2 ${style.borderClass} bg-white`}>
                    <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-1">
                      Pièces couvertes
                    </div>
                    <div className={`font-black text-[13px] ${style.accentClass} leading-tight`}>
                      {g.nombrePiecesCouvertes}
                    </div>
                  </div>
                </div>

                {/* Organes couverts */}
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

                {/* Bouton CG — centré */}
                <a
                  href={g.fichierCG}
                  download
                  className={`
                    mt-auto flex items-center justify-center text-center gap-2 w-full py-3 rounded-xl
                    border-2 ${style.borderClass} ${style.accentClass}
                    text-sm font-bold hover:bg-[#F8F6FC] transition-colors
                  `}
                >
                  Télécharger les Conditions Générales (PDF)
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── CTA PARTENAIRE ── */}
      <div className="rounded-2xl border border-[#381893]/20 bg-white p-6 text-center shadow-sm">
        <p className="font-bold text-[#1A1A2E] text-base mb-1">Devenez partenaire Garantie Plus</p>
        <p className="text-gray-500 text-sm mb-4">Rejoignez notre réseau de garages partenaires et proposez nos garanties à vos clients.</p>
        <a
          href="/inscription"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#381893] to-[#47b4e1] text-white font-bold text-base hover:opacity-90 transition-opacity shadow-md"
        >
          Devenir Partenaire Garantie Plus →
        </a>
      </div>

      {/* ── LES + DE GARANTIE PLUS ── */}
      <div className="rounded-2xl overflow-hidden shadow-md border border-[#381893]/20">
        <div className="bg-gradient-to-r from-[#381893] to-[#47b4e1] px-8 py-6 text-center">
          <h3 className="text-xl font-black text-white tracking-wide mb-1">
            LES + DE GARANTIE PLUS
          </h3>
          <p className="text-white/75 text-sm">
            Ce que vous ne trouvez nulle part ailleurs
          </p>
        </div>

        <div className="bg-white px-8 py-8">
          <div className="flex flex-wrap justify-center gap-3">
            {AVANTAGES_PLUS.map((a, idx) => (
              <span
                key={idx}
                style={{
                  background: idx % 2 === 0 ? '#381893' : 'white',
                  color: idx % 2 === 0 ? 'white' : '#47b4e1',
                  border: `2px solid ${idx % 2 === 0 ? '#381893' : '#47b4e1'}`,
                }}
                className="inline-flex items-center px-5 py-2.5 rounded-full text-sm font-bold shadow-sm"
              >
                {a}
              </span>
            ))}
          </div>

          <p className="text-center text-gray-600 text-sm mt-8 font-medium">
            Une question ? Notre équipe vous rappelle sous 24h —{' '}
            <a href="mailto:contact@garantieplus.fr" className="text-[#381893] font-bold underline">
              contact@garantieplus.fr
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
