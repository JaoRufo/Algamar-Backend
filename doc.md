# Inventário técnico do Backend e PostgreSQL do Algamar

> Documento de levantamento técnico. Não é a documentação acadêmica final.
> O conteúdo abaixo foi extraído do workspace analisado em 2026-09-29. Quando uma afirmação depende apenas do README, isso é indicado; quando não há evidência no código, a lacuna é marcada explicitamente.

## 1. Escopo, evidências e método

O workspace contém o backend TypeScript/Node.js, a configuração de acesso ao PostgreSQL, a integração HTTP com uma API Python de Machine Learning e scripts locais de operação do PostgreSQL. O frontend e a implementação interna do modelo de Machine Learning não estão neste workspace.

As principais evidências são:

- `src/server.ts`: inicialização, escuta HTTP e encerramento.
- `src/app.ts`: configuração global do Express e rota `/`.
- `src/routes/`: composição das rotas.
- `src/controllers/`: adaptação de requests/responses.
- `src/services/`: regras de negócio, autenticação, saúde e integração ML.
- `src/repositories/user.repository.ts`: acesso SQL à tabela `users`.
- `src/config/database.ts`: pool PostgreSQL, DDL idempotente, índices e conexão.
- `src/config/env.ts` e `.env.example`: configuração por variáveis de ambiente.
- `README.md`: descrição declarativa do projeto; foi confrontado com o código e não substitui a evidência de implementação.
- `package.json` e `package-lock.json`: dependências e versões resolvidas.

Não foram encontrados diretórios ou arquivos separados de `migrations`, `schema`, `seed`, `tests`, `Dockerfile`, `docker-compose`, Postman, OpenAPI/Swagger ou configuração Tailscale.

## 2. Estrutura real do workspace

```text
algamar_backend/
├── .env                         # presente localmente; não versionado e não reproduzido
├── .env.example                 # nomes e valores-modelo de configuração
├── .gitignore
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── start.sh                     # PostgreSQL + npm run dev
├── stop.sh                      # para PostgreSQL
├── status.sh                    # status do PostgreSQL, Node, npm e diretório
├── restart.sh                   # reinicia PostgreSQL e backend em desenvolvimento
├── scripts/
│   ├── db-start.sh
│   ├── db-status.sh
│   ├── db-stop.sh
│   └── db-reset.sh              # apenas mensagem; não executa reset
└── src/
    ├── app.ts                   # aplicação Express
    ├── server.ts                # processo de inicialização
    ├── config/
    │   ├── env.ts               # leitura/normalização de ambiente
    │   └── database.ts          # Pool, conexão e criação do schema
    ├── controllers/
    │   ├── auth.controller.ts
    │   ├── health.controller.ts
    │   └── ml.controller.ts
    ├── entities/
    │   ├── user.entity.ts       # tipos User/PublicUser
    │   └── prediction.entity.ts # tipos ambientais e de ponto enriquecido
    ├── logger/
    │   └── logger.ts             # Pino
    ├── middlewares/
    │   ├── authenticateToken.ts
    │   ├── errorHandler.ts
    │   └── requestLogger.ts
    ├── repositories/
    │   └── user.repository.ts
    ├── routes/
    │   ├── index.ts
    │   ├── auth.routes.ts
    │   └── ml.routes.ts
    └── services/
        ├── auth.service.ts
        ├── health.service.ts
        └── mlPrediction.service.ts
```

### Responsabilidades dos módulos

| Diretório/arquivo | Responsabilidade comprovada | Relações principais |
|---|---|---|
| `src/app.ts` | Cria o Express, registra CORS, parsers, logger de requests, rota raiz, `/api` e handler de erro. | Importa rotas, autenticação, logging e erros. |
| `src/server.ts` | Testa o PostgreSQL, cria/atualiza tabelas e inicia o servidor em `0.0.0.0`. | Usa `app`, `database`, `env` e logger. |
| `src/config/env.ts` | Carrega `.env`, aplica defaults e expõe configuração tipada de forma estrutural. | Consumido pelo banco, logger, servidor, autenticação e ML. |
| `src/config/database.ts` | Instancia `pg.Pool`, registra eventos, testa conexão e executa DDL. | Consumido por services e repository. |
| `src/routes` | Define caminhos e ordem de proteção por middleware. | Encaminha para controllers. |
| `src/controllers` | Lê request, chama service, constrói JSON/status e converte erros locais. | É a camada de entrada/saída HTTP. |
| `src/services` | Implementa autenticação, consulta de saúde, integração ML, normalização, classificação, persistência e histórico. | Usa repository, banco e API Python. |
| `src/repositories` | Encapsula os SQLs CRUD de usuários. | Usa o pool PostgreSQL. |
| `src/entities` | Apenas tipos TypeScript; não são entidades ORM. | Usados por services/repository. |
| `src/middlewares` | JWT, logging de request e tratamento global de erros. | Aplicados no Express. |
| `scripts/*.sh` | Controle local do serviço PostgreSQL via `sudo service postgresql`. | Invocados pelos scripts de ciclo de vida. |

## 3. Tecnologias e dependências

### Tecnologias identificadas

| Tecnologia | Versão | Finalidade | Evidência/uso |
|---|---:|---|---|
| Node.js | `v20.19.5` observado no ambiente | Runtime JavaScript/TypeScript compilado | `status.sh`; versão observada durante o levantamento. |
| TypeScript | `^7.0.2` no manifesto; `7.0.2` no lockfile | Tipagem e compilação | `package.json`, `package-lock.json`, `tsconfig.json`. |
| Express | `^5.2.1`; lockfile `5.2.1` | Servidor HTTP, roteamento e middleware | `src/app.ts`, `src/routes`. |
| PostgreSQL | Versão NÃO IDENTIFICADA no código; scripts usam o serviço do sistema | Banco relacional | `pg`, DDL em `src/config/database.ts`. |
| `pg` | `^8.23.0`; lockfile `8.23.0` | Driver e pool PostgreSQL | `src/config/database.ts`, services, repository. |
| `bcryptjs` | `^3.0.3`; lockfile `3.0.3` | Hash e comparação de senhas | `src/services/auth.service.ts`. |
| `jsonwebtoken` | `^9.0.3`; lockfile `9.0.3` | Emissão e validação JWT | `auth.service.ts`, `authenticateToken.ts`. |
| `cors` | `^2.8.6`; lockfile `2.8.6` | Middleware CORS | `src/app.ts`. |
| `dotenv` | `^17.4.2`; lockfile `17.4.2` | Carregamento de `.env` | `src/config/env.ts`. |
| `pino` | `^10.3.1`; lockfile `10.3.1` | Logging estruturado | `src/logger/logger.ts`. |
| `pino-pretty` | `^13.1.3`; lockfile `13.1.3` | Renderização legível em ambiente não produtivo | `src/logger/logger.ts`. |
| `tsx` | `^4.23.12`; lockfile `4.23.12` | Execução/watch de TypeScript em desenvolvimento | script `dev`. |

