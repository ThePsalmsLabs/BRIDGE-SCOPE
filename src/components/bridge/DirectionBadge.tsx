type DirectionBadgeProps = {
  from: string;
  to: string;
};

export function DirectionBadge({ from, to }: DirectionBadgeProps) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
      <span>{from}</span>
      <span aria-hidden>→</span>
      <span>{to}</span>
    </span>
  );
}

export default DirectionBadge;

