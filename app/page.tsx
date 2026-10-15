'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Toaster, toast } from 'react-hot-toast';
import StepVehicule from '@/components/devis/StepVehicule';
import StepGaranties from '@/components/devis/StepGaranties';
import StepGarage from '@/components/devis/StepGarage';
import StepResultats from '@/components/devis/StepResultats';
import Footer from '@/components/Footer';
import { VEHICULE_VIDE, type DevisFormData, type GarantieProposee, type VehiculeInput } from '@/types';

const INITIAL_FORM: DevisFormData = {
  vehicule: VEHICULE_VIDE,
  nomContact: '',
  nomGarage: '',
  email: '',
  telephone: '',
};

// Le même enchaînement que « Créer une garantie » dans l'espace garage, jusqu'à la formule ;
// ensuite, au lieu du bénéficiaire et du paiement, le devis part par e-mail.
const STEPS = ['Véhicule', 'Garanties & tarifs', 'Coordonnées', 'Devis envoyé'];

export default function Home() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<DevisFormData>(INITIAL_FORM);
  const [garanties, setGaranties] = useState<GarantieProposee[]>([]);
  const [emailEnvoye, setEmailEnvoye] = useState(false);
  const [loading, setLoading] = useState(false);

  // Lecture de l'état injecté par la page /demo (sessionStorage)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('garantieplus_demo');
      if (!raw) return;
      sessionStorage.removeItem('garantieplus_demo');
      const { form: f, garanties: g, step: s, emailEnvoye: e } = JSON.parse(raw) as {
        form?: Partial<DevisFormData>;
        garanties?: GarantieProposee[];
        step?: number;
        emailEnvoye?: boolean;
      };
      if (f) setForm(prev => ({ ...prev, ...f, vehicule: { ...prev.vehicule, ...(f.vehicule ?? {}) } }));
      if (g) setGaranties(g);
      if (e !== undefined) setEmailEnvoye(e);
      if (s !== undefined) setStep(s);
    } catch { /* ignore */ }
  }, []);

  const updateForm = (updates: Partial<DevisFormData>) => setForm(prev => ({ ...prev, ...updates }));
  const updateVehicule = (updates: Partial<VehiculeInput>) =>
    setForm(prev => ({ ...prev, vehicule: { ...prev.vehicule, ...updates } }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setGaranties(data.garanties);
      setEmailEnvoye(!!data.emailEnvoye);
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success(data.emailEnvoye ? 'Devis envoyé par e-mail !' : 'Devis enregistré');
    } catch (err) {
      toast.error('Une erreur est survenue. Veuillez réessayer.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const goTo = (s: number) => {
    setStep(s);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const large = step === 1 || step === 3;

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-right" />

      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-2 sm:py-5 flex items-center justify-between gap-4">
          <div className="flex-shrink-0">
            <Image src="/logo.png" alt="Garantie Plus" width={260} height={100} className="object-contain h-10 sm:h-14 w-auto" />
          </div>
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
              href="/inscription"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#381893] to-[#47b4e1] text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Devenir partenaire
            </a>
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#381893] to-[#47b4e1]">
          <div className="max-w-5xl mx-auto px-6 py-3 sm:py-5 text-center">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Devis Garantie Véhicule d&apos;Occasion — garantie panne mécanique
            </h1>
            <p className="text-white/80 text-sm mt-1">
              Plaque + kilométrage — tarifs immédiats — devis, carnet de garantie et plaquette par e-mail
            </p>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      i < step ? 'bg-green-500 text-white' : i === step ? 'bg-gradient-to-r from-[#381893] to-[#47b4e1] text-white' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-semibold hidden sm:block ${i === step ? 'text-[#381893]' : i < step ? 'text-green-600' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 mx-1 rounded-full overflow-hidden bg-gray-100">
                    <div className="h-full bg-gradient-to-r from-[#381893] to-[#47b4e1] transition-all duration-500" style={{ width: i < step ? '100%' : '0%' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-8 ${large ? '' : 'max-w-2xl mx-auto'}`}>
          {step === 0 && <StepVehicule data={form.vehicule} onChange={updateVehicule} onNext={() => goTo(1)} />}
          {step === 1 && <StepGaranties vehicule={form.vehicule} onPrev={() => goTo(0)} onNext={() => goTo(2)} />}
          {step === 2 && (
            <StepGarage data={form} onChange={updateForm} onNext={handleSubmit} onPrev={() => goTo(1)} loading={loading} />
          )}
          {step === 3 && (
            <StepResultats
              garanties={garanties}
              form={form}
              emailEnvoye={emailEnvoye}
              onReset={() => {
                setForm(INITIAL_FORM);
                setGaranties([]);
                goTo(0);
              }}
            />
          )}
        </div>
        {step < 3 && (
          <p className="text-xs text-gray-400 text-center mt-3 max-w-2xl mx-auto">
            Vos données sont traitées par Garantie Plus SAS conformément au RGPD. Pour exercer vos droits : contact@garantieplus.fr
          </p>
        )}
      </main>

      <Footer />
    </div>
  );
}