As tipagens `@types/*` também aparecem como dependências de desenvolvimento no `package.json`; suas versões declaradas são `@types/cors ^2.8.19`, `@types/express ^5.0.6`, `@types/jsonwebtoken ^9.0.10`, `@types/node ^26.2.0`, `@types/pg ^8.21.0` e `@types/pino ^7.0.4`.

Não foi identificado ORM, biblioteca de validação de schema, Axios/fetch externo, biblioteca de testes ou biblioteca específica de observabilidade.

## 4. Arquitetura efetivamente implementada

O código mostra uma organização modular em camadas com `routes → controllers → services → repository/database`, mas não há framework de arquitetura formal nem ORM. A classificação como “arquitetura em camadas” é uma descrição estrutural baseada na separação observada, não uma declaração do projeto.

Fluxos comprovados:

```text
HTTP request
  ↓
Express / middlewares globais
  ↓
Router
  ↓
Controller
  ↓
Service
  ├── UserRepository → pg.Pool → PostgreSQL
  ├── database.query → PostgreSQL
  └── http/https → API Python de ML
```

O fluxo de riscos é:

```text
GET /api/ml/coastal-risks
  ↓ autenticação global
Ml controller
  ↓ parse de filtros
MlPredictionService
  ├── GET {ML_API_URL}/predictions?limit=100
  ├── GET {ML_API_URL}/marine-data?limit=100
  ├── normalização + cruzamento por coordenadas/período
  ├── classificação de região e risco
  ├── hash SHA-256 + transação PostgreSQL
  └── consulta do histórico
  ↓
JSON com summary, trends, filtros e data
```

Não existe no backend o modelo científico de Machine Learning; ele é tratado como serviço HTTP externo.

## 5. Inicialização e encerramento

### Processo de inicialização

1. O módulo `src/config/env.ts` executa `dotenv.config()` e avalia as variáveis de ambiente na importação.
2. `src/server.ts` importa a aplicação, o pool, `env` e logger.
3. `startServer()` registra cabeçalho e configuração (`environment`, `port`, `logLevel`).
4. `testDatabaseConnection()` obtém um client do pool e executa `SELECT NOW()`.
5. `initializeDatabase()` executa o bloco DDL idempotente.
6. `app.listen(env.port, "0.0.0.0")` abre o servidor em todas as interfaces IPv4 disponíveis na máquina, na porta configurada.
7. São registrados os handlers de `SIGINT` e `SIGTERM`.

Se qualquer etapa do teste/construção do banco falhar, o erro é registrado como `SERVER STARTUP FAILED` e o processo termina com código 1. A função de startup não implementa retry/reconexão do PostgreSQL.

### Configuração global do Express (`src/app.ts`)

- `cors()` sem opções explícitas: a política efetiva deve ser confirmada na versão/configuração padrão da biblioteca; não há allowlist de origem no código.
- `express.json()` para JSON.
- `express.urlencoded({ extended: true })` para URL-encoded.
- `requestLogger` antes das rotas.
- `GET /` protegido por `authenticateToken`.
- `routes` montado em `/api`.
- `errorHandler` registrado ao final.

### Encerramento

O handler de shutdown registra o sinal, chama `server.close`, executa `database.end()` e encerra com código 0. Em erro no fechamento do pool, registra `SERVER SHUTDOWN ERROR` e termina com código 1. Não há rotina de shutdown para a API Python ou para Tailscale.

## 6. Variáveis de ambiente

Os nomes abaixo foram extraídos de `src/config/env.ts` e `.env.example`. Os valores existentes em `.env` não foram copiados.

| Variável | Finalidade | Default no código | Obrigatoriedade efetiva | Evidência |
|---|---|---|---|---|
| `NODE_ENV` | Ambiente e escolha do transport do logger | `development` | Opcional por ter default | `env.ts:16` |
| `PORT` | Porta HTTP | `3000` | Opcional por ter default | `env.ts:18` |
| `LOG_LEVEL` | Nível Pino | `info` | Opcional por ter default | `env.ts:20` |
| `DB_HOST` | Host PostgreSQL | `localhost` | Opcional por ter default | `env.ts:23` |
| `DB_PORT` | Porta PostgreSQL | `5432` | Opcional por ter default | `env.ts:24` |
| `DB_NAME` | Banco de dados | `algamar` | Opcional por ter default | `env.ts:25` |
| `DB_USER` | Usuário PostgreSQL | `postgres` | Opcional por ter default | `env.ts:26` |
| `DB_PASSWORD` | Senha PostgreSQL | Definido no código; valor omitido | Opcional por ter default | `env.ts:27` |
| `DB_POOL_MAX` | Número máximo configurado no pool | `5` | Opcional por ter default | `env.ts:28` |
| `ML_API_URL` | Base URL da API Python | `http://127.0.0.1:8000` | Opcional por ter default | `env.ts:32` |
| `ML_HISTORY_RETENTION_DAYS` | Retenção temporal de lotes | `90` | Opcional por ter default | `env.ts:33` |
| `ML_MAX_HISTORY_BATCHES` | Limite de lotes preservados | `1000` | Opcional por ter default | `env.ts:34` |
| `JWT_SECRET` | Segredo de assinatura/verificação JWT | Definido no código; valor omitido | Opcional por ter default inseguro | `env.ts:38` |
| `JWT_EXPIRES_IN` | Expiração do token | `1d` | Opcional por ter default | `env.ts:39` |

`getEnv()` lança erro quando uma variável sem default é ausente ou vazia; atualmente todas as variáveis consumidas têm default. Os valores declarados em `.env.example` incluem placeholders de infraestrutura e não são evidência de um ambiente funcional específico.

`Number(...)` é usado para portas, pool e retenções, mas não há validação explícita de `NaN`, inteiro positivo ou faixa. Essa é uma limitação de configuração identificável no código.

## 7. Rotas HTTP

### Tabela consolidada

