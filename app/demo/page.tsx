'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { VEHICULE_VIDE, type DevisFormData, type GarantieProposee, type VehiculeInput } from '@/types';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

// ── Données de base réutilisées dans tous les scénarios ────────────────
const BASE_FORM: DevisFormData = {
  vehicule: {
    ...VEHICULE_VIDE,
    plaque: 'AB-123-CD',
    marque: 'Peugeot',
    modele: '308',
    version: '1.2 PureTech 130 Allure',
    dateMiseEnCirculation: '2021-06-01',
    kilometrage: 65000,
    energie: 'essence',
    valeurNeufEuros: 28500,
    puissanceFiscale: 7,
    sourceVehicule: 'manuel',
  },
  nomContact: 'Jean Dupont',
  nomGarage: 'Garage Dupont Auto',
  email: 'jean@garagedupont.fr',
  telephone: '0612345678',
};

// ── Helper : stocker form + step et naviguer vers / ───────────────────
function goToStep(form: DevisFormData, step: number) {
  sessionStorage.setItem('garantieplus_demo', JSON.stringify({ form, step }));
  window.location.href = '/';
}

// ── Helper : appeler l'API (envoi réel des e-mails), stocker, naviguer ──
async function goToResults(
  vehiculeOverrides: Partial<VehiculeInput>,
  setLoading: (k: string | null) => void,
  key: string
) {
  setLoading(key);
  try {
    const form: DevisFormData = { ...BASE_FORM, vehicule: { ...BASE_FORM.vehicule, ...vehiculeOverrides } };
    const res = await fetch('/api/devis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json() as { garanties: GarantieProposee[]; emailEnvoye?: boolean };
    sessionStorage.setItem('garantieplus_demo', JSON.stringify({
      form,
      garanties: data.garanties ?? [],
      emailEnvoye: !!data.emailEnvoye,
      step: 3,
    }));
    window.location.href = '/';
  } catch (e) {
    console.error('[Demo] Erreur API:', e);
    alert('Erreur lors de l\'appel API. Vérifiez la console.');
    setLoading(null);
  }
}

// ── Composants UI ─────────────────────────────────────────────────────
function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-6 first:mt-0">
      {children}
    </p>
  );
}

function DemoButton({
  label,
  sublabel,
  loading,
  disabled,
  onClick,
  href,
  external,
}: {
  label: string;
  sublabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
  external?: boolean;
}) {
  const cls = `
    w-full flex items-center gap-3 px-5 py-3.5 rounded-lg border border-[#E8E2F8]
    bg-white hover:bg-[#F0ECF9] transition-colors text-left
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  `;

  const inner = (
    <>
      {loading ? (
        <svg className="animate-spin h-4 w-4 text-[#381893] flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <span className="text-[#381893] text-lg flex-shrink-0">→</span>
      )}
      <span>
        <span className="text-[#381893] font-medium text-sm block">{label}</span>
        {sublabel && <span className="text-gray-400 text-xs">{sublabel}</span>}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} className={cls}>
        {inner}
      </Link>
    );
  }

  return (
    <button onClick={onClick} disabled={disabled || loading} className={cls}>
      {inner}
    </button>
  );
}

