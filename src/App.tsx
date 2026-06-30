import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Analytics from './Analytics';
import Home from './pages/Home';
import ComoFunciona from './pages/ComoFunciona';
import Sobre from './pages/Sobre';
import Contacto from './pages/Contacto';
import Aderir from './pages/Aderir';
import Conta from './pages/Conta';
import PromotorLink from './pages/PromotorLink';
import SejaPromotor from './pages/SejaPromotor';

import Login from './admin/Login';
import AdminLayout from './admin/AdminLayout';
import Painel from './admin/Painel';
import InboxLayout from './admin/InboxLayout';
import ConfigLayout from './admin/ConfigLayout';
import Pedidos from './admin/Pedidos';
import Mensagens from './admin/Mensagens';
import Pacotes from './admin/Pacotes';
import Contactos from './admin/Contactos';
import Frases from './admin/Frases';
import Contrato from './admin/Contrato';
import Membros from './admin/Membros';
import Promotores from './admin/Promotores';
import Pagamentos from './admin/Pagamentos';
import Transacoes from './admin/Transacoes';
import MensalidadesStarlink from './admin/MensalidadesStarlink';
import Clientes from './admin/Clientes';
import Starlinks from './admin/Starlinks';
import Historico from './admin/Historico';
import Contratos from './admin/Contratos';

export default function App() {
  return (
    <BrowserRouter>
      <Analytics />
      <Routes>
        {/* Site público */}
        <Route path="/" element={<Home />} />
        <Route path="/como-funciona" element={<ComoFunciona />} />
        <Route path="/sobre" element={<Sobre />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/aderir" element={<Aderir />} />
        <Route path="/conta" element={<Conta />} />
        <Route path="/promotor" element={<Conta />} />
        <Route path="/seja-promotor" element={<SejaPromotor />} />
        <Route path="/p/:codigo" element={<PromotorLink />} />

        {/* Gestão */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Painel />} />
          <Route path="solicitacoes" element={<InboxLayout />}>
            <Route index element={<Pedidos />} />
            <Route path="mensagens" element={<Mensagens />} />
          </Route>
          <Route path="clientes" element={<Clientes />} />
          <Route path="starlinks" element={<Starlinks />} />
          <Route path="historico" element={<Historico />} />
          <Route path="contratos" element={<Contratos />} />
          <Route path="transacoes" element={<Transacoes />} />
          <Route path="starlink" element={<MensalidadesStarlink />} />
          <Route path="config" element={<ConfigLayout />}>
            <Route index element={<Pacotes />} />
            <Route path="contactos" element={<Contactos />} />
            <Route path="pagamentos" element={<Pagamentos />} />
            <Route path="frases" element={<Frases />} />
            <Route path="contrato" element={<Contrato />} />
            <Route path="promotores" element={<Promotores />} />
            <Route path="membros" element={<Membros />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
