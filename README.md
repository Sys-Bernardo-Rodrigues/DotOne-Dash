# Cronograma Flesak

Sistema web para gestão de clientes, plano de ação, investimentos, campanhas de marketing, KPIs e dashboard de performance.

## Visão Geral

O projeto é dividido em duas partes:

- `frontend` em React + Vite (pasta raiz)
- `backend` em Node.js + Express + MongoDB (pasta `server`)

Principais módulos do sistema:

- autenticação e controle de acesso por perfil
- gestão de clientes e usuários (área `/adm`)
- plano de ação (5W2H), cronograma, responsáveis e relatórios
- investimentos
- campanhas de marketing (com ROI)
- KPIs de marketing
- dashboard de performance consolidada

## Stack Tecnológica

- Frontend: React 19, React Router, Vite 8
- Backend: Node.js, Express, Mongoose, JWT, bcrypt
- Banco de dados: MongoDB
- Segurança: `helmet`, `cors` restritivo, `express-rate-limit`

## Pré-requisitos

- Node.js 20+ (recomendado)
- npm 10+
- Docker e Docker Compose (recomendado para subir MongoDB local)

## Estrutura do Projeto

```txt
.
├── src/                  # Frontend React
├── server/
│   └── src/              # API Express
├── docker-compose.yml    # MongoDB + mongo-express
├── .env.example          # Variáveis do frontend
└── server/.env.example   # Variáveis da API
```

## Tutorial de Iniciação (Ambiente Local)

### 1) Instalar dependências

Na raiz do projeto:

```bash
npm install
npm --prefix server install
```

### 2) Subir MongoDB com Docker

```bash
docker compose up -d
```

Serviços padrão:

- MongoDB: `localhost:27017`
- Mongo Express: `http://localhost:8081`

### 3) Configurar variáveis de ambiente

Crie os arquivos de ambiente com base nos exemplos:

```bash
cp .env.example .env
cp server/.env.example server/.env
```

#### Frontend (`.env`)

```env
VITE_API_URL=http://localhost:4000/api
VITE_HTTPS=false
VITE_SSL_CERT_FILE=
VITE_SSL_KEY_FILE=
```

#### Backend (`server/.env`)

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
ENABLE_HTTPS=false
SSL_CERT_FILE=
SSL_KEY_FILE=
MONGODB_URI=mongodb://admin:admin123@localhost:27017/mydotgrowth?authSource=admin
JWT_SECRET=Troque-por-chave-secreta-forte-complexa-123!
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@mydotgrowth.local
ADMIN_PASSWORD=Troque-por-senha-forte-complexa-123!
```

### 4) Iniciar a API

```bash
npm run api:dev
```

### 5) Iniciar o frontend

Em outro terminal:

```bash
npm run dev
```

### 6) Acessar o sistema

- App: `http://localhost:5173`
- Login: `http://localhost:5173/login`

## Scripts Disponíveis

### Raiz (frontend)

- `npm run dev` — inicia frontend em desenvolvimento
- `npm run build` — gera build de produção do frontend
- `npm run preview` — visualiza build gerado
- `npm run api:dev` — inicia backend em modo watch

### `server` (backend)

- `npm --prefix server run dev` — API em modo watch
- `npm --prefix server run start` — API em modo normal

## HTTPS (Frontend e Backend)

O projeto já suporta HTTPS opcional.

### Backend HTTPS

No `server/.env`:

```env
ENABLE_HTTPS=true
SSL_CERT_FILE=/caminho/para/cert.pem
SSL_KEY_FILE=/caminho/para/key.pem
CLIENT_ORIGIN=https://localhost:5173
```

### Frontend HTTPS

No `.env`:

```env
VITE_HTTPS=true
VITE_SSL_CERT_FILE=/caminho/para/cert.pem
VITE_SSL_KEY_FILE=/caminho/para/key.pem
VITE_API_URL=https://localhost:4000/api
```

> Se `VITE_HTTPS=true`, o Vite exige os caminhos do certificado e da chave.

## Segurança

Implementações atuais:

- proteção de rotas com JWT (`authAdmin`)
- autorização por cliente/slug e perfil
- rate limit no endpoint de login
- headers de segurança com `helmet`
- CORS com origens permitidas explícitas
- fail-fast em produção para segredos inseguros (`JWT_SECRET` e `ADMIN_PASSWORD`)

Backlog de hardening adicional:

- ver `SECURITY_BACKLOG.md`

## Rotas Principais da Aplicação

- `/login`
- `/adm` (admin completo)
- `/adm/home` (seleção de clientes para usuários multi-cliente)
- `/:clientSlug` (visão geral)
- `/:clientSlug/plano-de-acao`
- `/:clientSlug/cronograma`
- `/:clientSlug/por-area`
- `/:clientSlug/responsaveis`
- `/:clientSlug/relatorios`
- `/:clientSlug/investimentos`
- `/:clientSlug/campanhas-marketing`
- `/:clientSlug/kpis`
- `/:clientSlug/dashboard-performance`
- `/:clientSlug/configuracao`

## Build e Validação

Para validar frontend:

```bash
npm run build
```

Para validação rápida de sintaxe do backend:

```bash
node --check server/src/index.js
node --check server/src/auth.js
```

## Troubleshooting

- Porta 4000 em uso:
  - finalize processo anterior da API ou troque `PORT` no `server/.env`
- Front não conecta na API:
  - confirme `VITE_API_URL` e `CLIENT_ORIGIN`
- Erro de CORS:
  - ajuste `CLIENT_ORIGIN` para a origem real do frontend
- Erro de HTTPS:
  - verifique paths de `SSL_CERT_FILE`/`SSL_KEY_FILE` e permissões de leitura
- Erro de conexão com banco:
  - confirme se `docker compose up -d` está ativo e `MONGODB_URI` está correto

## Observações

- Nunca versionar arquivos `.env` reais.
- Em produção, utilize segredos fortes e exclusivos.
- Recomenda-se usar proxy reverso (Nginx/Caddy) com TLS em ambientes públicos.

