import './example-controls.css';

/**
 * React port of the Vue harness's own ExampleNumberField.vue — a
 * labeled number input matching ExampleToggle's look. Controlled
 * component (value/onChange), the React equivalent of Vue's v-model.
 */
export interface IExampleNumberFieldProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}

export default function ExampleNumberField({ value, onChange, label, min, max, step = 1 }: IExampleNumberFieldProps) {
  return (
    <label className="number-field">
      <span className="number-field__label">{label}</span>
      <input
        className="number-field__input"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}
