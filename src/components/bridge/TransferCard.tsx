import { DirectionBadge } from "./DirectionBadge";

type TransferCardProps = {
  from: string;
  to: string;
  amount: string;
  status?: string;
};

export function TransferCard({ from, to, amount, status = "Pending" }: TransferCardProps) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-sm">
      <DirectionBadge from={from} to={to} />
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Amount</span>
        <span className="font-semibold">{amount}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Status</span>
        <span className="font-medium">{status}</span>
      </div>
    </div>
  );
}

export default TransferCard;