| Método | Endpoint | Auth | Finalidade |
|---|---|---|---|
| `GET` | `/` | Bearer JWT | Resposta de disponibilidade da API. |
| `POST` | `/api/auth/register` | Pública | Cria usuário e retorna usuário público + JWT. |
| `POST` | `/api/auth/login` | Pública | Autentica usuário e retorna usuário público + JWT. |
| `PUT` | `/api/auth/me` | Bearer JWT | Atualiza dados do usuário autenticado e emite novo JWT. |
| `DELETE` | `/api/auth/me` | Bearer JWT | Remove o usuário autenticado. |
| `GET` | `/api/health` | Pública | Consulta `NOW()` no PostgreSQL e informa saúde do banco. |
| `GET` | `/api/ml/coastal-risks` | Bearer JWT | Consulta ML, enriquece, persiste e devolve riscos e tendências. |

Não foram identificados outros endpoints.

### `GET /`

Evidência: `src/app.ts:18-24`.

- Middleware: `authenticateToken`.
- Request: não possui parâmetros documentados.
- Sucesso: `200` e `{ success: true, system: "Algamar", message: "API do Algamar está online na porta ..." }`.
- A mensagem usa `process.env.PORT` diretamente, que pode ser `undefined` quando o default de `env.port` foi aplicado sem uma variável `PORT` explícita.
- Falta de token: `401`.

### `POST /api/auth/register`

Evidência: `src/routes/auth.routes.ts:11`, `src/controllers/auth.controller.ts:4-22`, `src/services/auth.service.ts:9-36`.

Request JSON aceito:

```json
{
  "full_name": "Nome completo",
  "fullName": "ou esta chave",
  "email": "usuario@example.com",
  "password": "mínimo de 6 caracteres"
}
```

O controller aceita `full_name` ou `fullName`; se ambas existirem, usa `full_name`. Valores ausentes são convertidos para string vazia. O service remove espaços do nome e normaliza o e-mail para minúsculas. Não existe validação formal de formato de e-mail, tamanho máximo no service ou confirmação de senha.

Processamento: consulta e-mail existente, gera bcrypt com fator 12, insere em `users` e cria JWT. A senha/hash não aparece no objeto público retornado.

Sucesso: `201`, `{ success: true, user: { id, fullName, email, createdAt }, token }`.

Erros implementados: `400` para dados ausentes/insuficientes ou erro genérico; `409` para e-mail já cadastrado; erros não classificados do banco também são convertidos pelo controller em `400`.

### `POST /api/auth/login`

Evidência: `auth.routes.ts:12`, `auth.controller.ts:24-38`, `auth.service.ts:38-55`.

Request JSON: `email` e `password`. O e-mail é trimado e convertido para minúsculas. A senha precisa ter pelo menos 6 caracteres antes da consulta. O service busca `users.email` e compara com bcrypt.

Sucesso: `200`, `{ success: true, user: { id, fullName, email, createdAt }, token }`.

Credencial ausente, usuário inexistente, senha incorreta ou senha curta: `401`, `{ success: false, message: "Email ou senha inválidos." }`.

### `PUT /api/auth/me`

Evidência: `auth.routes.ts:13`, `auth.controller.ts:40-68`, `auth.service.ts:57-102`.

Header: `Authorization: Bearer <JWT>`.

Body opcionalmente contém `full_name`/`fullName`, `email` e/ou `password`. Pelo menos um campo deve existir. O service trimará nome/e-mail, normalizará e-mail, exige nome/e-mail não vazios quando fornecidos e senha com pelo menos 6 caracteres. O e-mail deve continuar único. Atualização usa `COALESCE`, portanto campo omitido permanece inalterado. Emite novo token com o e-mail atualizado.

Sucesso: `200`, `{ success: true, user, token }`. Erros: `401` token ausente/inválido; `400` validação; `404` usuário não encontrado; `409` e-mail já cadastrado.

### `DELETE /api/auth/me`

Evidência: `auth.routes.ts:14`, `auth.controller.ts:70-87`.

Header: Bearer JWT. O `sub` do token é usado como id. Se o usuário existir, executa `DELETE FROM users WHERE id = $1` e responde `204` sem corpo. Token inválido/ausente: `401`; usuário inexistente: `404`.

Não existe cascade de usuário para predições, pois as tabelas não possuem FK de `predictions` para `users`.

### `GET /api/health`

Evidência: `src/routes/index.ts:10-12`, `health.controller.ts`, `health.service.ts`.

É pública porque é registrada antes do `router.use(authenticateToken)` global. Executa `SELECT NOW() AS current_time`.

- PostgreSQL disponível: `200`, `success: true`, `system: "Algamar"`, `status: "online"`, `database: { status: "online", serverTime }`.
- Falha de query: `503`, `success: false`, `status: "degraded"`, `database: { status: "offline" }`.

### `GET /api/ml/coastal-risks`

Evidência: `src/routes/index.ts:14-16`, `ml.routes.ts:5`, `ml.controller.ts`, `mlPrediction.service.ts`.

Header: `Authorization: Bearer <JWT>`.

Query parameters opcionais:

| Parâmetro | Tipo | Tratamento |
|---|---|---|
| `region` | string | trim; comparação sem distinção entre maiúsculas/minúsculas para os pontos atuais e SQL histórico. |
| `risk_level` | string | trim e uppercase; comparação exata com `ALTO`, `MÉDIO` ou `BAIXO` gerados pelo backend. |
| `month` | string numérica | Convertida para número inteiro entre 1 e 12; fora da faixa resulta em erro. |

Fluxo: duas requisições paralelas à API Python, extração de itens, normalização de aliases, cruzamento de dados marinhos, enriquecimento, hash, persistência transacional, limpeza de lotes, consulta histórica e cálculo de tendências no controller.

Resposta de sucesso `200`:

```json
{
  "success": true,
  "summary": {
    "total_monitored": 0,
    "high_risk_count": 0,
    "general_status": "NORMAL"
  },
  "trends": [],
  "filters_applied": {
    "region": "todas",
    "risk_level": "todos",
    "month": "todos"
  },
  "data": []
}
```

O exemplo acima representa a estrutura, não um resultado observado. `summary` usa somente os pontos atuais filtrados; `trends` é calculado sobre `history`, que já foi consultado com os filtros.

Cada item de `data` tem a forma tipada por `EnrichedPoint`:

```json
{
  "id": "identificador",
  "latitude": 0,
  "longitude": 0,
  "region": "Litoral Norte",
  "year": 2026,
  "month": 1,
  "probability": 0,
  "risk_level": "BAIXO",
  "environmental_factors": {
    "temperature_celsius": null,
    "chlorophyll_mg_m3": null,
    "salinity_psu": null
  },
  "model_version": "v1.0"
}
```

