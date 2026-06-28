interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
};

export function StarRating({ value, onChange, size = 'md' }: StarRatingProps) {
  return (
    <div className={`flex gap-1 ${sizes[size]}`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        if (onChange) {
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className={filled ? 'text-amber-500' : 'text-stone-300 hover:text-amber-400'}
              aria-label={`Rate ${star} stars`}
            >
              ★
            </button>
          );
        }
        return (
          <span key={star} className={filled ? 'text-amber-500' : 'text-stone-300'}>
            ★
          </span>
        );
      })}
    </div>
  );
}
