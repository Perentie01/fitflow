export type CoachModel = 'claude' | 'openai';

const MODEL_KEY = 'coaching.model';

export function getStoredModel(): CoachModel {
  const stored = localStorage.getItem(MODEL_KEY);
  return stored === 'openai' ? 'openai' : 'claude';
}

interface ModelSelectorProps {
  value: CoachModel;
  onChange: (model: CoachModel) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const handleChange = (model: CoachModel) => {
    localStorage.setItem(MODEL_KEY, model);
    onChange(model);
  };

  return (
    <div className="flex rounded-md border border-border overflow-hidden text-xs font-medium">
      {(['claude', 'openai'] as const).map((model) => (
        <button
          key={model}
          onClick={() => handleChange(model)}
          className={`px-3 py-1 transition-colors ${
            value === model
              ? 'bg-[var(--accent)] text-[var(--bg)] font-semibold'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-raised)]'
          }`}
        >
          {model === 'claude' ? 'Claude' : 'GPT'}
        </button>
      ))}
    </div>
  );
}
