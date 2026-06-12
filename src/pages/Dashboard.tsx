import { useState } from "react";
import { Search, LayoutDashboard, Users, SatelliteDish, FileText, CreditCard, LifeBuoy, Wrench, ChevronUp, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { clsx } from "clsx";

const views = [
  { id: "dash", icon: LayoutDashboard, label: "Dashboard", group: "Geral" },
  { id: "clients", icon: Users, label: "Clientes", group: "Geral" },
  { id: "equip", icon: SatelliteDish, label: "Equipamentos", group: "Geral" },
  { id: "contracts", icon: FileText, label: "Contratos", group: "Geral" },
  { id: "billing", icon: CreditCard, label: "Faturação", group: "Geral" },
  { id: "support", icon: LifeBuoy, label: "Suporte", group: "Operações", badge: 4 },
  { id: "installs", icon: Wrench, label: "Instalações", group: "Operações" },
];

const dashboardClients = [
  { n: 'Fazenda Limpopo', p: 'Empresarial', loc: 'Gaza', m: '6.900', st: 'ok', stl: 'Ativo' },
  { n: 'Mina Revuboè', p: 'Operações', loc: 'Tete', m: '24.000', st: 'ok', stl: 'Ativo' },
  { n: 'Lodge Bazaruto', p: 'Empresarial', loc: 'Inhambane', m: '6.900', st: 'ok', stl: 'Ativo' },
  { n: 'Construções Maúa', p: 'Essencial', loc: 'Niassa', m: '3.500', st: 'warn', stl: 'Atraso' },
  { n: 'Clínica São José', p: 'Essencial', loc: 'Manica', m: '3.500', st: 'ok', stl: 'Ativo' },
];

const AV_COLORS = ['bg-[#5CF2C8]', 'bg-[#F5B948]', 'bg-[#7C8CF8]', 'bg-[#FF6B8A]', 'bg-[#4FB6FF]', 'bg-[#9D7BFF]'];
function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('');
}