Erros: mês inválido resulta em `400` com `message: "Parâmetro de filtro inválido."` e `errorDetails` da exceção. Falhas de API Python, JSON, persistência ou consulta resultam normalmente em `500` com `message: "Erro ao carregar os riscos costeiros."` e `errorDetails` contendo a mensagem interna. A exposição desse detalhe de erro é uma característica implementada e um ponto de segurança a revisar.

## 8. Autenticação e autorização

### Emissão

`AuthService.createToken()` usa `jwt.sign` com:

- payload: `{ email: user.email }`;
- subject (`sub`): `user.id`;
- segredo: `env.auth.jwtSecret`;
- expiração: `env.auth.tokenExpiresIn`.

### Validação

`authenticateToken` lê o header `Authorization`, exige prefixo exato `Bearer ` e chama `jwt.verify`. O código exige `payload.sub` e `payload.email`; então anexa `request.user = { id, email }`. Ausência resulta em `401 Token de autenticação obrigatório.`; token inválido/expirado resulta em `401 Token inválido ou expirado.`.

### Autorização

Não há roles, permissões, escopos ou tabela de perfis. A autorização é binária: possuir JWT válido. `/api/ml/*` é protegido pelo middleware global; `/api/auth/me` possui middleware próprio; registro, login e health são públicos. A rota `/` também exige JWT.

O middleware não consulta o usuário no banco após validar o token. Assim, pelo código, um token ainda válido não é revogado automaticamente após exclusão/alteração da conta; NÃO IDENTIFICADO mecanismo de revogação.

### Senhas

Senhas são armazenadas apenas como hash bcrypt com fator 12. Os métodos repository podem selecionar `password_hash`, mas os services removem `passwordHash` antes de retornar ao cliente. Não há política de complexidade além do mínimo de seis caracteres, rate limiting, lockout ou MFA identificados.

## 9. Regras de negócio implementadas

### Autenticação

| Regra | Implementação | Evidência |
|---|---|---|
| Nome, e-mail e senha são necessários no cadastro | trim do nome/e-mail e senha com tamanho mínimo 6 | `auth.service.ts:15-23` |
| E-mail é case-insensitive no cadastro/login | `trim().toLowerCase()` | `auth.service.ts:15`, `47` |
| E-mail deve ser único | consulta prévia e `UNIQUE` no banco | service e `database.ts:77` |
| Hash de senha | `bcrypt.hash(password, 12)` | `auth.service.ts:29`, `88-89` |
| Atualização exige ao menos um campo | teste de três parâmetros `undefined` | `auth.service.ts:63-64` |
| Campos omitidos permanecem | `COALESCE` no UPDATE | `user.repository.ts:64-66` |

### Normalização e enriquecimento ML

| Regra | Comportamento efetivo | Evidência |
|---|---|---|
| Formatos alternativos de payload | Aceita array direto ou objeto com chave esperada; números podem vir como number/string e vírgula decimal | `mlPrediction.service.ts:15-39` |
| Coordenadas | Aceita `latitude/lat/latitud` e `longitude/lon/lng/long`; registros sem ambas são descartados | linhas `58-67`, `104-107` |
| Período | Aceita `year/ano` e `month/mes`; alternativamente extrai UTC de `date/timestamp/datetime`; sem valor usa data atual UTC | linhas `41-56` |
| Região | Baseia-se em limiares de latitude/longitude e produz `Litoral Norte`, `Baixada Santista` ou `Litoral Sul` | linhas `69-73` |
| Probabilidade | Aceita quatro nomes de campo; ausência/valor inválido vira `0` | linhas `112-121` |
| Risco | Usa texto contendo ALTO/HIGH, MED/MODERATE ou BAIX/LOW; se ausente, limiares são `>=0.7` alto, `>=0.4` médio, senão baixo | linhas `75-80` |
| Ambiente | Procura `environmental_factors`/`environmentalFactors`; se ausente usa o registro marinho inteiro | linhas `82-88` |
| Cruzamento marinho | Chave por lat/lon arredondados a quatro casas e ano/mês; o último registro com a chave sobrescreve anteriores | linhas `94-110` |
| Versão do modelo | Aceita `model_version`, `modelVersion` ou `version`; default `v1.0` | linhas `161-164` |
| Filtros atuais | Região case-insensitive, risco exato após uppercase e mês exato | linhas `169-179` |

Não há validação de faixa de latitude/longitude, probabilidade entre 0 e 1, ano válido, existência obrigatória de dados ambientais ou coerência entre probabilidade e risco textual. O banco impõe apenas a faixa de mês.

### Tendências

O controller agrupa o histórico por `year-month` e calcula:

- `avg_probability`: soma das probabilidades dividida pelo número de pontos, arredondada a quatro casas;
- `avg_temperature`: média apenas dos pontos com temperatura não nula, arredondada a duas casas;
- `high_risk_points`: quantidade de pontos cujo risco é exatamente `ALTO`.

`general_status` é `ATENÇÃO` quando algum ponto atual filtrado é `ALTO`; caso contrário, `NORMAL`. Não há outro cálculo de risco global.

## 10. PostgreSQL

### Conectividade

`src/config/database.ts` cria um `Pool` com host, porta, database, usuário, senha e máximo de clientes configurados. Também define `idleTimeoutMillis: 30000` e `connectionTimeoutMillis: 5000`.

O startup faz uma conexão de teste, executa `SELECT NOW()` e libera o client. O pool é encerrado no shutdown. Há listeners para `connect`, `error` e `remove`. Não há configuração explícita de SSL, retry automático, keepalive, statement timeout ou reconexão customizada identificada.

### Schema criado em runtime

Não há arquivo SQL/migration separado. `initializeDatabase()` envia um bloco com `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` e `CREATE INDEX IF NOT EXISTS`. Isso torna a criação básica idempotente, mas não existe mecanismo formal de versionamento de schema ou migração de alterações semânticas.

#### Tabela `users`

| Campo | Tipo | PK | FK | Obrigatório | Default | Descrição baseada no código |
|---|---|---|---|---|---|---|
| `id` | `BIGSERIAL` | Sim | Não | Sim | sequence implícita | Identificador do usuário. |
| `full_name` | `VARCHAR(150)` | Não | Não | Sim | — | Nome completo recebido no cadastro/atualização. |
| `email` | `VARCHAR(320)` | Não | Não | Sim | — | E-mail de autenticação, único. |
| `password_hash` | `TEXT` | Não | Não | Sim | — | Hash bcrypt da senha. |
| `created_at` | `TIMESTAMPTZ` | Não | Não | Sim | `NOW()` | Data/hora de criação. |
| `updated_at` | `TIMESTAMPTZ` | Não | Não | Sim | `NOW()` | Data/hora atualizada pelo UPDATE do repository; não há trigger. |

