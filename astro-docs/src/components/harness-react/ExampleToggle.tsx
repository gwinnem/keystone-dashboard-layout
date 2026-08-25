import './example-controls.css';

/**
 * React port of the Vue harness's own ExampleToggle.vue — a labeled
 * boolean toggle, styled as a switch rather than a bare checkbox.
 * Controlled component (checked/onChange), the React equivalent of
 * Vue's v-model.
 */
export interface IExampleToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export default function ExampleToggle({ checked, onChange, label }: IExampleToggleProps) {
  return (
    <label className="toggle">
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="toggle__track"><span className="toggle__thumb" /></span>
      <span className="toggle__label">{label}</span>
    </label>
  );
}
