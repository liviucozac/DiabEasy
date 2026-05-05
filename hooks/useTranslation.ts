import { useGlucoseStore } from '../store/glucoseStore';
import { translations } from '../utils/translations';

export function useTranslation() {
  const language = useGlucoseStore(s => s.settings.language) ?? 'en';
  return translations[language as 'en' | 'ro' | 'it' | 'de' | 'fr' | 'nl'] ?? translations.en;
}
