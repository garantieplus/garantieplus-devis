'use client';
import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { DevisFormData } from '@/types';

interface Props {
  data: DevisFormData;
  onChange: (updates: Partial<DevisFormData>) => void;
  onNext: () => void;
  onPrev: () => void;
  loading: boolean;
}

export default function StepGarage({ data, onChange, onNext, onPrev, loading }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rgpdAccepted, setRgpdAccepted] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!data.nomContact.trim()) e.nomContact = 'Le nom est obligatoire';
    if (!data.nomGarage.trim()) e.nomGarage = 'Le nom du garage est obligatoire';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email.trim()) e.email = "L'email est obligatoire";
    else if (!emailRegex.test(data.email)) e.email = 'Email invalide';

    if (!data.telephone.trim()) e.telephone = 'Le téléphone est obligatoire';
    else if (!/^(\+33|0)[0-9]{9}$/.test(data.telephone.replace(/\s/g, '')))
      e.telephone = 'Numéro invalide (format : 06 12 34 56 78)';

    if (!rgpdAccepted) e.rgpd = 'Vous devez accepter pour continuer';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1A1A2E] mb-1">Informations du garage</h2>
        <p className="text-gray-500 text-sm">Pour recevoir votre devis par email</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="nomContact"
          label="Prénom & Nom du contact"
          placeholder="Jean Dupont"
          value={data.nomContact}
          onChange={e => onChange({ nomContact: e.target.value })}
          error={errors.nomContact}
        />
        <Input
          id="nomGarage"
          label="Nom du garage"
          placeholder="Garage Dupont Auto"
          value={data.nomGarage}
          onChange={e => onChange({ nomGarage: e.target.value })}
          error={errors.nomGarage}
        />
      </div>

      <Input
        id="email"
        label="Adresse email"
        type="email"
        placeholder="contact@mongarage.fr"
        value={data.email}
        onChange={e => onChange({ email: e.target.value })}
        error={errors.email}
      />

      <Input
        id="telephone"
        label="Téléphone"
        type="tel"
        placeholder="06 12 34 56 78"
        value={data.telephone}
        onChange={e => onChange({ telephone: e.target.value })}
        error={errors.telephone}
      />

      {/* Case RGPD obligatoire */}
      <div>
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              type="checkbox"
              className="sr-only"
              checked={rgpdAccepted}
              onChange={e => {
                setRgpdAccepted(e.target.checked);
                if (e.target.checked) setErrors(prev => { const { rgpd: _, ...rest } = prev; return rest; });
              }}
            />
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              errors.rgpd ? 'border-red-400 bg-red-50' :
              rgpdAccepted ? 'border-[#381893] bg-gradient-to-br from-[#381893] to-[#47b4e1]' :
              'border-gray-300 bg-white group-hover:border-[#381893]'
            }`}>
              {rgpdAccepted && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-gray-600 leading-relaxed">
            J&apos;accepte que Garantie Plus conserve mes coordonnées pour le traitement de ce devis et pour me recontacter.{' '}
            <a
              href="/politique-de-confidentialite"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#381893] underline hover:opacity-80"
              onClick={e => e.stopPropagation()}
            >
              Politique de confidentialité
            </a>
          </span>
        </label>
        {errors.rgpd && <p className="text-xs text-red-500 mt-1.5 ml-8">{errors.rgpd}</p>}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button type="button" variant="outline" size="lg" className="w-full sm:flex-1" onClick={onPrev}>
          Retour
        </Button>
        <Button type="submit" size="lg" className="w-full sm:flex-1" loading={loading}>
          Voir mes garanties
        </Button>
      </div>
    </form>
  );
}
