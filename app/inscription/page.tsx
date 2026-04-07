'use client';
import { useState, useRef } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Footer from '@/components/Footer';

interface FormState {
  nomGarage: string;
  nomDirigeant: string;
  email: string;
  telephone: string;
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Type non autorisé (PDF, JPG ou PNG uniquement)';
  if (file.size > MAX_SIZE) return 'Fichier trop volumineux (max 5 Mo)';
  return null;
}

function InscriptionForm() {
  const params = useSearchParams();

  const [form, setForm] = useState<FormState>({
    nomGarage:    params.get('nom_garage')    || '',
    nomDirigeant: params.get('nom_dirigeant') || '',
    email:        params.get('email')         || '',
    telephone:    params.get('telephone')     || '',
  });

  const [files, setFiles] = useState<{ kbis: File | null; cni: File | null; rib: File | null }>({
    kbis: null, cni: null, rib: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  // Honeypot — must remain empty
  const [honeypot, setHoneypot] = useState('');

  const kbisRef = useRef<HTMLInputElement>(null);
  const cniRef  = useRef<HTMLInputElement>(null);
  const ribRef  = useRef<HTMLInputElement>(null);

  const handleFileChange = (key: 'kbis' | 'cni' | 'rib', file: File | null) => {
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      setErrors(prev => ({ ...prev, [key]: err }));
      return;
    }
    setErrors(prev => { const { [key]: _, ...rest } = prev; return rest; });
    setFiles(prev => ({ ...prev, [key]: file }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nomGarage.trim())    e.nomGarage    = 'Obligatoire';
    if (!form.nomDirigeant.trim()) e.nomDirigeant = 'Obligatoire';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Email invalide';
    if (!form.telephone.trim())    e.telephone    = 'Obligatoire';
    if (!files.kbis)  e.kbis = 'Le Kbis est obligatoire';
    if (!files.cni)   e.cni  = "La pièce d'identité est obligatoire";
    if (!files.rib)   e.rib  = 'Le RIB est obligatoire';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('nomGarage',    form.nomGarage);
      fd.append('nomDirigeant', form.nomDirigeant);
      fd.append('email',        form.email);
      fd.append('telephone',    form.telephone);
      fd.append('_website',     honeypot); // honeypot
      fd.append('kbis', files.kbis!);
      fd.append('cni',  files.cni!);
      fd.append('rib',  files.rib!);

      const res = await fetch('/api/inscription', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setSuccess(true);
    } catch (err) {
      setErrors({ global: err instanceof Error ? err.message : 'Une erreur est survenue' });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: string) => `
    w-full px-4 py-3 rounded-lg border bg-white text-sm text-gray-900
    focus:outline-none focus:ring-2 focus:ring-[#381893]/30 focus:border-[#381893]
    ${errors[field] ? 'border-red-400' : 'border-gray-200'}
  `;

  if (success) {
    return (
      <div className="text-center py-12 px-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-[#1A1A2E] mb-3">Demande envoyée !</h2>
        <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
          Votre demande d&apos;inscription a bien été envoyée. Notre équipe vous contacte sous <strong>48h</strong> pour finaliser votre partenariat.
        </p>
        <p className="mt-4 text-sm text-gray-400">
          Une confirmation a été envoyée à <strong>{form.email}</strong>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" encType="multipart/form-data">
      {/* Honeypot — ne pas toucher */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <label htmlFor="_website">Ne pas remplir</label>
        <input
          id="_website"
          name="_website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={e => setHoneypot(e.target.value)}
        />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-[#1A1A2E] mb-1">Informations du garage</h2>
        <p className="text-gray-500 text-sm">Ces informations nous permettront de créer votre compte partenaire</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom du garage <span className="text-red-500">*</span></label>
          <input type="text" value={form.nomGarage} onChange={e => setForm(f => ({ ...f, nomGarage: e.target.value }))}
            placeholder="Garage Dupont Auto" className={inputClass('nomGarage')} />
          {errors.nomGarage && <p className="text-xs text-red-500 mt-1">{errors.nomGarage}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom du dirigeant <span className="text-red-500">*</span></label>
          <input type="text" value={form.nomDirigeant} onChange={e => setForm(f => ({ ...f, nomDirigeant: e.target.value }))}
            placeholder="Jean Dupont" className={inputClass('nomDirigeant')} />
          {errors.nomDirigeant && <p className="text-xs text-red-500 mt-1">{errors.nomDirigeant}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="contact@mongarage.fr" className={inputClass('email')} />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone <span className="text-red-500">*</span></label>
          <input type="tel" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
            placeholder="06 12 34 56 78" className={inputClass('telephone')} />
          {errors.telephone && <p className="text-xs text-red-500 mt-1">{errors.telephone}</p>}
        </div>
      </div>

      {/* Documents */}
      <div>
        <h3 className="text-lg font-semibold text-[#1A1A2E] mb-1">Documents requis</h3>
        <p className="text-gray-500 text-xs mb-4">PDF ou image (JPG, PNG) — max 5 Mo par fichier</p>

        <div className="space-y-3">
          {([
            { key: 'kbis', label: 'Kbis du garage', hint: 'Extrait Kbis de moins de 3 mois', ref: kbisRef },
            { key: 'cni',  label: "Carte d'identité du dirigeant", hint: 'Recto-verso, en cours de validité', ref: cniRef },
            { key: 'rib',  label: 'RIB', hint: "Relevé d'identité bancaire du garage", ref: ribRef },
          ] as const).map(({ key, label, hint, ref }) => (
            <div key={key} className={`border-2 rounded-xl p-4 transition-colors ${errors[key] ? 'border-red-300 bg-red-50' : files[key] ? 'border-green-300 bg-green-50' : 'border-dashed border-gray-200 hover:border-[#381893]/40'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{label} <span className="text-red-500">*</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
                  {files[key] && (
                    <p className="text-xs text-green-700 mt-1 font-medium truncate">{files[key]!.name}</p>
                  )}
                  {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
                </div>
                <div className="flex-shrink-0">
                  <input
                    ref={ref}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={e => handleFileChange(key, e.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    onClick={() => ref.current?.click()}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                      files[key]
                        ? 'border-green-500 text-green-700 bg-white hover:bg-green-50'
                        : 'border-[#381893] text-[#381893] bg-white hover:bg-[#381893]/5'
                    }`}
                  >
                    {files[key] ? 'Changer' : 'Choisir'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RGPD */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-xs text-gray-500 leading-relaxed">
          Vos données sont collectées pour traiter votre demande de partenariat conformément au RGPD.{' '}
          <a href="/politique-de-confidentialite" target="_blank" rel="noopener noreferrer" className="text-[#381893] underline">
            Politique de confidentialité
          </a>
          {' '}— Contact :{' '}
          <a href="mailto:contact@garantieplus.fr" className="text-[#381893] underline">contact@garantieplus.fr</a>
        </p>
      </div>

      {errors.global && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{errors.global}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#381893] to-[#47b4e1] text-white font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Envoi en cours...
          </>
        ) : "Envoyer ma demande d'inscription →"}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Vos données sont traitées par Garantie Plus SAS conformément au RGPD. Pour exercer vos droits : contact@garantieplus.fr
      </p>
    </form>
  );
}

export default function InscriptionPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-2 sm:py-5 flex items-center justify-between gap-4">
          <Image src="/logo.png" alt="Garantie Plus" width={260} height={100} className="object-contain h-10 sm:h-14 w-auto" />
          <a href="https://www.garantieplus.fr" target="_blank" rel="noopener noreferrer"
            className="text-sm font-medium text-gray-500 hover:text-[#381893] transition-colors hidden sm:block">
            garantieplus.fr
          </a>
        </div>
        <div className="bg-gradient-to-r from-[#381893] to-[#47b4e1]">
          <div className="max-w-3xl mx-auto px-6 py-3 sm:py-5 text-center">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">Devenir Partenaire Garantie Plus</h1>
            <p className="text-white/80 text-sm mt-1">Proposez nos garanties à vos clients — Rejoignez notre réseau de garages</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {[
            { icon: '⚡', title: '100% digital', desc: 'Souscription et gestion entièrement en ligne' },
            { icon: '🤝', title: 'Accompagnement', desc: 'Formation et support commercial dédié' },
          ].map((item) => (
            <div key={item.title} className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="font-semibold text-sm text-[#1A1A2E] mb-1">{item.title}</p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-8">
          <Suspense fallback={<div className="text-center py-8 text-gray-400">Chargement...</div>}>
            <InscriptionForm />
          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  );
}
