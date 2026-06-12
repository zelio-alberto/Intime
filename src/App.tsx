import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ComoFunciona from './pages/ComoFunciona';
import Sobre from './pages/Sobre';
import Contacto from './pages/Contacto';
import Aderir from './pages/Aderir';

import Login from './admin/Login';
import AdminLayout from './admin/AdminLayout';
import Painel from './admin/Painel';
import Pedidos from './admin/Pedidos';
import Mensagens from './admin/Mensagens';
import Pacotes from './admin/Pacotes';
import Contactos from './admin/Contactos';
import Contrato from './admin/Contrato';
import Membros from './admin/Membros';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Site público */}
        <Route path="/" element={<Home />} />
        <Route path="/como-funciona" element={<ComoFunciona />} />
        <Route path="/sobre" element={<Sobre />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/aderir" element={<Aderir />} />

        {/* Gestão */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Painel />} />
          <Route path="pedidos" element={<Pedidos />} />
          <Route path="mensagens" element={<Mensagens />} />
          <Route path="planos" element={<Pacotes />} />
          <Route path="contactos" element={<Contactos />} />
          <Route path="contrato" element={<Contrato />} />
          <Route path="membros" element={<Membros />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
