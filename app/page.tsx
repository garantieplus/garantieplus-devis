'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Toaster, toast } from 'react-hot-toast';
import StepVehicule from '@/components/devis/StepVehicule';
import StepGarage from '@/components/devis/StepGarage';
import StepResultats from '@/components/devis/StepResultats';
import { DevisFormData, GarantieProposee } from '@/types';

const INITIAL_FORM: DevisFormData = {
  marque: '',
  modele: '',
  dateMiseEnCirculation: { mois: '', annee: '' },
  kilometrage: 0,
  is4x4: false,
  isPlus2t3: false,
  isPlus14cv: false,
  isHybrideElectrique: false,
  valeurNeuf55k: false,
  valeurNeuf100k: false,
  valeurNeuf150k: false,
  nomContact: '',
  nomGarage: '',
  email: '',
  telephone: '',
};

const STEPS = ['Véhicule', 'Garage', 'Résultats'];

export default function Home() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<DevisFormData>(INITIAL_FORM);
  const [garanties, setGaranties] = useState<GarantieProposee[]>([]);
  const [loading, setLoading] = useState(false);

  const updateForm = (updates: Partial<DevisFormData>) =>
    setForm(prev => ({ ...prev, ...updates }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marque: form.marque,
          modele: form.modele,
          mois: form.dateMiseEnCirculation.mois,
          annee: form.dateMiseEnCirculation.annee,
          kilometrage: form.kilometrage,
          is4x4: form.is4x4,
          isPlus2t3: form.isPlus2t3,
          isPlus14cv: form.isPlus14cv,
          isHybrideElectrique: form.isHybrideElectrique,
          valeurNeuf55k: form.valeurNeuf55k,
          valeurNeuf100k: form.valeurNeuf100k,
          valeurNeuf150k: form.valeurNeuf150k,
          nomContact: form.nomContact,
          nomGarage: form.nomGarage,
          email: form.email,
          telephone: form.telephone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');

      setGaranties(data.garanties);
      setStep(2);
      toast.success('Devis envoyé par email !');
    } catch (err) {
      toast.error('Une erreur est survenue. Veuillez réessayer.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6FC]">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-gradient-to-r from-[#381893] to-[#47b4e1] shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 bg-white/10 rounded-xl flex items-center justify-center p-2">
              <Image src="/logo.svg" alt="Garantie Plus" width={88} height={88} className="brightness-0 invert" />
            </div>
            <div>
              <div className="text-white font-bold text-2xl leading-tight tracking-wide">GARANTIE PLUS</div>
              <div className="text-white/70 text-sm">Courtier en garanties panne mecanique</div>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-white/80 text-xs">ORIAS n°25004236</p>
            <p className="text-white/60 text-xs">130, rue de Courcelles – 75017 Paris</p>
          </div>
        </div>
      </header>

      {/* Hero */}
      {step < 2 && (
        <div className="bg-gradient-to-r from-[#381893] to-[#47b4e1]">
          <div className="max-w-5xl mx-auto px-4 pb-8 pt-2 text-center">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
              Obtenez votre devis de Garantie Panne Mecanique
            </h1>
            <p className="text-white/80 text-sm sm:text-base">
              Réponse immédiate — Résultats par email — Conditions Générales téléchargeables
            </p>
          </div>
        </div>
      )}

      {/* Barre de progression */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div
                    className={`
                      w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                      ${i < step ? 'bg-green-500 text-white' :
                        i === step ? 'bg-gradient-to-r from-[#381893] to-[#47b4e1] text-white' :
                        'bg-gray-200 text-gray-500'}
                    `}
                  >
                    {i < step ? 'OK' : i + 1}
                  </div>
                  <span
                    className={`text-xs font-semibold hidden sm:block ${
                      i === step ? 'text-[#381893]' : i < step ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 mx-1 rounded-full overflow-hidden bg-gray-200">
                    <div
                      className="h-full bg-gradient-to-r from-[#381893] to-[#47b4e1] transition-all duration-500"
                      style={{ width: i < step ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 ${step === 2 ? '' : 'max-w-2xl mx-auto'}`}>
          {step === 0 && (
            <StepVehicule data={form} onChange={updateForm} onNext={() => setStep(1)} />
          )}
          {step === 1 && (
            <StepGarage
              data={form}
              onChange={updateForm}
              onNext={handleSubmit}
              onPrev={() => setStep(0)}
              loading={loading}
            />
          )}
          {step === 2 && (
            <StepResultats
              garanties={garanties}
              marque={form.marque}
              modele={form.modele}
              email={form.email}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 py-6 border-t border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-400">
            Garantie Plus SAS — RCS Paris 943 193 037 — ORIAS n°25004236 — 130, rue de Courcelles – 75017 Paris
          </p>
        </div>
      </footer>
    </div>
  );
}
