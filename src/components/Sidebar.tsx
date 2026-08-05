"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "◧" },
  { href: "/clients", label: "Clients", icon: "◉" },
  { href: "/markets", label: "Markets", icon: "◭" },
  { href: "/products", label: "Products", icon: "◫" },
  { href: "/assistant", label: "Copilot", icon: "✦" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-edge bg-surface">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
          ◆
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">WealthLens</p>
          <p className="text-[11px] leading-tight text-muted">
            RM Intelligence
          </p>
        </div>
      </div>
      <nav className="mt-2 flex flex-col gap-1 px-3">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-accent/10 font-medium text-accent"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-5 py-4">
        <p className="text-[11px] leading-relaxed text-muted">
          Demo data: clients are simulated.
          <br />
          Market prices &amp; products are real.
        </p>
      </div>
    </aside>
  );
}
