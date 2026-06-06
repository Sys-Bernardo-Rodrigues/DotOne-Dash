# Deploy no Painel ICP (Integrator Host)

Guia de publicação do **Cronograma Flesak** usando o **Painel de Controle ICP do Integrator Host**.

Este documento foca no cenário comum de hospedagem com:

- aplicação Node.js (backend em `127.0.0.1:4000`)
- build estático do frontend (`dist`)
- domínio próprio com SSL
- banco MongoDB externo (Atlas ou VPS dedicada)

---

## 1) Pré-requisitos

Antes de iniciar, tenha em mãos:

- acesso ao Painel ICP da Integrator Host
- domínio/subdomínio configurado (ex.: `app.seudominio.com`)
- acesso FTP/SFTP ou Gerenciador de Arquivos do painel
- credenciais do MongoDB de produção
- segredos fortes para JWT e admin

---

## 2) Estrutura recomendada no servidor

No painel, organize os arquivos desta forma:

```txt
app/
├── current/                 # código da aplicação
│   ├── dist/                # build frontend
│   ├── server/              # API Node
│   ├── package.json
│   └── ...
├── shared/
│   └── env/
│       ├── frontend.env
│       └── backend.env
```

> Se o painel ICP não suportar essa estrutura, use o padrão dele, mantendo o princípio: separar código e variáveis sensíveis.

---

## 3) Preparar o projeto localmente

Na sua máquina:

```bash
npm install
npm --prefix server install
npm run build
```

Isso gera o frontend em `dist/`.

---

## 4) Configurar variáveis de ambiente (produção)

### 4.1 Frontend (`.env` local antes do build)

> No ICP, prefira URL relativa para evitar erro de CORS e facilitar proxy reverso.

```env
VITE_API_URL=/api
VITE_HTTPS=false
VITE_SSL_CERT_FILE=
VITE_SSL_KEY_FILE=
```

Depois de alterar, rode novamente:

```bash
npm run build
```

### 4.2 Backend (`server/.env` no host)

```env
PORT=4000
CLIENT_ORIGIN=https://app.seudominio.com
ENABLE_HTTPS=false
SSL_CERT_FILE=
SSL_KEY_FILE=
MONGODB_URI=mongodb+srv://USUARIO:SENHA@cluster.mongodb.net/mydotgrowth?retryWrites=true&w=majority
JWT_SECRET=GERAR_UM_SEGREDO_FORTE_24+_CHARS
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@seudominio.com
ADMIN_PASSWORD=GERAR_UMA_SENHA_FORTE_24+_CHARS
```

**Importante:**

- em produção, o sistema bloqueia inicialização com segredos fracos
- nunca publique `.env` no Git

---

## 5) Publicar arquivos no Integrator Host

Publique para o diretório da aplicação:

- pasta `dist/`
- pasta `server/`
- `package.json` da raiz
- `server/package.json`
- arquivos de suporte (ex.: `public/`, se usado)

No painel, execute instalação de dependências:

- raiz: `npm install`
- backend: `npm --prefix server install`

> Se o ICP tiver tela de “Node.js App”, normalmente ela já instala dependências ao salvar/configurar a aplicação.

---

## 6) Configurar aplicação Node no Painel ICP

No módulo de Node.js do painel:

- **Application root**: pasta do projeto (ex.: `app/current`)
- **Startup file**: `server/src/index.js`
- **Node version**: 20+ (recomendado)
- **Environment**: `production`

Adicione as variáveis do `server/.env` na seção de Environment Variables do painel (se disponível).

Depois:

- clique em **Restart / Start App**
- confira logs no visualizador do ICP

---

## 7) Configurar domínio e proxy reverso

No ICP, faça o domínio apontar para o frontend e roteie `/api` para o Node.

Regra esperada:

- `https://app.seudominio.com/*` -> arquivos estáticos (`dist`)
- `https://app.seudominio.com/api/*` -> backend Node (`127.0.0.1:4000`)

Se o painel pedir regra manual de rewrite/proxy, use o equivalente a:

```txt
/api  -> http://127.0.0.1:4000/api
/*    -> /dist/index.html (SPA fallback)
```

---

## 8) SSL no Integrator Host

No ICP:

- ative SSL para o domínio/subdomínio
- force redirecionamento HTTP -> HTTPS

Após ativação, valide:

- `https://app.seudominio.com`
- `https://app.seudominio.com/api/health`

---

## 9) Checklist de validação pós-deploy

- [ ] login carrega sem erro
- [ ] rotas internas funcionam (`/:clientSlug/...`)
- [ ] API responde em `/api/health`
- [ ] `curl -i http://127.0.0.1:4000/api/health` retorna `200`
- [ ] `curl -i http://127.0.0.1:8080/api/health` retorna `200` (quando em teste local com Nginx)
- [ ] sem erro de CORS no navegador
- [ ] SSL ativo e válido
- [ ] criação/edição de dados funcionando

---

## 10) Rotina de atualização (novo deploy)

1. atualizar código local
2. ajustar `.env` se necessário
3. rodar `npm run build`
4. enviar arquivos atualizados ao host
5. instalar dependências (se mudou `package.json`)
6. reiniciar aplicação Node no ICP
7. validar app e API em produção

---

## 11) Troubleshooting (ICP)

### Erro 502/503 no `/api`

- app Node parada no painel
- startup file incorreto
- porta diferente de `PORT`
- erro em variável obrigatória

### Front abre, mas login falha

- `VITE_API_URL` incorreta no build (use `/api`)
- `CLIENT_ORIGIN` diferente do domínio final
- CORS bloqueando origem

### Tela branca após deploy

- faltou fallback SPA para `index.html`
- build antigo em cache
- arquivo `dist` incompleto

### Nginx não inicia com `bind() ... 0.0.0.0:80 failed (98: Address already in use)`

- no ICP, normalmente a porta 80 já está em uso por `openresty`
- valide com `sudo ss -ltnp | grep ':80'`
- não tente iniciar outro webserver na mesma porta
- se for só teste técnico, use Nginx em `8080`

### Nginx inicia, mas retorna `500 Internal Server Error`

- geralmente permissões/caminho do `root` incorretos
- evite servir frontend de `/root/...`
- use caminho como `/var/www/mydotgrowth`
- ajuste permissões para leitura do `www-data`

### API não inicia em produção

- `JWT_SECRET`/`ADMIN_PASSWORD` fracos ou ausentes
- `MONGODB_URI` inválida

---

## 12) Hardening recomendado para produção

- trocar todas credenciais padrão
- usar MongoDB com IP allowlist e usuário restrito
- backup automático do banco
- acompanhar logs de erro e autenticação
- revisar periodicamente `SECURITY_BACKLOG.md`

---

## Observação sobre o painel ICP

Interfaces do Integrator Host podem variar por plano/versão. Se algum nome de menu estiver diferente, siga o conceito equivalente:

- Node App / Application Manager
- Domain / SSL
- Reverse Proxy / Rewrite
- Logs

## Nota prática do ambiente ICP

- Em muitos servidores ICP, o serviço padrão é `openresty` na porta `80`.
- Nesse cenário:
  - mantenha o serviço padrão do painel para domínio/SSL
  - mantenha sua API Node no PM2 (`127.0.0.1:4000`)
  - use proxy `/api` apontando para a API
  - use `VITE_API_URL=/api` no build do frontend

Se quiser, eu também posso criar uma versão 100% “copiar e colar” com os nomes exatos dos campos do seu painel (com base em prints).
