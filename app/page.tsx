'use client';
import { useState, useEffect } from 'react';
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

  // Lecture de l'état injecté par la page /demo (sessionStorage)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('garantieplus_demo');
      if (!raw) return;
      sessionStorage.removeItem('garantieplus_demo');
      const { form: f, garanties: g, step: s } = JSON.parse(raw) as {
        form?: Partial<DevisFormData>;
        garanties?: typeof garanties;
        step?: number;
      };
      if (f) setForm(prev => ({ ...prev, ...f }));
      if (g) setGaranties(g);
      if (s !== undefined) setStep(s);
    } catch { /* ignore */ }
  }, []);

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
    <div className="min-h-screen bg-white">
      <Toaster position="top-right" />

      {/* Header blanc */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-2 sm:py-5 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Garantie Plus"
              width={260}
              height={100}
              className="object-contain h-10 sm:h-14 w-auto"
            />
          </div>

          {/* Boutons */}
          <div className="flex items-center gap-2">
            <a
              href="/plaquette.pdf"
              download
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:border-[#381893] hover:text-[#381893] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              Notre plaquette
            </a>
            <a
              href="https://www.garantieplus.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#381893] to-[#47b4e1] text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Notre site
            </a>
          </div>
        </div>

        {/* Bandeau titre */}
        <div className="bg-gradient-to-r from-[#381893] to-[#47b4e1]">
          <div className="max-w-5xl mx-auto px-6 py-3 sm:py-5 text-center">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Obtenez votre devis de Garantie Panne Mécanique
            </h1>
            <p className="text-white/80 text-sm mt-1">
              Réponse immédiate — Résultats par email — Conditions Générales téléchargeables
            </p>
          </div>
        </div>
      </header>

      {/* Barre de progression */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
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
                        'bg-gray-100 text-gray-400'}
                    `}
                  >
                    {i < step ? '✓' : i + 1}
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
                  <div className="flex-1 h-0.5 mx-1 rounded-full overflow-hidden bg-gray-100">
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
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-8 ${step === 2 ? '' : 'max-w-2xl mx-auto'}`}>

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
              onReset={() => setStep(0)}
            />
          )}
        </div>
        {step < 2 && (
          <p className="text-xs text-gray-400 text-center mt-3 max-w-2xl mx-auto">
            Vos données sont traitées par Garantie Plus SAS conformément au RGPD. Pour exercer vos droits : contact@garantieplus.fr
          </p>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 py-6 border-t border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-400">
            Garantie Plus SAS — RCS Paris 943 193 037 — ORIAS n°25004236 — 130, rue de Courcelles – 75017 Paris
          </p>
        </div>
      </footer>
    </div>
  );
}
