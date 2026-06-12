import { NavLink, Outlet } from "react-router-dom";
import { Boxes, Phone, FileText, Users } from "lucide-react";

const SUB = [
  { to: "/admin/config", end: true, label: "Pacotes", icon: Boxes },
  { to: "/admin/config/contactos", label: "Contactos & Hero", icon: Phone },
  { to: "/admin/config/contrato", label: "Contrato", icon: FileText },
  { to: "/admin/config/membros", label: "Membros", icon: Users },
];

function subClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${isActive ? "bg-fg text-bg" : "text-muted hover:text-fg border border-line"}`;
}

export default function ConfigLayout() {
  return (
    <div>
      <div className="flex gap-2 mb-8 overflow-x-auto">
        {SUB.map((s) => (
          <NavLink key={s.to} to={s.to} end={s.end} className={subClass}><s.icon size={15} /> {s.label}</NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