export default function Dashboard() {
  const [activeView, setActiveView] = useState("dash");

  return (
    <div className="flex min-h-screen bg-[#070B16] text-[#EAF0FF] font-inter antialiased">
      
      {/* SIDEBAR */}
      <aside className="hidden md:flex flex-col w-[264px] border-r border-line bg-[#0C1426] sticky top-0 h-screen p-5 pt-6 relative z-10">
        <div className="flex items-center gap-3 font-bricolage font-extrabold text-[21px] px-2 mb-8">
          <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="5" fill="#5CF2C8"/>
            <ellipse cx="16" cy="16" rx="14" ry="6.2" stroke="#5CF2C8" strokeOpacity=".5" transform="rotate(32 16 16)"/>
            <ellipse cx="16" cy="16" rx="14" ry="6.2" stroke="#7C8CF8" strokeOpacity=".45" transform="rotate(-32 16 16)"/>
          </svg>
          <Link to="/">In<span className="text-[#5CF2C8]">time</span></Link>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="text-[10.5px] font-mono tracking-[0.14em] uppercase text-[#5C6B8C] px-3 pb-2 pt-4">Geral</div>
          {views.filter(v => v.group === "Geral").map(v => (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5",
                activeView === v.id 
                  ? "bg-gradient-to-r from-[#5CF2C8]/10 to-[#5CF2C8]/5 text-[#5CF2C8]" 
                  : "text-[#93A1C4] hover:bg-[#101B31] hover:text-[#EAF0FF]"
              )}
            >
              <v.icon size={18} className={activeView === v.id ? "opacity-100" : "opacity-80"} />
              {v.label}
            </button>
          ))}

          <div className="text-[10.5px] font-mono tracking-[0.14em] uppercase text-[#5C6B8C] px-3 pb-2 pt-6">Operações</div>
          {views.filter(v => v.group === "Operações").map(v => (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5",
                activeView === v.id 
                  ? "bg-gradient-to-r from-[#5CF2C8]/10 to-[#5CF2C8]/5 text-[#5CF2C8]" 
                  : "text-[#93A1C4] hover:bg-[#101B31] hover:text-[#EAF0FF]"
              )}
            >
              <v.icon size={18} className={activeView === v.id ? "opacity-100" : "opacity-80"} />
              {v.label}
              {v.badge && (
                <span className="ml-auto bg-[#FF6B8A] text-fg text-[11px] font-bold min-w-[19px] h-[19px] rounded-full flex items-center justify-center px-1.5">
                  {v.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-auto pt-4 border-t border-line flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7C8CF8] to-[#5CF2C8] flex items-center justify-center font-bold text-[#070B16] text-sm shrink-0">
            PS
          </div>
          <div>
            <div className="text-[13.5px] font-semibold">P. Sengo</div>
            <div className="text-xs text-[#5C6B8C]">Administrador</div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
          <div>
            <h1 className="font-bricolage text-[27px] font-bold">Dashboard</h1>
            <div className="text-[#5C6B8C] text-[13.5px] mt-1">Visão geral da operação · Junho 2026</div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#0C1426] border border-line rounded-xl px-3.5 py-2 min-w-[220px]">
              <Search size={16} className="text-[#5C6B8C]" />
              <input 
                type="text" 
                placeholder="Procurar cliente, kit..." 
                className="bg-transparent border-none outline-none text-sm text-[#EAF0FF] placeholder:text-[#5C6B8C] w-full"
              />
            </div>
            <button className="flex items-center gap-2 bg-[#5CF2C8] text-[#070B16] font-semibold text-[13.5px] px-4 py-2.5 rounded-xl hover:brightness-110 transition-all font-hanken">
              + Novo cliente
            </button>
          </div>
        </div>

        {activeView === "dash" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0E1729] border border-line rounded-2xl p-5">
                <div className="flex justify-between items-center mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#101B31] flex items-center justify-center text-xl">📈</div>
                  <span className="text-[#5CF2C8] text-xs font-bold font-mono">▲ 12,4%</span>
                </div>
                <div className="font-bricolage font-extrabold text-[32px] tracking-tight leading-none mb-1">
                  214.500 <span className="text-base text-[#5C6B8C] font-semibold tracking-normal">MT</span>
                </div>
                <div className="text-[13px] text-[#5C6B8C]">Receita recorrente / mês</div>
              </div>

              <div className="bg-[#0E1729] border border-line rounded-2xl p-5">
                <div className="flex justify-between items-center mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#101B31] flex items-center justify-center text-xl">👥</div>
                  <span className="text-[#5CF2C8] text-xs font-bold font-mono">▲ 3</span>
                </div>
                <div className="font-bricolage font-extrabold text-[32px] tracking-tight leading-none mb-1">31</div>
                <div className="text-[13px] text-[#5C6B8C]">Clientes ativos</div>
              </div>

              <div className="bg-[#0E1729] border border-line rounded-2xl p-5">
                <div className="flex justify-between items-center mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#101B31] flex items-center justify-center text-xl">📡</div>
                  <span className="text-[#FF6B8A] text-xs font-bold font-mono">▼ 2</span>
                </div>
                <div className="font-bricolage font-extrabold text-[32px] tracking-tight leading-none mb-1">7</div>
                <div className="text-[13px] text-[#5C6B8C]">Kits disponíveis</div>
              </div>

              <div className="bg-[#0E1729] border border-line rounded-2xl p-5">
                <div className="flex justify-between items-center mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#101B31] flex items-center justify-center text-xl">⚠️</div>
                  <span className="text-[#FF6B8A] text-xs font-bold font-mono">▲ 1</span>
                </div>
                <div className="font-bricolage font-extrabold text-[32px] tracking-tight leading-none mb-1">
                  18.900 <span className="text-base text-[#5C6B8C] font-semibold tracking-normal">MT</span>
                </div>
                <div className="text-[13px] text-[#5C6B8C]">Pagamentos em atraso</div>
              </div>
            </div>

            {/* Graphs / Fleet */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
              <div className="bg-[#0E1729] border border-line rounded-2xl p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-[17px] font-bold font-bricolage mb-1">Receita mensal</h3>
                    <div className="text-[#5C6B8C] text-[12.5px]">Últimos 8 meses · em milhares de MT</div>
                  </div>
                  <button className="text-[#5CF2C8] text-[13px] font-semibold hover:underline">Exportar</button>
                </div>
                
                <div className="flex items-end gap-3 h-[200px] pt-4">
                  {[120, 138, 142, 156, 170, 188, 201, 214].map((v, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group">
                      <div className="w-full max-w-[34px] rounded-t-md bg-gradient-to-b from-[#5CF2C8] to-[#5CF2C8]/20 group-hover:from-[#7C8CF8] group-hover:to-[#7C8CF8]/30 transition-all duration-300 transform origin-bottom" style={{ height: `${(v/214)*100}%` }}></div>
                      <small className="text-[#5C6B8C] text-[11px] font-mono">{['Nov','Dez','Jan','Fev','Mar','Abr','Mai','Jun'][i]}</small>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0E1729] border border-line rounded-2xl p-6">
                <h3 className="text-[17px] font-bold font-bricolage mb-1">Estado da frota</h3>
                <div className="text-[#5C6B8C] text-[12.5px] mb-6">45 kits no total</div>
                
                <div className="flex items-center gap-6">
                  {/* CSS Donut */}
                  <div className="relative w-32 h-32 rounded-full flex items-center justify-center shrink-0"
                       style={{ background: `conic-gradient(#5CF2C8 0 62%, #F5B948 62% 82%, #7C8CF8 82% 94%, #101B31 94% 100%)` }}>
                    <div className="w-[84px] h-[84px] bg-[#0E1729] rounded-full absolute"></div>
                    <div className="relative z-10 text-center">
                      <b className="font-bricolage text-[24px] block leading-none">84%</b>
                      <span className="text-[11px] text-[#5C6B8C]">utilização</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 flex-1 text-[13.5px]">
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded border border-transparent bg-[#5CF2C8]"></span> Alugados <b className="ml-auto font-mono text-[#EAF0FF]">28</b></div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded border border-transparent bg-[#F5B948]"></span> Disponíveis <b className="ml-auto font-mono text-[#EAF0FF]">7</b></div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded border border-transparent bg-[#7C8CF8]"></span> Em instalação <b className="ml-auto font-mono text-[#EAF0FF]">5</b></div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded border border-transparent bg-[#101B31]"></span> Manutenção <b className="ml-auto font-mono text-[#EAF0FF]">5</b></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-[#0E1729] border border-line rounded-2xl overflow-hidden pt-6">
              <div className="flex justify-between items-start px-6 mb-5">
                <div>
                  <h3 className="text-[17px] font-bold font-bricolage mb-1">Clientes recentes</h3>
                  <div className="text-[#5C6B8C] text-[12.5px]">Últimas subscrições e estado</div>
                </div>
                <button className="text-[#5CF2C8] text-[13px] font-semibold hover:underline">Ver todos →</button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="font-mono text-[11px] tracking-wider uppercase text-[#5C6B8C] font-medium p-4 border-b border-line pl-6">Cliente</th>
                      <th className="font-mono text-[11px] tracking-wider uppercase text-[#5C6B8C] font-medium p-4 border-b border-line">Plano</th>
                      <th className="font-mono text-[11px] tracking-wider uppercase text-[#5C6B8C] font-medium p-4 border-b border-line">Localização</th>
                      <th className="font-mono text-[11px] tracking-wider uppercase text-[#5C6B8C] font-medium p-4 border-b border-line">Mensalidade</th>
                      <th className="font-mono text-[11px] tracking-wider uppercase text-[#5C6B8C] font-medium p-4 border-b border-line">Estado</th>
                      <th className="border-b border-line pr-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardClients.map((c, i) => (
                      <tr key={i} className="hover:bg-[#0C1426] transition-colors border-b border-line last:border-0">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <span className={clsx("w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[13px] text-[#070B16] shrink-0", AV_COLORS[i % AV_COLORS.length])}>
                              {getInitials(c.n)}
                            </span>
                            <b className="font-semibold text-sm text-[#EAF0FF]">{c.n}</b>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-[#93A1C4]">{c.p}</td>
                        <td className="p-4 text-sm text-[#93A1C4]">{c.loc}</td>
                        <td className="p-4 text-sm"><b className="font-semibold text-[#EAF0FF]">{c.m}</b> <span className="text-[#93A1C4]">MT</span></td>
                        <td className="p-4">
                          <span className={clsx(
                            "inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full",
                            c.st === "ok" ? "bg-[#5CF2C8]/10 text-[#5CF2C8]" : 
                            c.st === "warn" ? "bg-[#F5B948]/10 text-[#F5B948]" : "bg-[#7C8CF8]/10 text-[#7C8CF8]"
                          )}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {c.stl}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <button className="text-[#5C6B8C] hover:text-[#EAF0FF] p-1.5 rounded-lg hover:bg-[#101B31] transition-colors">⋯</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeView !== "dash" && (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-2xl bg-[#0E1729] border border-line flex items-center justify-center text-[#5CF2C8] mb-4">
              {views.find(v => v.id === activeView)?.icon({ size: 32 })}
            </div>
            <h2 className="text-xl font-bold font-bricolage mb-2">Visão {views.find(v => v.id === activeView)?.label}</h2>
            <p className="text-[#5C6B8C] text-sm">Este módulo está atualmente em desenvolvimento exclusivo para o portal de gestão.</p>
          </div>
        )}
      </main>
    </div>
  );
}
