'use client';
import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import StatusBadge from './StatusBadge';
import { Devis, StatutDevis, GarantieProposee } from '@/types';

interface Props {
  devis: Devis[];
  onStatutChange: (id: string, statut: StatutDevis) => void;
  onDelete?: (ids: string[]) => void;
}

const STATUTS: { value: StatutDevis | 'tous'; label: string }[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'nouveau', label: '🔵 Nouveau' },
  { value: 'a_rappeler', label: '🟡 À rappeler' },
  { value: 'rappele', label: '🟠 Rappelé' },
  { value: 'converti', label: '🟢 Converti' },
  { value: 'perdu', label: '🔴 Perdu' },
  { value: 'archive', label: '⬜ Archivé' },
];

const getGammeBadge = (gamme: string) => {
  const styles: Record<string, string> = {
    classique: 'bg-violet-100 text-violet-700',
    eco: 'bg-green-100 text-green-700',
    luxe: 'bg-gray-800 text-white',
    luxe_premium: 'bg-black text-yellow-400',
  };
  const labels: Record<string, string> = {
    classique: 'Classique',
    eco: 'ECO',
    luxe: 'Luxe',
    luxe_premium: 'L. Premium',
  };
  return (
    <span key={gamme} className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[gamme] || 'bg-gray-100 text-gray-700'}`}>
      {labels[gamme] || gamme}
    </span>
  );
};

export default function DevisTable({ devis, onStatutChange, onDelete }: Props) {
  const [filtreStatut, setFiltreStatut] = useState<StatutDevis | 'tous'>('tous');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const filtered = devis.filter(d => {
    if (filtreStatut === 'tous' && d.statut === 'archive') return false;
    if (filtreStatut !== 'tous' && d.statut !== filtreStatut) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !d.nom_garage.toLowerCase().includes(q) &&
        !d.nom_contact.toLowerCase().includes(q) &&
        !d.marque.toLowerCase().includes(q) &&
        !d.modele.toLowerCase().includes(q) &&
        !d.email.toLowerCase().includes(q)
      ) return false;
    }
    if (dateFrom && d.created_at < dateFrom) return false;
    if (dateTo && d.created_at > dateTo + 'T23:59:59') return false;
    return true;
  });

  const allSelected = filtered.length > 0 && filtered.every(d => selected.has(d.id));
  const someSelected = filtered.some(d => selected.has(d.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(d => next.delete(d.id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(d => next.add(d.id));
        return next;
      });
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (!window.confirm(`Supprimer définitivement ${ids.length} devis ? Cette action est irréversible.`)) return;
    setDeleting(true);
    await Promise.all(ids.map(id => fetch(`/api/devis/${id}`, { method: 'DELETE' })));
    setSelected(new Set());
    onDelete?.(ids);
    setDeleting(false);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Garage', 'Contact', 'Email', 'Téléphone', 'Marque', 'Modèle', 'Km', 'Garanties', 'Statut'];
    const rows = filtered.map(d => [
      format(new Date(d.created_at), 'dd/MM/yyyy HH:mm'),
      d.nom_garage,
      d.nom_contact,
      d.email,
      d.telephone,
      d.marque,
      d.modele,
      d.kilometrage,
      (d.garanties_proposees as GarantieProposee[]).map(g => g.etoilesAffichage).join(' | '),
      d.statut,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devis-garantieplus-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <input
            type="text"
            placeholder="Rechercher garage, contact, marque..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
          />
        </div>
        <select
          value={filtreStatut}
          onChange={e => setFiltreStatut(e.target.value as StatutDevis | 'tous')}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
        >
          {STATUTS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
          title="Du"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
          title="Au"
        />
        <button
          onClick={exportCSV}
          className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 font-medium text-gray-700 flex items-center gap-2"
        >
          ⬇️ Export CSV
        </button>
      </div>

      {/* Barre de suppression en masse */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-sm text-red-700 font-medium">
            {selected.size} devis sélectionné{selected.size > 1 ? 's' : ''}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="text-sm text-red-400 hover:text-red-600"
            >
              Annuler
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
            >
              {deleting ? 'Suppression...' : 'Supprimer la sélection'}
            </button>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500">{filtered.length} devis</p>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={toggleAll}
                  className="rounded border-gray-300 cursor-pointer"
                />
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Date</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Garage & Contact</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Véhicule</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Gammes</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Statut</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">Aucun devis trouvé</td>
              </tr>
            ) : filtered.map(d => (
              <tr key={d.id} className={`hover:bg-gray-50 transition-colors ${selected.has(d.id) ? 'bg-violet-50' : ''}`}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(d.id)}
                    onChange={() => toggleOne(d.id)}
                    className="rounded border-gray-300 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                  {format(new Date(d.created_at), 'dd MMM yyyy', { locale: fr })}<br />
                  <span className="text-gray-400">{format(new Date(d.created_at), 'HH:mm')}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-900">{d.nom_garage}</div>
                  <div className="text-gray-500 text-xs">{d.nom_contact}</div>
                  <div className="text-gray-400 text-xs">{d.email}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{d.marque} {d.modele}</div>
                  <div className="text-gray-500 text-xs">{d.kilometrage.toLocaleString('fr-FR')} km</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(d.garanties_proposees as GarantieProposee[]).length === 0 ? (
                      <span className="text-xs text-gray-400 italic">Aucune</span>
                    ) : (
                      [...new Set((d.garanties_proposees as GarantieProposee[]).map(g => g.gamme))].map(gamme =>
                        getGammeBadge(gamme)
                      )
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={d.statut}
                    onChange={e => onStatutChange(d.id, e.target.value as StatutDevis)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                  >
                    {STATUTS.filter(s => s.value !== 'tous').map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/devis/${d.id}`}
                    className="text-[#381893] hover:underline font-medium text-xs whitespace-nowrap"
                  >
                    Voir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
