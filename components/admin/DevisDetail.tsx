'use client';
import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import StatusBadge from './StatusBadge';
import { Devis, StatutDevis, GarantieProposee } from '@/types';

interface Props {
  devis: Devis;
  onUpdate: (updated: Devis) => void;
}

const STATUTS: { value: StatutDevis; label: string }[] = [
  { value: 'nouveau', label: '🔵 Nouveau' },
  { value: 'a_rappeler', label: '🟡 À rappeler' },
  { value: 'rappele', label: '🟠 Rappelé' },
  { value: 'converti', label: '🟢 Converti' },
  { value: 'perdu', label: '🔴 Perdu' },
];

const formatPrix = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function DevisDetail({ devis: initialDevis, onUpdate }: Props) {
  const [devis, setDevis] = useState(initialDevis);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [notes, setNotes] = useState(devis.notes_commerciales || '');
  const [commercial, setCommercial] = useState(devis.commercial_assigne || '');

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/devis/${devis.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statut: devis.statut,
          notes_commerciales: notes,
          commercial_assigne: commercial,
        }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error);
      setDevis(updated);
      onUpdate(updated);
      toast.success('Devis mis à jour');
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleResendEmail = async () => {
    setResending(true);
    try {
      const res = await fetch(`/api/devis/${devis.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend-email' }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Emails renvoyés avec succès');
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setResending(false);
    }
  };

  const garanties = devis.garanties_proposees as GarantieProposee[];
  const caractVehicule = [
    devis.is_4x4 && '4x4 / SUV',
    devis.is_plus_2t3 && '+2,3 tonnes',
    devis.is_plus_14cv && '+14 CV fiscaux',
    devis.is_hybride_electrique && 'Hybride / Électrique',
    devis.valeur_neuf_55k && 'Valeur >55k€',
    devis.valeur_neuf_100k && 'Valeur >100k€',
    devis.valeur_neuf_150k && 'Valeur >150k€',
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A2E]">{devis.marque} {devis.modele}</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Devis du {format(new Date(devis.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge statut={devis.statut} />
          <button
            onClick={handleResendEmail}
            disabled={resending}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 font-medium text-gray-700 flex items-center gap-2 disabled:opacity-50"
          >
            {resending ? '...' : '📧 Renvoyer email'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Infos véhicule */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4">🚗 Véhicule</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Marque</dt><dd className="font-medium">{devis.marque}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Modèle</dt><dd className="font-medium">{devis.modele}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Mise en circulation</dt><dd className="font-medium">{devis.date_mise_en_circulation}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Kilométrage</dt><dd className="font-medium">{devis.kilometrage.toLocaleString('fr-FR')} km</dd></div>
            {caractVehicule.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <dt className="text-gray-500 mb-1">Caractéristiques</dt>
                <dd className="flex flex-wrap gap-1">
                  {caractVehicule.map((c, i) => (
                    <span key={i} className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Infos garage */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4">🏪 Garage</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Garage</dt><dd className="font-medium">{devis.nom_garage}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Contact</dt><dd className="font-medium">{devis.nom_contact}</dd></div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Email</dt>
              <dd><a href={`mailto:${devis.email}`} className="text-[#381893] hover:underline font-medium">{devis.email}</a></dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Téléphone</dt>
              <dd><a href={`tel:${devis.telephone}`} className="text-[#381893] hover:underline font-medium">{devis.telephone}</a></dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Garanties proposées */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-4">📋 Garanties proposées</h3>
        {garanties.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Aucune garantie éligible</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-2 font-semibold text-gray-600">Garantie</th>
                  <th className="text-left pb-2 font-semibold text-gray-600">Plafond</th>
                  <th className="text-center pb-2 font-semibold text-gray-600">6 mois</th>
                  <th className="text-center pb-2 font-semibold text-gray-600">12 mois</th>
                  <th className="text-center pb-2 font-semibold text-gray-600">24 mois</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {garanties.map((g, i) => (
                  <tr key={i}>
                    <td className="py-2">{g.etoilesAffichage}</td>
                    <td className="py-2 text-gray-600">{g.plafondIntervention}</td>
                    <td className="py-2 text-center">{formatPrix(g.prixFinal['6'])}</td>
                    <td className="py-2 text-center font-semibold text-[#381893]">{formatPrix(g.prixFinal['12'])}</td>
                    <td className="py-2 text-center">{formatPrix(g.prixFinal['24'])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Gestion commerciale */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-4">💼 Gestion commerciale</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Statut</label>
            <select
              value={devis.statut}
              onChange={e => setDevis({ ...devis, statut: e.target.value as StatutDevis })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              {STATUTS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Commercial assigné</label>
            <input
              type="text"
              value={commercial}
              onChange={e => setCommercial(e.target.value)}
              placeholder="Nom du commercial"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes commerciales</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="Ajouter des notes..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-[#381893] to-[#47b4e1] text-white py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}