Constraints: PK em `id`, `NOT NULL` nos campos listados e `UNIQUE(email)`. Não há CHECK de formato/tamanho de senha em banco.

#### Tabela `prediction_batches`

| Campo | Tipo | PK | FK | Obrigatório | Default | Descrição baseada no código |
|---|---|---|---|---|---|---|
| `id` | `BIGSERIAL` | Sim | Não | Sim | sequence implícita | Identificador do lote de sincronização. |
| `source` | `VARCHAR(50)` | Não | Não | Sim | `'machine-learning'` | Origem declarada do lote; o persist não envia valor, portanto usa default. |
| `model_version` | `VARCHAR(100)` | Não | Não | Não | — | Versão associada ao lote, tomada do primeiro ponto. |
| `created_at` | `TIMESTAMPTZ` | Não | Não | Sim | `NOW()` | Momento do lote. |
| `source_hash` | `VARCHAR(64)` | Não | Não | Não | — | SHA-256 hexadecimal do conjunto normalizado; adicionado por `ALTER TABLE`. |

Há índice único parcial `prediction_batches_source_hash_idx` em `source_hash` somente quando não nulo.

#### Tabela `predictions`

| Campo | Tipo | PK | FK | Obrigatório | Default | Descrição baseada no código |
|---|---|---|---|---|---|---|
| `id` | `BIGSERIAL` | Sim | Não | Sim | sequence implícita | Identificador interno do ponto. |
| `batch_id` | `BIGINT` | Não | `prediction_batches(id)` | Sim | — | Lote ao qual o ponto pertence. `ON DELETE CASCADE`. |
| `external_id` | `VARCHAR(255)` | Não | Não | Não | — | ID recebido da API; o backend gera fallback quando ausente, mas a coluna permite nulo. |
| `latitude` | `NUMERIC(10,6)` | Não | Não | Sim | — | Latitude normalizada. |
| `longitude` | `NUMERIC(10,6)` | Não | Não | Sim | — | Longitude normalizada. |
| `region` | `VARCHAR(100)` | Não | Não | Sim | — | Região calculada pelo backend. |
| `prediction_year` | `INTEGER` | Não | Não | Sim | — | Ano da predição/período. |
| `prediction_month` | `INTEGER` | Não | Não | Sim | — | Mês da predição; CHECK entre 1 e 12. |
| `probability` | `NUMERIC(8,6)` | Não | Não | Sim | — | Probabilidade normalizada; não há CHECK de faixa. |
| `risk_level` | `VARCHAR(20)` | Não | Não | Sim | — | Nível textual normalizado. Não há CHECK dos três valores. |
| `temperature_celsius` | `NUMERIC(8,3)` | Não | Não | Não | — | Temperatura marinha, se encontrada. |
| `chlorophyll_mg_m3` | `NUMERIC(10,4)` | Não | Não | Não | — | Clorofila, se encontrada. |
| `salinity_psu` | `NUMERIC(8,3)` | Não | Não | Não | — | Salinidade, se encontrada. |
| `model_version` | `VARCHAR(100)` | Não | Não | Sim | — | Versão normalizada, com default lógico `v1.0` antes da inserção. |
| `created_at` | `TIMESTAMPTZ` | Não | Não | Sim | `NOW()` | Momento de persistência do ponto. |

### Relacionamentos e integridade

```text
prediction_batches (1)
        |
        | 1:N, FK predictions.batch_id
        | ON DELETE CASCADE
        v
predictions (N)
```

O relacionamento `users` com as predições é inexistente no schema. Não foram identificadas relações 1:1 ou N:N. Não há views, triggers, functions, procedures ou sequences declaradas manualmente; `BIGSERIAL` cria sequences implícitas do PostgreSQL.

### Índices

| Índice | Tabela/colunas | Tipo/finalidade |
|---|---|---|
| `prediction_batches_source_hash_idx` | `prediction_batches(source_hash)` | Único parcial, deduplicação de lotes não nulos. |
| `predictions_period_idx` | `prediction_year, prediction_month` | Consulta por período; criado, embora a query histórica filtre principalmente mês e ordene por criação. |
| `predictions_risk_idx` | `risk_level` | Filtro por risco. |
| `predictions_region_idx` | `region` | Filtro por região. |
| `predictions_batch_id_idx` | `batch_id` | Acesso por lote/FK. |
| `predictions_created_at_idx` | `created_at` | Ordenação/limpeza temporal. |

## 11. Queries, persistência e transações

### Usuários (`user.repository.ts`)

| Função | SQL/operação | Uso |
|---|---|---|
| `findByEmail` | `SELECT * FROM users WHERE email = $1` | Cadastro e login. Parametrizado. |
| `findPublicById` | SELECT explícito por id | Verificação de e-mail e atualização. O hash é selecionado internamente e removido da saída. |
| `create` | INSERT com `RETURNING` | Criação do usuário. |
| `update` | UPDATE com `COALESCE`, `updated_at = NOW()`, `RETURNING` | Alteração parcial. |
| `delete` | DELETE por id | Exclusão da própria conta. |

Todas usam parâmetros `$n`; não há concatenação de valores de usuário nesses SQLs.

### Health

`HealthService.check()` executa `SELECT NOW() AS current_time` através do pool compartilhado.

### Predições e lotes

1. `getSourceHash()` ordena pontos por `id`, serializa JSON e produz SHA-256.
2. `persist()` obtém client dedicado e inicia `BEGIN`.
3. Tenta inserir lote com `ON CONFLICT (source_hash) ... DO NOTHING RETURNING id`.
4. Se já existir, busca lote por hash.
5. Apenas quando o lote é novo faz um INSERT multi-row em `predictions`, com 13 parâmetros por ponto.
6. Remove lotes fora da retenção temporal ou além dos `maxHistoryBatches` mais recentes.
7. Executa `COMMIT`.
8. Em qualquer erro executa `ROLLBACK`; em `finally`, libera o client.

A query histórica seleciona os campos normalizados de `predictions`, constrói dinamicamente somente as cláusulas fixas `region`, `risk_level` e `prediction_month`, sempre com valores parametrizados, e ordena por `created_at ASC`. Não há paginação; a API Python é chamada com `limit=100`, mas a query histórica pode retornar todos os pontos retidos.

