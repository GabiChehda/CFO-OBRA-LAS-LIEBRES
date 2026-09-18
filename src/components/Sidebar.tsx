"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/presupuesto", label: "Presupuesto" },
  { href: "/pagos", label: "Pagos" },
  { href: "/compromisos", label: "Compromisos" },
  { href: "/proveedores", label: "Proveedores" },
  { href: "/cash-flow", label: "Cash Flow" },
  { href: "/fondos", label: "Fondos" },
  { href: "/movimientos", label: "Movimientos" },
  { href: "/configuracion", label: "Configuración" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-slate-200 md:bg-white md:px-3 md:py-4">
      <div className="px-2 pb-4">
        <p className="text-sm font-semibold text-slate-900">Mi Obra</p>
        <p className="text-xs text-slate-500">Las Liebres</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const primary = NAV.slice(0, 5);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white md:hidden">
      {primary.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 py-2 text-center text-[11px] font-medium ${
              active ? "text-slate-900" : "text-slate-400"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
