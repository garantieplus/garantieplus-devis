import { StatutDevis } from '@/types';

const STATUT_CONFIG: Record<StatutDevis, { label: string; color: string; dot: string }> = {
  nouveau:    { label: 'Nouveau',    color: 'bg-blue-100 text-blue-700 border-blue-200',    dot: 'bg-blue-500' },
  a_rappeler: { label: 'À rappeler', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
  rappele:    { label: 'Rappelé',    color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  converti:   { label: 'Converti',   color: 'bg-green-100 text-green-700 border-green-200',   dot: 'bg-green-500' },
  perdu:      { label: 'Perdu',      color: 'bg-red-100 text-red-700 border-red-200',          dot: 'bg-red-500' },
};

interface Props {
  statut: StatutDevis;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ statut, size = 'md' }: Props) {
  const cfg = STATUT_CONFIG[statut] || STATUT_CONFIG.nouveau;
  return (
    <span className={`inline-flex items-center gap-1.5 border rounded-full font-medium whitespace-nowrap ${cfg.color} ${size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-3 py-1'}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export { STATUT_CONFIG };
