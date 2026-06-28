import type { Language, Translation } from '../i18n';
import './LanguageSwitcher.css';

interface LanguageSwitcherProps {
  language: Language;
  labels: Pick<Translation, 'languageLabel' | 'polish' | 'english'>;
  onLanguageChange: (language: Language) => void;
}

const languages: Language[] = ['pl', 'en'];

export function LanguageSwitcher({ language, labels, onLanguageChange }: LanguageSwitcherProps) {
  return (
    <div className="language-switcher" aria-label={labels.languageLabel}>
      {languages.map((item) => (
        <button
          key={item}
          type="button"
          className={item === language ? 'active' : ''}
          aria-pressed={item === language}
          title={item === 'pl' ? labels.polish : labels.english}
          onClick={() => onLanguageChange(item)}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
