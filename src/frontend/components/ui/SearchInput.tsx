import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <div className="relative w-full md:w-64">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-dim">
        <Search size={14} />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Search..."}
        className="w-full bg-active/20 border border-gold-faint text-gold-primary pl-9 pr-3 py-1.5 text-sm font-mono focus:outline-none focus:border-gold-primary placeholder:text-gold-faint"
      />
    </div>
  );
}