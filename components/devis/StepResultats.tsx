'use client';

// Étape 4 — Devis envoyé : confirmation, rappel des garanties proposées (telles que
// calculées par le serveur et envoyées par e-mail) et invitation à devenir partenaire.

import { useState } from 'react';
import { CheckCircle2, Mail } from 'lucide-react';
import GarantieCards from './GarantieCards';
import { ResumeVehicule } from './StepGaranties';
import { AVANTAGES_PLUS } from '@/lib/gvo/organes';
import type { DevisFormData, Duree, GarantieProposee } from '@/types';

interface Props {
  garanties: GarantieProposee[];
  form: DevisFormData;
  emailEnvoye: boolean;
  onReset?: () => void;
}

export function lienInscription(form: Pick<DevisFormData, 'nomGarage' | 'nomContact' | 'email' | 'telephone'>): string {
  const p = new URLSearchParams({
    nom_garage: form.nomGarage,
    nom_dirigeant: form.nomContact,
    email: form.email,
    telephone: form.telephone,
  });
  return `/inscription?${p.toString()}`;
}

export default function StepResultats({ garanties, form, emailEnvoye, onReset }: Props) {
  const [durees, setDurees] = useState<Record<number, Duree>>({});
  const inscription = lienInscription(form);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 shrink-0 text-green-600" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-[#1A1A2E] mb-1">
              {emailEnvoye ? 'Devis envoyé' : 'Devis enregistré'}
            </h2>
            <p className="text-gray-500 text-sm">
              {emailEnvoye ? (
                <>Le devis PDF, le carnet de garantie 2026 et la plaquette ont été envoyés à <strong>{form.email}</strong>.</>
              ) : (
                <>L&apos;e-mail n&apos;a pas pu partir ; notre équipe vous recontacte à <strong>{form.email}</strong>.</>
              )}
            </p>
          </div>
        </div>
        {onReset && (
          <button onClick={onReset} className="inline-flex items-center gap-2 border border-gray-300 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0">
            ← Faire un autre devis
          </button>
        )}
      </div>

      <ResumeVehicule v={form.vehicule} />

      {garanties.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800">
          Aucune garantie n&apos;est proposable pour ce véhicule. Notre équipe peut étudier une solution :{' '}
          <a href="mailto:contact@garantieplus.fr" className="font-bold underline">contact@garantieplus.fr</a>
        </div>
      ) : (
        <GarantieCards garanties={garanties} durees={durees} onDuree={(i, d) => setDurees(p => ({ ...p, [i]: d }))} />
      )}

      {/* CTA partenaire : l'objet du devis est de faire entrer le garage dans le réseau. */}
      <div className="rounded-2xl border border-[#381893]/20 bg-white p-6 text-center shadow-sm">
        <p className="font-bold text-[#1A1A2E] text-base mb-1">Proposez ces garanties à vos clients dès demain</p>
        <p className="text-gray-500 text-sm mb-4 max-w-xl mx-auto">
          Devenez partenaire Garantie Plus : souscription en ligne en quelques minutes depuis votre espace garage, carnet de garantie remis au client, gestion des sinistres par notre plateau technique.
        </p>
        <a href={inscription} className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#381893] to-[#47b4e1] text-white font-bold text-base hover:opacity-90 transition-opacity shadow-md">
          Devenir partenaire Garantie Plus →
        </a>
        <p className="mt-3 text-xs text-gray-400 inline-flex items-center gap-1.5"><Mail size={12} /> Vos coordonnées sont déjà pré-remplies.</p>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-md border border-[#381893]/20">
        <div className="bg-gradient-to-r from-[#381893] to-[#47b4e1] px-8 py-6 text-center">
          <h3 className="text-xl font-black text-white tracking-wide mb-1">LES + DE GARANTIE PLUS</h3>
          <p className="text-white/75 text-sm">Ce que vous ne trouvez nulle part ailleurs</p>
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
            <a href="tel:+33184180808" className="text-[#381893] font-bold">01 84 18 08 08</a>{' '}·{' '}
            <a href="mailto:contact@garantieplus.fr" className="text-[#381893] font-bold underline">contact@garantieplus.fr</a>
          </p>
        </div>
      </div>
    </div>
  );
}
