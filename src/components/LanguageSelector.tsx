import { Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type SongLanguage = 'english' | 'hindi' | 'telugu' | 'all';

interface LanguageSelectorProps {
  value: SongLanguage;
  onChange: (value: SongLanguage) => void;
}

const languages: { value: SongLanguage; label: string; flag: string }[] = [
  { value: 'all', label: 'All Languages', flag: '🌐' },
  { value: 'english', label: 'English', flag: '🇺🇸' },
  { value: 'hindi', label: 'Hindi', flag: '🇮🇳' },
  { value: 'telugu', label: 'Telugu', flag: '🎵' },
];

const LanguageSelector = ({ value, onChange }: LanguageSelectorProps) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px] bg-background/50">
        <Globe className="w-4 h-4 mr-2" />
        <SelectValue placeholder="Select Language" />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.value} value={lang.value}>
            <span className="flex items-center gap-2">
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LanguageSelector;
