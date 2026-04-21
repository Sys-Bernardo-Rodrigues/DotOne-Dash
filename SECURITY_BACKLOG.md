# Backlog de Segurança (My Dot Growth)

Este documento registra melhorias de segurança identificadas para execução futura.

## Prioridade Alta

### 1) Proteger rota pública de dashboard por ID
- **Problema:** `GET /api/clients/:id/dashboard` está sem autenticação/autorização.
- **Risco:** vazamento de dados por enumeração de IDs.
- **Ação:**
  - Exigir `authAdmin`.
  - Aplicar autorização por cliente (slug/id) conforme perfil.
  - Se rota legada não for necessária, remover.
- **Critério de aceite:**
  - Requisição sem token retorna `401`.
  - Requisição com token sem permissão retorna `403`.
  - Apenas usuários autorizados acessam dados do cliente.

### 2) Eliminar defaults inseguros em produção
- **Problema:** fallback de segredo JWT e senha admin padrão.
- **Risco:** comprometimento total da autenticação em caso de má configuração.
- **Ação:**
  - Em `NODE_ENV=production`, falhar startup se:
    - `JWT_SECRET` ausente/fraco.
    - `ADMIN_PASSWORD` ausente/fraco.
  - Definir política mínima de força para segredos (tamanho e aleatoriedade).
- **Critério de aceite:**
  - API não inicia em produção com credenciais inseguras.
  - Logs orientam claramente o ajuste necessário.

## Prioridade Média

### 3) Mitigar brute force no login
- **Problema:** `POST /api/auth/login` sem rate limit/lockout.
- **Risco:** tentativa massiva de senha (credential stuffing).
- **Ação:**
  - Implementar rate limit por IP (curto prazo).
  - Adicionar rate limit por e-mail/identidade (médio prazo).
  - Registrar tentativas e respostas `401/429`.
- **Critério de aceite:**
  - Após limite, endpoint retorna `429`.
  - Logs permitem rastrear abuso.

### 4) Endurecer headers HTTP e CORS
- **Problema:** hardening incompleto de headers de segurança.
- **Risco:** maior superfície para ataques de navegador.
- **Ação:**
  - Adicionar `helmet` com configuração revisada.
  - Revisar CORS por ambiente (origens explícitas, métodos e headers mínimos).
- **Critério de aceite:**
  - Headers de segurança presentes nas respostas.
  - Apenas origens permitidas acessam a API.

### 5) Revisar estratégia de armazenamento de token
- **Problema:** JWT em `localStorage`.
- **Risco:** maior impacto em caso de XSS.
- **Ação (evolutiva):**
  - Avaliar migração para cookie `HttpOnly` + `Secure` + `SameSite`.
  - Caso mantenha `localStorage`, reforçar CSP e auditoria de XSS.
- **Critério de aceite:**
  - Decisão arquitetural registrada.
  - Controles compensatórios implementados.

## Prioridade Baixa (mas recomendada)

### 6) Auditoria e observabilidade de segurança
- **Ação:**
  - Padronizar logs de autenticação/autorização (sem dados sensíveis).
  - Criar alertas para picos de `401`, `403`, `429`.
  - Definir retenção e revisão periódica.

### 7) Testes automatizados de autorização
- **Ação:**
  - Testes para matriz de permissões por perfil e por cliente.
  - Casos negativos (sem token, token inválido, slug sem acesso).
- **Critério de aceite:**
  - Suite falha ao introduzir regressão de acesso.

## Plano sugerido de execução

1. Fechar rota pública por ID.
2. Fail-fast de segredos em produção.
3. Rate limit no login.
4. Helmet + revisão CORS.
5. Revisão de estratégia de token.

## Checklist de conclusão

- [ ] Rota `/api/clients/:id/dashboard` protegida ou removida.
- [ ] Startup bloqueia produção sem segredos fortes.
- [ ] Rate limit ativo em `/api/auth/login`.
- [ ] Headers de segurança e CORS revisados.
- [ ] Estratégia de token formalmente definida e aplicada.
- [ ] Testes de autorização cobrindo cenários críticos.

