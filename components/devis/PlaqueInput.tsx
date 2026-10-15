'use client';

// Saisie d'immatriculation au visuel d'une plaque française — copie de
// src/components/souscription/PlaqueInput.tsx de l'app garantieplus : bande bleue « F »
// aux étoiles, grands caractères, majuscules d'office, tirets posés tout seuls.

import { formaterPlaque } from '@/lib/vehicule/plaque';

const BLEU_UE = '#0057B7';

function EtoilesUE({ size = 22 }: { size?: number }) {
  const r = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <circle key={i} cx={r + Math.cos(a) * r * 0.72} cy={r + Math.sin(a) * r * 0.72} r={size * 0.07} fill="#FFCC00" />
        );
      })}
    </svg>
  );
}

export default function PlaqueInput({
  value,
  onChange,
  onEnter,
  autoFocus,
  className,
}: {
  value: string;
  onChange: (plaque: string) => void;
  onEnter?: () => void;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`@container flex overflow-hidden rounded-2xl border-2 border-gray-800 bg-white shadow-sm transition focus-within:border-[#381893] focus-within:ring-2 focus-within:ring-[#381893]/30 ${className ?? ''}`}
    >
      <span className="flex w-10 shrink-0 flex-col items-center justify-center gap-0.5 py-1 sm:w-12" style={{ backgroundColor: BLEU_UE }} aria-hidden="true">
        <EtoilesUE size={22} />
        <span className="text-[11px] font-bold leading-none text-white">F</span>
      </span>
      <input
        name="plaque"
        value={value}
        onChange={e => onChange(formaterPlaque(e.target.value))}
        onKeyDown={e => {
          if (e.key === 'Enter' && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        placeholder="AA-123-BB"
        maxLength={12}
        autoFocus={autoFocus}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        aria-label="Immatriculation"
        className="w-full min-w-0 bg-white px-2 py-4 text-center font-mono text-[clamp(1.125rem,8.5cqi,1.875rem)] font-bold uppercase tracking-[0.12em] text-gray-900 outline-none placeholder:text-gray-300 sm:tracking-[0.15em]"
      />
      <span className="w-10 shrink-0 sm:w-12" style={{ backgroundColor: BLEU_UE }} aria-hidden="true" />
    </div>
  );
}
