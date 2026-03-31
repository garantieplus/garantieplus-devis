'use client';
import { useState } from 'react';
import Checkbox from '@/components/ui/Checkbox';
import Button from '@/components/ui/Button';
import { DevisFormData } from '@/types';

const MARQUES = [
  'Abarth', 'Alfa Romeo', 'Audi', 'BMW', 'Citroën', 'Dacia', 'DS', 'Ferrari',
  'Fiat', 'Ford', 'Honda', 'Hyundai', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini',
  'Land Rover', 'Lexus', 'Maserati', 'Mazda', 'Mercedes-Benz', 'MINI',
  'Mitsubishi', 'Nissan', 'Opel', 'Peugeot', 'Porsche', 'Renault', 'SEAT',
  'Skoda', 'Smart', 'Subaru', 'Suzuki', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo',
];

const MOIS = [
  { value: '1', label: 'Janvier' }, { value: '2', label: 'Février' },
  { value: '3', label: 'Mars' }, { value: '4', label: 'Avril' },
  { value: '5', label: 'Mai' }, { value: '6', label: 'Juin' },
  { value: '7', label: 'Juillet' }, { value: '8', label: 'Août' },
  { value: '9', label: 'Septembre' }, { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' }, { value: '12', label: 'Décembre' },
];

const currentYear = new Date().getFullYear();
const ANNEES = Array.from({ length: 25 }, (_, i) => String(currentYear - i));

interface Props {
  data: DevisFormData;
  onChange: (updates: Partial<DevisFormData>) => void;
  onNext: () => void;
}

export default function StepVehicule({ data, onChange, onNext }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autreMarque, setAutreMarque] = useState(
    () => !!data.marque && !MARQUES.includes(data.marque)
  );

  const formatKm = (v: string) =>
    v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const handleMarqueSelect = (val: string) => {
    if (val === '__autre__') {
      setAutreMarque(true);
      onChange({ marque: '' });
    } else {
      setAutreMarque(false);
      onChange({ marque: val });
    }
  };

  const handleCheckbox = (field: keyof DevisFormData, value: boolean) => {
    const updates: Partial<DevisFormData> = { [field]: value };

    // Interdépendances valeur neuf (cascade vers le haut)
    if (field === 'valeurNeuf150k' && value) {
      updates.valeurNeuf100k = true;
      updates.valeurNeuf55k = true;
    }
    if (field === 'valeurNeuf100k' && value) {
      updates.valeurNeuf55k = true;
    }
    // Cascade vers le bas si décoché
    if (field === 'valeurNeuf100k' && !value) {
      updates.valeurNeuf150k = false;
    }
    if (field === 'valeurNeuf55k' && !value) {
      updates.valeurNeuf100k = false;
      updates.valeurNeuf150k = false;
    }

    onChange(updates);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!data.marque.trim()) e.marque = 'La marque est obligatoire';
    if (!data.modele.trim()) e.modele = 'Le modèle est obligatoire';
    if (!data.dateMiseEnCirculation.mois) e.mois = 'Le mois est obligatoire';
    if (!data.dateMiseEnCirculation.annee) e.annee = "L'année est obligatoire";
    if (!data.kilometrage || data.kilometrage <= 0) e.kilometrage = 'Le kilométrage est obligatoire';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onNext();
  };

  const selectClass = (hasError: boolean) => `
    w-full px-4 py-3 rounded-lg border bg-white text-sm text-gray-900
    focus:outline-none focus:ring-2 focus:ring-[#381893]/30 focus:border-[#381893]
    ${hasError ? 'border-red-400' : 'border-gray-200'}
  `;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1A1A2E] mb-1">Informations du véhicule</h2>
        <p className="text-gray-500 text-sm">Renseignez les caractéristiques du véhicule à garantir</p>
      </div>

      {/* Marque — liste déroulante + saisie libre */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Marque du véhicule</label>
        <select
          value={autreMarque ? '__autre__' : data.marque}
          onChange={e => handleMarqueSelect(e.target.value)}
          className={selectClass(!!errors.marque && !autreMarque)}
        >
          <option value="">Sélectionner une marque</option>
          {MARQUES.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
          <option value="__autre__">Autre marque...</option>
        </select>
        {autreMarque && (
          <input
            type="text"
            autoFocus
            placeholder="Saisir la marque"
            value={data.marque}
            onChange={e => onChange({ marque: e.target.value })}
            className={`mt-2 ${selectClass(!!errors.marque)}`}
          />
        )}
        {errors.marque && <p className="text-xs text-red-500 mt-1">{errors.marque}</p>}
      </div>

      {/* Modèle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Modèle</label>
        <input
          type="text"
          placeholder="Ex: 308, Série 3, Yaris..."
          value={data.modele}
          onChange={e => onChange({ modele: e.target.value })}
          className={selectClass(!!errors.modele)}
        />
        {errors.modele && <p className="text-xs text-red-500 mt-1">{errors.modele}</p>}
      </div>

      {/* Date de mise en circulation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date de mise en circulation</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <select
              value={data.dateMiseEnCirculation.mois}
              onChange={e => onChange({ dateMiseEnCirculation: { ...data.dateMiseEnCirculation, mois: e.target.value } })}
              className={selectClass(!!errors.mois)}
            >
              <option value="">Mois</option>
              {MOIS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            {errors.mois && <p className="text-xs text-red-500 mt-1">{errors.mois}</p>}
          </div>
          <div>
            <select
              value={data.dateMiseEnCirculation.annee}
              onChange={e => onChange({ dateMiseEnCirculation: { ...data.dateMiseEnCirculation, annee: e.target.value } })}
              className={selectClass(!!errors.annee)}
            >
              <option value="">Année</option>
              {ANNEES.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            {errors.annee && <p className="text-xs text-red-500 mt-1">{errors.annee}</p>}
          </div>
        </div>
      </div>

      {/* Kilométrage */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Kilométrage actuel</label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Ex: 80 000"
          value={data.kilometrage ? formatKm(String(data.kilometrage)) : ''}
          onChange={e => {
            const raw = e.target.value.replace(/\s/g, '');
            const num = parseInt(raw);
            onChange({ kilometrage: isNaN(num) ? 0 : num });
          }}
          className={selectClass(!!errors.kilometrage)}
        />
        {errors.kilometrage && <p className="text-xs text-red-500 mt-1">{errors.kilometrage}</p>}
      </div>

      {/* Cases à cocher */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Caractéristiques du véhicule</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Checkbox
            id="is4x4"
            label="4x4 / SUV"
            sublabel="Transmission intégrale ou 4 roues motrices"
            checked={data.is4x4}
            onChange={v => handleCheckbox('is4x4', v)}
          />
          <Checkbox
            id="isPlus2t3"
            label="Plus de 2,3 tonnes"
            sublabel="PTAC entre 2,3T et 3,5T"
            checked={data.isPlus2t3}
            onChange={v => handleCheckbox('isPlus2t3', v)}
          />
          <Checkbox
            id="isPlus14cv"
            label="Plus de 14 chevaux fiscaux"
            checked={data.isPlus14cv}
            onChange={v => handleCheckbox('isPlus14cv', v)}
          />
          <Checkbox
            id="isHybrideElectrique"
            label="Hybride ou électrique"
            checked={data.isHybrideElectrique}
            onChange={v => handleCheckbox('isHybrideElectrique', v)}
          />

          <div className="sm:col-span-2">
            <p className="text-xs font-medium text-gray-500 mb-2 mt-1">Valeur à l&apos;état neuf du véhicule</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Checkbox
                id="valeurNeuf55k"
                label="Valeur à neuf > 55 000€"
                checked={data.valeurNeuf55k}
                onChange={v => handleCheckbox('valeurNeuf55k', v)}
              />
              <Checkbox
                id="valeurNeuf100k"
                label="Valeur à neuf > 100 000€"
                checked={data.valeurNeuf100k}
                onChange={v => handleCheckbox('valeurNeuf100k', v)}
                disabled={data.isHybrideElectrique}
              />
              <Checkbox
                id="valeurNeuf150k"
                label="Valeur à neuf > 150 000€"
                checked={data.valeurNeuf150k}
                onChange={v => handleCheckbox('valeurNeuf150k', v)}
                disabled={data.isHybrideElectrique}
              />
            </div>
            {data.isHybrideElectrique && (
              <p className="text-xs text-[#381893] mt-2">
                Pour les hybrides/électriques, seule la gamme ECO est disponible (jusqu&apos;à 10 000€/intervention).
                La valeur &gt; 55 000€ active une pondération ×1,5.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Button type="submit" size="lg" className="w-full">
          Continuer
        </Button>
      </div>
    </form>
  );
}