O DELETE de limpeza opera sobre `prediction_batches`; por causa de `ON DELETE CASCADE`, os pontos dos lotes removidos são excluídos. Não há transação envolvendo as duas consultas externas à API Python; a transação começa apenas na persistência.

## 12. Integração Backend ↔ Machine Learning

### Contrato efetivamente utilizado

Base URL: `ML_API_URL`, com uma barra final removida pelo service.

Chamadas paralelas:

```text
GET {ML_API_URL}/predictions?limit=100
GET {ML_API_URL}/marine-data?limit=100
```

O transporte é escolhido pela URL: módulo `https` para protocolo `https:`, caso contrário módulo `http`. Não são enviados headers de autenticação, token ou payload JSON. O timeout da requisição é de 10.000 ms.

Resposta aceita:

- predições: array direto ou objeto `{ "predictions": [...] }`;
- dados marinhos: array direto, `{ "marine_data": [...] }` ou `{ "data": [...] }`.

Cada item precisa fornecer coordenadas reconhecíveis para sobreviver ao enriquecimento. O service não valida esquema externo com biblioteca formal. Status HTTP fora de 2xx, JSON inválido, timeout, erro de rede e ausência de predições geram exceção.

### Cruzamento e persistência

O backend cruza previsão e dados marinhos pela chave `(latitude.toFixed(4), longitude.toFixed(4), ano, mês)`. Fatores ambientais podem estar diretamente no registro marinho ou em `environmental_factors`/`environmentalFactors`. Ausência de correspondência não descarta o ponto; seus três fatores ficam `null`.

O service retorna também `batchId`, porém `ml.controller.ts` não o inclui na resposta HTTP. Portanto, o ID do lote é persistido, mas não é exposto por esse endpoint no código atual.

Detalhes internos do modelo, treinamento, features científicas e qualidade estatística: **NÃO IDENTIFICADOS NO CÓDIGO DESTE WORKSPACE**; devem ser obtidos no workspace do Machine Learning.

## 13. Erros e códigos HTTP

| Situação | HTTP | Resposta/mensagem | Local |
|---|---:|---|---|
| Authorization ausente | 401 | `Token de autenticação obrigatório.` | `authenticateToken.ts` |
| JWT inválido/expirado ou payload sem `sub`/`email` | 401 | `Token inválido ou expirado.` | `authenticateToken.ts` |
| Controller sem `request.user` | 401 | `Não autenticado.` | `auth.controller.ts` |
| Cadastro inválido | 400 | mensagem do service | `auth.controller.ts`, `auth.service.ts` |
| E-mail já cadastrado | 409 | `Email já cadastrado.` | service/controller |
| Credencial inválida | 401 | `Email ou senha inválidos.` | service/controller |
| Usuário inexistente em update/delete | 404 | `Usuário não encontrado.` | service/controller |
| Nenhum campo no update | 400 | `Informe ao menos um campo para atualizar.` | service/controller |
| JSON malformado | 400 | `JSON inválido no corpo da requisição.` + `errorDetails` | `errorHandler.ts` |
| Mês fora de 1–12 | 400 | `Parâmetro de filtro inválido.` | `ml.controller.ts` |
| Falha de health query | 503 | banco `offline` | `health.controller.ts` |
| Falha ML, banco ou processamento de riscos | 500 | mensagem genérica + `errorDetails` interno | `ml.controller.ts` |
| Exceção não tratada | 500 | `Erro interno do servidor.` | `errorHandler.ts` |

O handler global registra o erro e não substitui resposta quando `headersSent`. Não existe handler explícito de 404; o comportamento de rota inexistente depende do Express e não foi customizado no código.

## 14. Logs e observabilidade

`src/logger/logger.ts` cria logger Pino com `level` vindo de `LOG_LEVEL` e base `{ service: "algamar-api" }`. Em ambiente diferente de `production`, usa `pino-pretty` com cores, horário do sistema, exclusão de `pid`/`hostname` e múltiplas linhas. Em `production`, não é configurado transport pretty; o formato Pino padrão é usado.

Eventos registrados incluem:

- configuração do servidor;
- início/falha do startup;
- conexão, erro e remoção de client do banco;
- início e fim do shutdown;
- request com UUID, método, URL e IP;
- response com status e duração;
- erro global com método, URL original e erro.

O middleware gera `X-Request-ID` com `randomUUID()` e repete o ID nos logs de request/response. Não há correlação explícita desse ID em queries ou chamadas ML, métricas, tracing distribuído, endpoint de métricas ou rotação de arquivos de log identificados. O código não registra senha, JWT ou `password_hash` deliberadamente; ainda assim, o objeto de erro é passado ao logger e merece revisão conforme os erros efetivos das bibliotecas.

## 15. Segurança

### Implementado

- bcrypt para senhas, com hash fator 12.
- JWT assinado e verificado no backend.
- Proteção de rotas por Bearer token.
- SQL parametrizado nas operações de usuário e histórico.
- `passwordHash` removido das respostas públicas.
- `.env` listado no `.gitignore`.
- CORS habilitado via middleware.
- `X-Request-ID` para rastreabilidade.
- Transação com rollback na persistência de lotes.

### Não identificado no código

- allowlist de CORS;
- HTTPS/TLS próprio do backend;
- autenticação entre backend e API ML;
- rate limiting, CSRF, MFA, bloqueio de tentativas ou revogação de JWT;
- validação formal de schema;
- autorização por papel/permissão;
- política de rotação de segredo;
- mascaramento estruturado de erros ML/banco;
- criptografia de dados em repouso;
- configuração SSL do PostgreSQL;
- firewall ou exposição de portas;
- monitoramento/alertas;
- configuração Tailscale.

### Riscos/configurações sensíveis observáveis

- `JWT_SECRET` tem um default explícito no código; o valor foi omitido deste inventário e o ambiente final precisa substituí-lo.
- `DB_PASSWORD` tem um default explícito no código; o valor foi omitido deste inventário e o ambiente final precisa substituí-lo.
- `GET /api/ml/coastal-risks` devolve `errorDetails` em falhas.
- `cors()` não apresenta restrição explícita.
- O servidor escuta em `0.0.0.0`.
- O script de exemplo usa `ML_API_URL=https://endereco-da-api-python`, mas o default de runtime é HTTP local; a configuração efetiva depende do ambiente.

As observações acima são constatações técnicas, não recomendações já implementadas.

## 16. Tailscale e conectividade externa

