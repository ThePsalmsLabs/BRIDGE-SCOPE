export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="h-8 w-8 rounded-full bg-primary/10" />
        <div>
          <p className="text-sm text-muted-foreground">BridgeScope</p>
          <p className="text-base font-semibold">Cross-chain analytics</p>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">Placeholder nav</div>
    </header>
  );
}

export default Header;