// ── Page principale ───────────────────────────────────────────────────
export default function DemoPage() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const busy = (key: string) => loadingKey === key;
  const anyBusy = loadingKey !== null;

  return (
    <div className="min-h-screen bg-[#F8F6FC]">
      {/* Header */}
      <header className="bg-white border-b border-[#E8E2F8]">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Image src="/logo.png" alt="Garantie Plus" width={160} height={60} className="h-10 w-auto object-contain" />
          <span className="text-xs font-semibold text-[#381893] bg-[#EDE8F8] px-3 py-1 rounded-full">
            MODE DÉMO
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-[#1A1A2E] mb-1">Mode démo — Garantie Plus Dev</h1>
          <p className="text-sm text-gray-500">
            Accès direct à chaque état de l&apos;application sans saisie manuelle.
            Les scénarios &quot;Résultats&quot; effectuent un vrai appel à l&apos;API (devis enregistré, e-mails envoyés).
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E2F8] shadow-sm p-6">

          {/* ── FORMULAIRE DEVIS ── */}
          <GroupLabel>Formulaire devis</GroupLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DemoButton
              label="Étape 1 — Véhicule"
              sublabel="Formulaire vierge, étape 1"
              onClick={() => goToStep(BASE_FORM, 0)}
              disabled={anyBusy}
            />
            <DemoButton
              label="Étape 2 — Garanties & tarifs"
              sublabel="Peugeot 308, 2021, 65 000 km, 28 500 € à neuf"
              onClick={() => goToStep(BASE_FORM, 1)}
              disabled={anyBusy}
            />
            <DemoButton
              label="Étape 3 — Coordonnées"
              sublabel="Véhicule renseigné, saisie du garage"
              onClick={() => goToStep(BASE_FORM, 2)}
              disabled={anyBusy}
            />
            <DemoButton
              label="Étape 2 — Luxe > 150 K€ (tarif jeune)"
              sublabel="Porsche Cayenne 2023, 20 000 km, 160 000 € à neuf"
              onClick={() => goToStep({ ...BASE_FORM, vehicule: { ...BASE_FORM.vehicule, plaque: 'GE-456-ZZ', marque: 'Porsche', modele: 'Cayenne', version: 'E-Hybrid', dateMiseEnCirculation: '2023-03-15', kilometrage: 20000, energie: 'hybride_non_rechargeable', valeurNeufEuros: 160000, puissanceFiscale: 25 } }, 1)}
              disabled={anyBusy}
            />
          </div>

          {/* ── RÉSULTATS ── */}
          <GroupLabel>Résultats — scénarios garanties</GroupLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DemoButton
              label="Résultats — Véhicule standard"
              sublabel="Peugeot 308, 2021, 65 000 km"
              loading={busy('standard')}
              disabled={anyBusy && !busy('standard')}
              onClick={() => goToResults({}, setLoadingKey, 'standard')}
            />
            <DemoButton
              label="Résultats — 4x4 pondéré"
              sublabel="Même véhicule + is4x4: true → tarif ×1,5"
              loading={busy('4x4')}
              disabled={anyBusy && !busy('4x4')}
              onClick={() => goToResults({ is4x4: true }, setLoadingKey, '4x4')}
            />
            <DemoButton
              label="Résultats — Hybride / ECO"
              sublabel="Tesla Model 3 2020, 90 000 km → gamme ECO palier 2"
              loading={busy('eco')}
              disabled={anyBusy && !busy('eco')}
              onClick={() => goToResults({ marque: 'Tesla', modele: 'Model 3', version: 'Long Range', energie: 'electrique', dateMiseEnCirculation: '2020-05-01', kilometrage: 90000, valeurNeufEuros: 52000 }, setLoadingKey, 'eco')}
            />
            <DemoButton
              label="Résultats — Véhicule non éligible"
              sublabel="Année 2003, 250 000 km → aucune garantie"
              loading={busy('ineligible')}
              disabled={anyBusy && !busy('ineligible')}
              onClick={() => goToResults({ dateMiseEnCirculation: '2003-03-01', kilometrage: 250000 }, setLoadingKey, 'ineligible')}
            />
          </div>

          {/* ── BACK-OFFICE & OUTILS ── */}
          <GroupLabel>Back-office &amp; Outils</GroupLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DemoButton
              label="Back-office login"
              sublabel="/admin"
              href="/admin"
            />
            <DemoButton
              label="PDF test (nouvel onglet)"
              sublabel="/api/test-pdf"
              href="/api/test-pdf"
              external
            />
          </div>

          {/* ── PAGES PUBLIQUES ── */}
          <GroupLabel>Pages publiques</GroupLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DemoButton
              label="Inscription partenaire"
              sublabel="/inscription"
              href="/inscription"
            />
            <DemoButton
              label="Politique de confidentialité"
              sublabel="/politique-de-confidentialite"
              href="/politique-de-confidentialite"
            />
          </div>

        </div>

        <p className="text-xs text-gray-400 text-center mt-6">
          Page interne — non indexée — usage dev/test uniquement
        </p>
      </main>
      <Footer />
    </div>
  );
}
