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

      {/* Mention RGPD */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-xs text-gray-500 leading-relaxed">
          Vos données personnelles seront collectées pour souscrire et gérer votre contrat d&apos;assurance,
          la gestion des sinistres et traiter les réclamations. Conformément au RGPD, vous disposez de droits
          d&apos;accès, de rectification et de suppression. Contact :{' '}
          <a href="mailto:rgpd@garantieplus.fr" className="text-[#381893] underline">
            rgpd@garantieplus.fr
          </a>{' '}
          — 130 rue de Courcelles, 75017 Paris.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" size="lg" className="flex-1" onClick={onPrev}>
          Retour
        </Button>
        <Button type="submit" size="lg" className="flex-1" loading={loading}>
          Voir mes garanties
        </Button>
      </div>
    </form>
  );
}
