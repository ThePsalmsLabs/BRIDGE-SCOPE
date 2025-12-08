const links = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Bridge", href: "/bridge" },
  { label: "Settings", href: "/settings" },
];

export function Sidebar() {
  return (
    <aside className="min-w-[220px] border-r border-border bg-card px-4 py-6">
      <nav className="space-y-2 text-sm">
        {links.map((link) => (
          <a key={link.href} className="block rounded-md px-3 py-2 hover:bg-muted" href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;