A orientação do levantamento informa que Tailscale é a solução externa considerada e que Oracle Cloud não deve ser tratado como infraestrutura final. Contudo, no workspace:

- não há script, variável, hostname, IP Tailscale, ACL, `tailscale up`, `tailscale serve`, `tailscale funnel` ou configuração equivalente;
- os scripts só controlam o serviço local PostgreSQL e o processo Node;
- `server.ts` escuta em `0.0.0.0`, mas não define como a máquina é alcançada externamente;
- não há evidência de configuração de acesso Frontend → Backend, Backend → PostgreSQL ou Backend → ML através da rede Tailscale;
- não há processo de inicialização/health check do Tailscale no projeto.

Conclusão rastreável:

```text
CONFIGURAÇÃO DO TAILSCALE NÃO IDENTIFICADA NO CÓDIGO — NECESSITA DOCUMENTAÇÃO MANUAL.
```

A arquitetura operacional esperada pelo contexto do projeto pode ser registrada academicamente somente após confirmação das máquinas, portas, nomes DNS/IP, ACLs, serviço que inicia o daemon e dependência de a máquina permanecer ligada. Esses dados não podem ser derivados deste repositório.

Oracle Cloud: **NÃO IDENTIFICADO NO CÓDIGO**. Não há Docker/deploy/cloud provider no workspace.

## 17. Execução e ambiente de desenvolvimento

### Scripts npm

| Comando | Efeito comprovado |
|---|---|
| `npm run dev` | Executa `tsx watch src/server.ts`. |
| `npm run build` | Executa `tsc`, produzindo `dist` conforme `tsconfig.json`. Não foi executado neste levantamento para não gerar artefatos desnecessários. |
| `npm start` | Executa `node dist/server.js`; requer build prévio. |
| `npm run check` | Executa `tsc --noEmit`; foi executado com sucesso no ambiente analisado. |

### Scripts shell

- `start.sh`: executa `./scripts/db-start.sh`, instala/usa o backend de desenvolvimento via `npm run dev` e para PostgreSQL no trap de `SIGINT`/`SIGTERM`.
- `stop.sh`: executa `db-stop.sh`.
- `restart.sh`: para/inicia PostgreSQL e executa `npm run dev`.
- `status.sh`: chama `db-status.sh`, `node --version`, `npm --version` e mostra `pwd`.
- `db-start.sh`: usa `sudo service postgresql status/start`.
- `db-stop.sh`: usa `sudo service postgresql status/stop`.
- `db-status.sh`: usa `sudo service postgresql status`.
- `db-reset.sh`: imprime que o reset ainda não está configurado e não remove dados.

Os scripts indicam um ambiente Linux/WSL ou compatível com `service` e `sudo`, mas Windows, WSL ou distribuição específica: **NECESSITA CONFIRMAÇÃO DO DESENVOLVEDOR**. A versão Node observada foi `20.19.5`; PostgreSQL instalado/rodando não foi confirmado neste ambiente.

### Sequência de execução baseada no código

1. Definir variáveis de ambiente, idealmente a partir de `.env.example` sem manter defaults inseguros.
2. Garantir PostgreSQL disponível (`scripts/db-start.sh` ou mecanismo equivalente).
3. Garantir a API Python no `ML_API_URL` quando `/api/ml/coastal-risks` for utilizado.
4. Executar `npm run dev` para desenvolvimento ou `npm run build` seguido de `npm start` para o fluxo compilado.
5. Fazer login/cadastro para obter JWT antes de usar `/` ou `/api/ml/coastal-risks`.

O passo de Tailscale não pode ser especificado com comandos do projeto: configuração **NÃO IDENTIFICADA NO CÓDIGO**.

## 18. Testes e resultados verificáveis

Não foram encontrados arquivos de teste, scripts de integração, coleções Postman, fixtures, seeds ou testes de banco. Consequentemente, não há resultados HTTP 200, registros ou previsões observadas versionados no workspace.

Verificação realizada durante este levantamento:

| Verificação | Resultado |
|---|---|
| `node --version` | `v20.19.5` observado. |
| `npm --version` | `10.8.2` observado. |
| `npm run check` | Concluído com sucesso; `tsc --noEmit` não reportou erros. |
| PostgreSQL via `sudo service postgresql status` | Não foi possível confirmar neste ambiente; o `sudo` falhou por restrição de execução/privilégios. |
| API Python | Não executada nem acessada durante o levantamento. |
| Endpoints HTTP | Não exercitados neste levantamento. |

Não se deve interpretar a compilação bem-sucedida como prova de funcionamento integrado com PostgreSQL, ML ou rede externa.

## 19. Limitações técnicas identificadas

As limitações abaixo são diretamente observáveis:

- dependência de PostgreSQL externo ao processo Node;
- dependência da API Python para produzir predições;
- retenção e consulta histórica sem paginação;
- chamadas ML limitadas a `limit=100` por endpoint;
- ausência de configuração de retry/circuit breaker para ML ou banco;
- ausência de testes automatizados no workspace;
- ausência de migrations versionadas;
- `db-reset.sh` não implementa reset;
- ausência de configuração de deploy/cloud/container;
- Tailscale não configurado no repositório;
- servidor local escuta em `0.0.0.0`, sem política de exposição visível;
- defaults de senha de banco e segredo JWT inadequados para produção se não forem substituídos;
- ausência de validação formal de payloads e de faixas para coordenadas/probabilidades;
- não há limite explícito de resultados na query histórica;
- o controller não expõe o `batchId` que o service calcula;
- erro detalhado do ML pode ser devolvido ao cliente;
- não existe mecanismo de revogação de JWT;
- não há confirmação de disponibilidade, escalabilidade, backup, recuperação ou SLA.

Escalabilidade, disponibilidade real, capacidade do PostgreSQL, backup, infraestrutura de produção e qualidade científica das previsões: **NECESSITA CONFIRMAÇÃO DO DESENVOLVEDOR** ou levantamento em outros ambientes.

## 20. Informações que precisam ser confirmadas

### Backend

- ambiente operacional final (Linux, WSL, Windows com camada compatível ou outro);
- comando oficial de produção e processo supervisor;
- versão oficial de Node e PostgreSQL;
- se o build compilado é usado fora do desenvolvimento;
- contrato definitivo da API Python;
- se o `batchId` deve ser exposto na API;
- política de versionamento/migrations do schema.

### Banco

- nome/host/porta/usuário efetivos do ambiente final;
- versão do PostgreSQL;
- existência de banco/schema além do `public` padrão;
- políticas de backup, restauração e retenção;
- se existem índices, constraints ou dados criados manualmente fora deste código;
- volume esperado de dados e necessidade de paginação.

