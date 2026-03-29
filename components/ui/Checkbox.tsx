'use client';

interface CheckboxProps {
  id: string;
  label: string;
  sublabel?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function Checkbox({ id, label, sublabel, checked, onChange, disabled }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={`
        flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-150
        ${disabled ? 'opacity-40 cursor-not-allowed bg-gray-50' : 'hover:border-[#381893]/40 hover:bg-[#F8F6FC]'}
        ${checked ? 'border-[#381893] bg-[#F8F6FC]' : 'border-gray-200 bg-white'}
      `}
    >
      <div className="relative mt-0.5 flex-shrink-0">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          disabled={disabled}
          onChange={e => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center transition-all
            ${checked
              ? 'bg-gradient-to-r from-[#381893] to-[#47b4e1] border-[#381893]'
              : 'border-gray-300 bg-white'}
          `}
        >
          {checked && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      <div>
        <p className={`text-sm font-medium ${checked ? 'text-[#381893]' : 'text-gray-800'}`}>{label}</p>
        {sublabel && <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>}
      </div>
    </label>
  );
}
