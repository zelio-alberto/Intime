# Firestore — pedidos de instalação (`inscricoes`) no portal único

Para o **lead** poder entrar em `/conta` e **ver o estado do seu pedido**, é preciso publicar
(na Consola Firebase → Firestore → **Regras**) o bloco abaixo, e criar **1 índice composto**.

O portal único (`Conta.tsx`) faz esta query:
```js
query(collection(db,"inscricoes"), where("email","==", emailDoGoogle), orderBy("createdAt","desc"), limit(1))
```
E o `/aderir` passou a gravar em cada pedido: `email` (minúsculas) + `uid` do Google.

---

## 1) Regras — bloco `inscricoes`

> Junta este bloco ao conjunto de regras que já tens publicado (não apagues os outros).
> Se já tiveres uma função `isAdmin()`, usa a tua e ignora a daqui.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Admin = email principal OU consta em starlinkAdmins/{email}
    // (igual ao que a app web usa em useAdminAuth.ts)
    function isAdmin() {
      return request.auth != null && (
        request.auth.token.email == "zelio.a.chirindza@gmail.com" ||
        exists(/databases/$(database)/documents/starlinkAdmins/$(request.auth.token.email))
      );
    }

    match /inscricoes/{id} {
      // Qualquer visitante pode pedir instalação (site web e app do cliente).
      // Mantemos aberto para não partir a adesão; o email/uid são gravados quando há login.
      allow create: if true;

      // O lead lê os SEUS próprios pedidos (a query filtra por email == email autenticado).
      // O admin lê todos, muda o estado e elimina.
      allow read: if isAdmin() ||
        ( request.auth != null
          && request.auth.token.email != null
          && resource.data.email == request.auth.token.email.lower() );
      allow update, delete: if isAdmin();
    }

    // ... (resto das tuas regras: clientes, pagamentos, portalContas, promotores, etc.)
  }
}
```

**Notas**
- `create: if true` mantém o comportamento atual (qualquer um pode submeter um pedido). Se um dia
  quiseres apertar, troca por `if request.auth != null` (mas confirma que a app do cliente também
  autentica ao gravar `inscricoes`, senão parte a adesão nativa).
- Pedidos **antigos sem `email`** ficam invisíveis para leads (só o admin os vê) — esperado.

---

## 2) Índice composto (obrigatório para a query do lead)

Consola Firebase → Firestore → **Índices** → *Criar índice composto*:

| Coleção | Campo 1 | Campo 2 |
|---|---|---|
| `inscricoes` | `email` — **Ascendente** | `createdAt` — **Descendente** |

Alternativa rápida: abre o `/conta` autenticado com Google (sem ser cliente) uma vez — a query
falha e a consola mostra no erro um **link direto** para criar este índice com 1 clique.

Equivalente em `firestore.indexes.json` (se usares o Firebase CLI):
```json
{
  "indexes": [
    {
      "collectionGroup": "inscricoes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "email", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## Resumo do que muda para o utilizador
- No **/aderir**, antes de enviar, a pessoa faz **“Entrar com Google”** → o pedido fica ligado a ela
  e passamos a ter o **email** (que antes não tínhamos).
- Depois, em **“Entrar”** (`/conta`), enquanto não tem Starlink, vê a **linha de estado do pedido**
  (novo → contactado → concluído), que o admin atualiza em **/admin → Pedidos**.
