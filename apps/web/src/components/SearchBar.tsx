import { BUSINESS_CATEGORIES } from '@openrate/shared';

interface SearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
}

export function SearchBar({
  query,
  onQueryChange,
  category,
  onCategoryChange,
}: SearchBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <input
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search businesses..."
        className="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none ring-amber-400 focus:ring-2"
      />
      <select
        value={category}
        onChange={(event) => onCategoryChange(event.target.value)}
        className="rounded-xl border border-stone-300 bg-white px-4 py-3"
      >
        <option value="">All categories</option>
        {BUSINESS_CATEGORIES.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}
