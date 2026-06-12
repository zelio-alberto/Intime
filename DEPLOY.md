# Publicar a Intime no Render (grátis)

Site estático React + Vite. O Render faz o build e serve o `dist/`.

## 1. Enviar o código para o GitHub
No terminal, dentro desta pasta:

```bash
git init
git add .
git commit -m "Site Intime"
git branch -M main
# cria um repositório vazio em github.com (ex: intime-site) e cola o URL:
git remote add origin https://github.com/SEU-UTILIZADOR/intime-site.git
git push -u origin main
```

## 2. Criar o site no Render
1. Entra em https://render.com e liga a tua conta GitHub.
2. **New +** → **Static Site** → escolhe o repositório.
3. Configuração (ou o Render lê o `render.yaml` automaticamente):
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. **Create Static Site**. Em ~2 min fica online num link `https://intime.onrender.com` (ou o nome que escolheres).

> O `render.yaml` já inclui a regra de reescrita (todas as rotas → `index.html`),
> necessária para o React Router (`/admin`, `/aderir`, etc.) funcionar.

## 3. Firebase — 2 passos obrigatórios
1. **Domínios autorizados (login):** Firebase Console → projeto `zuma-1fec6` →
   **Authentication → Settings → Authorized domains** → **Add domain** →
   `intime.onrender.com` (e o teu domínio próprio, se tiveres).
2. **Regras do Firestore:** publica as regras do ficheiro `SETUP-ADMIN.md`
   (coleções `siteConfig`, `starlinkAdmins`, `inscricoes`, `mensagens`).
   Sem isto, a gestão e os formulários não guardam dados.

## 4. Domínio próprio (opcional)
Render → o teu site → **Settings → Custom Domains** → adiciona `intime.co.mz`
e segue as instruções de DNS. Depois adiciona também esse domínio aos
**Authorized domains** do Firebase.

## Atualizações futuras
Cada `git push` para `main` faz o Render reconstruir e publicar automaticamente.
