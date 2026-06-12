# Painel de Gestão — Intime Starlink

Gestão para editar **preços, planos e contactos** do site e **gerir membros** (administradores),
usando o mesmo projeto Firebase do INTIME ASSIST (`zuma-1fec6`).

## Como aceder
- Site: `/` (público) · Antenas: `/antenas`
- **Gestão:** `/admin/login` → entrar com Google → `/admin`

O **admin principal** é `zelio.a.chirindza@gmail.com` (sempre tem acesso e é o único que gere membros).
Outros administradores são guardados na coleção **`starlinkAdmins`** (separada do INTIME ASSIST,
para um membro daqui NÃO ficar admin do outro site).

## 1. Regras do Firestore (obrigatório)
No [Firebase Console](https://console.firebase.google.com/) → projeto **zuma-1fec6** → Firestore →
separador **Regras**, acrescente estes blocos (dentro de `match /databases/{database}/documents { ... }`):

```
// Configuração pública do site Starlink (preços, contactos) — leitura pública, escrita só admin
match /siteConfig/{document} {
  allow read: if true;
  allow write: if request.auth != null && (
    request.auth.token.email == 'zelio.a.chirindza@gmail.com' ||
    exists(/databases/$(database)/documents/starlinkAdmins/$(request.auth.token.email))
  );
}

// Administradores do site Starlink — só o admin principal gere
match /starlinkAdmins/{email} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.token.email == 'zelio.a.chirindza@gmail.com';
}

// Pedidos de instalação (formulário público) — qualquer um cria; só admin lê/gere
match /inscricoes/{id} {
  allow create: if true;
  allow read, update, delete: if request.auth != null && (
    request.auth.token.email == 'zelio.a.chirindza@gmail.com' ||
    exists(/databases/$(database)/documents/starlinkAdmins/$(request.auth.token.email))
  );
}

// Mensagens de contacto (formulário público) — qualquer um cria; só admin lê/gere
match /mensagens/{id} {
  allow create: if true;
  allow read, update, delete: if request.auth != null && (
    request.auth.token.email == 'zelio.a.chirindza@gmail.com' ||
    exists(/databases/$(database)/documents/starlinkAdmins/$(request.auth.token.email))
  );
}
```

Clique em **Publicar**. (Enquanto não publicar, o site funciona com os valores por omissão,
mas **guardar na gestão dará erro**.)

## 2. Domínios autorizados (Auth)
Firebase Console → **Authentication** → **Settings** → **Authorized domains** → confirme que tem:
- `localhost` (para desenvolvimento)
- o domínio do deploy (ex.: `intime.onrender.com`) quando publicar

## 3. Usar
1. Entre em `/admin/login` com a conta principal.
2. Edite **Contactos**, **Preço em destaque** e **Planos** → **Guardar**.
3. Em **Membros**, adicione o email Google de outros colaboradores (só o principal pode).
4. O site público atualiza-se automaticamente (em tempo real).

> Os valores por omissão estão em `src/useSiteConfig.ts`. Se nada estiver guardado no Firestore,
> é isso que aparece — o site nunca fica vazio.