### APIs e Machine Learning

- URL efetiva e acessibilidade da API Python;
- autenticação/segurança entre os serviços;
- schema formal das respostas;
- semântica científica de probabilidade, risco e fatores ambientais;
- significado operacional das regiões e dos limiares implementados no backend.

### Segurança

- valores seguros efetivos de `JWT_SECRET` e `DB_PASSWORD`;
- necessidade de HTTPS, proxy reverso e certificados;
- origens autorizadas do CORS;
- política de expiração/revogação de tokens;
- requisitos de auditoria, rate limit e proteção contra abuso.

### Tailscale

- máquinas participantes;
- tailnet, nomes DNS/IP e ACLs;
- portas liberadas;
- processo que inicia o Tailscale;
- se Frontend e ML estão na mesma tailnet;
- dependência de máquina local ligada e acessível;
- mecanismo de publicação externa, se houver.

### Regras de negócio

- origem e justificativa dos limiares de risco `0.4` e `0.7`;
- origem e validação das fronteiras de `Litoral Norte`, `Baixada Santista` e `Litoral Sul`;
- se mês/ano ausentes realmente devem usar UTC atual;
- política para registros sem coordenadas ou sem dados marinhos;
- se o hash deve considerar todos os campos atuais do ponto.

### Testes

- casos de teste oficiais;
- evidências de execução dos endpoints;
- dados reais de exemplo;
- estratégia de integração, carga e segurança.

### Infraestrutura

- topologia final com Tailscale;
- forma de iniciar PostgreSQL, backend e ML;
- existência de firewall, proxy, monitoramento e logs persistidos;
- Oracle Cloud: não há evidência no código e não deve ser assumido como infraestrutura final.

## 21. Mapeamento para documentação acadêmica

| Capítulo acadêmico | Informações disponíveis neste workspace | Ausências/evidências |
|---|---|---|
| 1. Introdução | Nome do backend, escopo de monitoramento e relação com previsões no `README.md`. | Contextualização científica, problema, objetivos e referências: fora deste workspace. |
| 2. Fundamentação teórica | Termos de risco, dados marinhos, probabilidade e integração ML aparecem no README/código. | Fundamentação ambiental, algas tóxicas, saúde pública e literatura: ausentes. |
| 3. Visão geral do Algamar | Backend entre API Python, PostgreSQL e consumidores; `README.md`. | Frontend, usuários reais e operação final: confirmar. |
| 4. Arquitetura do sistema | Fluxos, camadas, rotas e dependências: `app.ts`, `server.ts`, `routes`, `services`. | Diagrama de implantação/Tailscale: ausente. |
| 5. Banco de dados | Tabelas, tipos, constraints, índices e FK: `config/database.ts`; queries: repository/service. | Dados reais, volume, plano de execução e backup: ausentes. |
| 6. Engenharia e fluxo dos dados | Normalização, cruzamento, hash, persistência e histórico: `mlPrediction.service.ts`. | Proveniência científica e pipeline completo: depende do workspace ML. |
| 7. Machine Learning | Apenas contrato HTTP e consumo de predições/dados marinhos. | Modelo, treinamento, features, métricas e validação: workspace ML. |
| 8. Backend | Inicialização, camadas, services, autenticação, regras e erros: todo `src/`. | Resultados de operação e deploy: ausentes. |
| 9. APIs e integração | Todos os endpoints, formatos, auth, ML e PostgreSQL: rotas/controllers/services. | Contrato externo formal e documentação OpenAPI: ausentes. |
| 10. Segurança | bcrypt, JWT, CORS, SQL parametrizado e lacunas: middleware/service/config. | Threat model, pentest, TLS, ACLs e política formal: ausentes. |
| 11. Testes e validação | `npm run check` passou; inexistência de testes catalogada. | Testes funcionais, integração, carga e resultados: ausentes. |
| 12. Infraestrutura e implantação | Scripts locais PostgreSQL, host/porta de app e defaults. | Tailscale, máquinas, deploy, cloud, observabilidade e disponibilidade: ausentes. |
| 13. Frontend — reservado | Nenhuma implementação frontend neste workspace. | Deve ser levantado separadamente. |
| 14. Resultados e discussão | Somente comportamentos esperados pelo código/README. | Resultados observados, indicadores e discussão científica: ausentes. |
| 15. Trabalhos futuros | Lacunas técnicas identificadas podem subsidiar seção futura. | Priorização e roadmap: necessita equipe. |
| 16. Considerações finais | Papel e limites do backend podem ser derivados deste inventário. | Conclusões do projeto completo: dependem dos demais levantamentos. |
| 17. Referências | Não há referências bibliográficas no workspace. | Necessita levantamento acadêmico próprio. |
| 18. Apêndices e anexos | Schema DDL, tabelas de endpoints, fluxos e scripts podem ser anexados. | Exemplos reais, diagramas finais, contratos e logs: obter posteriormente. |

## 22. Frontend — documentação futura

A camada de apresentação será documentada posteriormente.

Deverão ser analisados futuramente:

- tecnologias;
- arquitetura;
- páginas;
- componentes;
- rotas;
- autenticação;
- consumo das APIs;
- dashboards;
- mapas;
- previsões;
- visualizações;
- UX/UI;
- responsividade;
- testes.

## 23. Checklist de revisão do levantamento

- [x] Estrutura e arquivos relevantes.
- [x] Tecnologias e versões identificáveis.
- [x] Arquitetura e relações entre componentes.
- [x] Inicialização, porta, host, middleware e shutdown.
- [x] Variáveis de ambiente sem reproduzir secrets.
- [x] Todas as rotas localizadas e autenticidade documentada.
- [x] Requests, responses, validações e erros.
- [x] Registro, login, hash, JWT e middleware.
- [x] Regras de negócio implementadas.
- [x] PostgreSQL, tabelas, campos, constraints e índices.
- [x] Relacionamentos, queries e transações.
- [x] Backend ↔ PostgreSQL.
- [x] Backend ↔ Machine Learning.
- [x] Logs e tratamento de erros.
- [x] Segurança implementada, não identificada e pontos de atenção.
- [x] Tailscale explicitamente marcado como não identificado no código.
- [x] Execução, scripts e dependências.
- [x] Testes e resultados verificáveis, sem inventar evidências.
- [x] Limitações e informações pendentes.
- [x] Mapeamento para capítulos acadêmicos.
- [x] Espaço reservado para Frontend.
