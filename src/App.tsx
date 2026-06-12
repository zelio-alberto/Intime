import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ComoFunciona from './pages/ComoFunciona';
import Sobre from './pages/Sobre';
import Contacto from './pages/Contacto';
import Aderir from './pages/Aderir';
import Login from './admin/Login';
import Admin from './admin/Admin';
import Pedidos from './admin/Pedidos';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/como-funciona" element={<ComoFunciona />} />
        <Route path="/sobre" element={<Sobre />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/aderir" element={<Aderir />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/pedidos" element={<Pedidos />} />
      </Routes>
    </BrowserRouter>
  );
}
