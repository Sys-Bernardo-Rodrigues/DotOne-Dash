# Deploy em Produção (VPS/Linux)

Guia de deploy do sistema **Cronograma Flesak** em servidor Linux tradicional (sem painel ICP), com:

- frontend (Vite build servido por Nginx)
- backend Node.js (PM2)
- MongoDB (Docker Compose)
- HTTPS com Let's Encrypt

## 1) Pré-requisitos do Servidor

- Ubuntu 22.04+ (recomendado)
- domínio apontado para o IP da VPS (ex.: `app.seudominio.com`)
- usuário com `sudo`
- portas liberadas no firewall: `22`, `80`, `443`

## 2) Instalar dependências do sistema

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx certbot python3-certbot-nginx
```

### Node.js 20+

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

### PM2

```bash
sudo npm install -g pm2
pm2 -v
```

### Docker + Docker Compose plugin

```bash
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
```

> Faça logout/login para aplicar o grupo `docker`.

## 3) Publicar o projeto no servidor

```bash
mkdir -p ~/apps
cd ~/apps
git clone <URL_DO_REPOSITORIO> mydotgrowth
cd mydotgrowth
```

Instalar dependências:

```bash
npm install
npm --prefix server install
```

## 4) Configurar variáveis de ambiente (produção)

Crie os arquivos:

```bash
cp .env.example .env
cp server/.env.example server/.env
```

### `.env` (frontend)

Recomendado para produção atrás do mesmo domínio/proxy:

```env
VITE_API_URL=/api
VITE_HTTPS=false
VITE_SSL_CERT_FILE=
VITE_SSL_KEY_FILE=
```

### `server/.env` (backend)

Exemplo recomendado para produção:

```env
PORT=4000
CLIENT_ORIGIN=https://app.seudominio.com
ENABLE_HTTPS=false
SSL_CERT_FILE=
SSL_KEY_FILE=
MONGODB_URI=mongodb://USUARIO_APP:SENHA_FORTE@127.0.0.1:27017/mydotgrowth?authSource=admin
JWT_SECRET=GERAR_UM_SEGREDO_MUITO_FORTE_COM_24+_CARACTERES
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@seudominio.com
ADMIN_PASSWORD=GERAR_UMA_SENHA_MUITO_FORTE_COM_24+_CARACTERES
```

## 5) Banco de dados (MongoDB via Docker)

O `docker-compose.yml` já sobe `mongodb` e `mongo-express`.

> **Importante:** antes de subir em produção, altere credenciais padrão em `docker-compose.yml`.

Subir banco:

```bash
docker compose up -d
docker compose ps
```

## 6) Build do frontend

```bash
npm run build
```

Isso gera a pasta `dist/`.

## 7) Subir backend com PM2

```bash
pm2 start server/src/index.js --name mydotgrowth-api
pm2 save
pm2 startup
```

Ver logs:

```bash
pm2 logs mydotgrowth-api
```

## 8) Configurar Nginx (frontend + proxy API)

Crie o arquivo:

```bash
sudo nano /etc/nginx/sites-available/mydotgrowth
```

Conteúdo:

```nginx
server {
    listen 80;
    server_name mydotgrowth.zroot.com.br;

    root /var/www/mydotgrowth;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ativar site:

```bash
sudo ln -s /etc/nginx/sites-available/mydotgrowth /etc/nginx/sites-enabled/mydotgrowth
sudo nginx -t
sudo systemctl restart nginx
```

## 9) Habilitar SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d app.seudominio.com
```

Testar renovação automática:

```bash
sudo certbot renew --dry-run
```

## 10) Checklist de segurança (obrigatório)

- [ ] Credenciais padrão removidas (`admin123`, etc.)
- [ ] `JWT_SECRET` forte e único
- [ ] `ADMIN_PASSWORD` forte e único
- [ ] `CLIENT_ORIGIN` apontando para domínio HTTPS real
- [ ] MongoDB não exposto publicamente (porta fechada externamente)
- [ ] Firewall ativo (`ufw`) com apenas 22/80/443
- [ ] Backups do MongoDB configurados
- [ ] Logs e monitoramento ativos (`pm2 logs`, Nginx logs)

## 11) Atualização de versão (deploy contínuo manual)

```bash
cd ~/apps/mydotgrowth
git pull
npm install
npm --prefix server install
npm run build
sudo rsync -av --delete dist/ /var/www/mydotgrowth/
pm2 restart mydotgrowth-api --update-env
sudo systemctl restart nginx
```

## 12) Comandos úteis de operação

- Status da API: `pm2 status`
- Reiniciar API: `pm2 restart mydotgrowth-api --update-env`
- Ver logs API: `pm2 logs mydotgrowth-api`
- Status Nginx: `sudo systemctl status nginx`
- Recarregar Nginx: `sudo systemctl reload nginx`
- Containers Mongo: `docker compose ps`

## 13) Troubleshooting rápido

- `502 Bad Gateway` no Nginx:
  - API não subiu ou porta diferente de `4000`
  - validar `pm2 logs mydotgrowth-api`
- Front mostra "Falha de rede":
  - usar `VITE_API_URL=/api` e gerar build novamente
  - validar `curl -i http://127.0.0.1:4000/api/health`
  - validar `curl -i http://127.0.0.1/api/health` (quando usar 80) ou `:8080/api/health` no teste local
- Front abre branco:
  - faltou `npm run build` após alteração de código
  - conferir se `dist/` está atualizado
- CORS bloqueando:
  - revisar `CLIENT_ORIGIN` no `server/.env`
- Nginx não sobe com `bind() ... :80 failed (98: Address already in use)`:
  - outra aplicação já ocupa a porta 80
  - verificar com `sudo ss -ltnp | grep ':80'`
  - não rodar dois webservers na mesma porta
- Nginx retorna 500 ao servir frontend:
  - evitar servir arquivos de `/root/...`
  - mover `dist` para `/var/www/mydotgrowth` e ajustar permissões
- Falha no login em produção:
  - verificar variáveis obrigatórias e força de segredos

---

Se quiser, no próximo passo eu já deixo um `ecosystem.config.cjs` do PM2 pronto para este projeto.
