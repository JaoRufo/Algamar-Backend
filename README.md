# Algamar Backend

API backend do sistema Algamar. A aplicação autentica usuários, verifica a saúde do PostgreSQL e funciona como uma camada segura entre os consumidores da API e o serviço de Machine Learning em Python.

O backend não executa nem treina o modelo científico. Ele encaminha consultas para a API Python, normaliza configurações de acesso, preserva respostas e disponibiliza os dados para o frontend e outros consumidores.

## Principais funcionalidades

- Cadastro, login, atualização e exclusão da conta do usuário.
- Autenticação por JWT nas rotas privadas.
- Health check da aplicação e da conexão com o PostgreSQL.
- Proxy autenticado para predições, previsões, dados observados e condições ambientais.
- Consulta de climatologia por coordenadas.
- Consulta de condições propícias por espécie e região, incluindo histórico.
- Consulta de riscos costeiros, mapa de previsão e metadados de forecast.
- Reenvio dos parâmetros de consulta e do cabeçalho `Authorization` para a API Python quando aplicável.
- Cache em memória para consultas GET sem autenticação encaminhada, com TTL configurável.
- Tratamento de timeout, indisponibilidade e respostas de erro do serviço de Machine Learning.
- Camada de persistência PostgreSQL para usuários, lotes e pontos de predição, incluindo dados ambientais enriquecidos e histórico de riscos.

## Arquitetura

```text
Cliente / Frontend
        |
        | HTTP + Bearer JWT
        v
Backend Algamar (Express + TypeScript)
        |                      \
        | autenticação,          \ cache e proxy HTTP
        | validação e logs       \
        v                         v
PostgreSQL                 API Python de Machine Learning
                              | predições, forecast,
                              | dados ambientais e observados
```

O código é organizado por responsabilidade:

- `src/routes`: composição dos caminhos HTTP.
- `src/controllers`: validação de entrada e respostas HTTP.
- `src/services`: autenticação, health check e integração com ML.
- `src/repositories`: acesso aos dados de usuários.
- `src/entities`: tipos do domínio, incluindo pontos enriquecidos.
- `src/middlewares`: JWT, logs de requisição e tratamento de erros.
- `src/config`: variáveis de ambiente e inicialização do banco.

## Autenticação e acesso

Use o token retornado por `register` ou `login` no cabeçalho:

```http
Authorization: Bearer <token>
```

As rotas de cadastro, login e health check são públicas. A raiz `/`, as rotas de conta autenticada e todas as rotas `/api/ml/*` exigem um JWT válido.

O token contém o identificador do usuário no `sub`, o e-mail e uma data de expiração configurada por `JWT_EXPIRES_IN`. Senhas são armazenadas somente como hash bcrypt.

## Rotas da API

### Autenticação e sistema

| Método   | Endpoint             | Acesso  | Descrição                                                                         |
| -------- | -------------------- | ------- | --------------------------------------------------------------------------------- |
| `GET`    | `/`                  | JWT     | Confirma que a API está online.                                                   |
| `POST`   | `/api/auth/register` | Público | Cria uma conta e retorna usuário público + JWT. Aceita `full_name` ou `fullName`. |
| `POST`   | `/api/auth/login`    | Público | Autentica e retorna usuário público + JWT.                                        |
| `PUT`    | `/api/auth/me`       | JWT     | Atualiza nome, e-mail e/ou senha e emite novo JWT.                                |
| `DELETE` | `/api/auth/me`       | JWT     | Exclui a conta autenticada.                                                       |
| `GET`    | `/api/health`        | Público | Verifica a aplicação e executa `SELECT NOW()` no PostgreSQL.                      |

### Machine Learning

As rotas abaixo ficam sob `/api/ml` e são protegidas por JWT. A maioria funciona como proxy para o mesmo caminho na API Python (`ML_API_URL`). Os parâmetros de query são encaminhados ao serviço de origem; quando uma resposta de erro é recebida, o backend preserva o status e o corpo JSON quando possível.

| Método | Endpoint                                          | Finalidade                                                             |
| ------ | ------------------------------------------------- | ---------------------------------------------------------------------- |
| `GET`  | `/api/ml/`                                        | Informações ou resposta raiz da API Python.                            |
| `GET`  | `/api/ml/health`                                  | Health check do serviço de ML.                                         |
| `GET`  | `/api/ml/marine-data`                             | Dados ambientais marinhos.                                             |
| `GET`  | `/api/ml/climatologia?latitude=...&longitude=...` | Climatologia de uma coordenada; latitude e longitude são obrigatórias. |
| `GET`  | `/api/ml/predictions`                             | Predições do modelo.                                                   |
| `POST` | `/api/ml/predict`                                 | Executa uma predição individual; recebe um objeto JSON no corpo.       |
| `GET`  | `/api/ml/forecast`                                | Forecast para uma coordenada.                                          |
| `GET`  | `/api/ml/forecast/janela`                         | Forecast para uma janela de meses.                                     |
| `GET`  | `/api/ml/forecast/meta`                           | Metadados do forecast.                                                 |
| `GET`  | `/api/ml/forecast/regioes`                        | Regiões disponíveis para forecast.                                     |
| `GET`  | `/api/ml/forecast/mapa`                           | Dados de forecast para visualização em mapa.                           |
| `GET`  | `/api/ml/coastal-risks`                           | Riscos costeiros retornados pela API Python.                           |
| `GET`  | `/api/ml/observado`                               | Dados observados, opcionalmente filtrados por mês.                     |
| `GET`  | `/api/ml/condicoes-ambientais`                    | Condições ambientais por região e janela temporal.                     |
| `GET`  | `/api/ml/condicoes-propicias`                     | Condições favoráveis por espécie e região.                             |
| `GET`  | `/api/ml/condicoes-propicias/historico`           | Histórico de condições favoráveis.                                     |
| `GET`  | `/api/ml/teste/meses`                             | Recurso auxiliar da API Python para teste de meses.                    |
| `GET`  | `/api/ml/teste/hindcast`                          | Recurso auxiliar de hindcast, com filtros `emissao` e `versao`.        |

Parâmetros usados com frequência:

- `marine-data`: `limit`.
- `predictions`: `limit` e `horizon`.
- `forecast`: `latitude` e `longitude`.
- `forecast/janela`: `data` e `meses`.
- `forecast/mapa`: `target_date` e `nivel_minimo` (`BAIXO`, `MODERADO` ou `ALTO`).
- `observado`: `mes`.
- `condicoes-ambientais`: `region`, `meses_passados` e `meses`.
- `condicoes-propicias`: `especie` (`Dinophysis` ou `Pseudo-nitzschia`) e `region` (`Litoral Norte`, `Baixada Santista` ou `Litoral Sul`).
- `condicoes-propicias/historico`: `meses`.

Os parâmetros aceitos podem variar conforme a versão da API Python. O backend repassa os parâmetros da rota proxy e retorna `503` quando o serviço de ML está indisponível. A rota `POST /api/ml/predict` exige um objeto JSON e encaminha as features para `/predict`.

## Dados de Machine Learning

Os dados ambientais e de predição podem ser recebidos em formatos equivalentes pela integração. O serviço reconhece, entre outros:

- coordenadas `latitude`/`longitude` ou aliases equivalentes;
- período por `year`/`month` ou por data;
- probabilidade em `probability`, `risk_probability`, `predicted_probability` ou `probabilidade`;
- risco em `risk_level`, `riskLevel`, `level` ou `risk`;
- fatores ambientais agrupados em `environmental_factors` ou `environmentalFactors`.

Quando a camada de enriquecimento é utilizada, cada ponto normalizado contém:

```json
{
  "id": "identificador",
  "latitude": -23.96,
  "longitude": -46.33,
  "region": "Baixada Santista",
  "year": 2026,
  "month": 3,
  "probability": 0.42,
  "risk_level": "MÉDIO",
  "environmental_factors": {
    "temperature_celsius": 24.1,
    "chlorophyll_mg_m3": 1.8,
    "salinity_psu": 34.2
  },
  "model_version": "v1.0"
}
```

O enriquecimento relaciona predição e dados marinhos por coordenadas, ano e mês. A classificação regional usa `Litoral Norte`, `Baixada Santista` e `Litoral Sul`. O nível de risco é normalizado para `BAIXO`, `MÉDIO` ou `ALTO` quando a camada de normalização é aplicada.

## Persistência e histórico

Na inicialização, o backend cria de forma idempotente as tabelas:

- `users`: dados públicos do usuário e hash da senha.
- `prediction_batches`: lote, origem, versão do modelo, hash da fonte e data de criação.
- `predictions`: coordenadas, período, região, probabilidade, risco, fatores ambientais, versão do modelo e relação com o lote.

A persistência de predições usa transação PostgreSQL e hash SHA-256 do conteúdo normalizado para evitar duplicação do mesmo lote. Há índices para período, risco, região, lote e data de criação. O histórico pode ser limpo conforme `ML_HISTORY_RETENTION_DAYS` e `ML_MAX_HISTORY_BATCHES`.

## Cache, timeout e integração com ML

- `ML_API_URL` define a base da API Python.
- Consultas GET sem cabeçalho encaminhado podem ser armazenadas em cache em memória durante `ML_CACHE_TTL_MS`.
- O tempo máximo de uma chamada à API Python é `ML_REQUEST_TIMEOUT_MS`.
- Chamadas autenticadas não são reutilizadas do cache.
- `ML_PREDICTION_CONCURRENCY` limita chamadas simultâneas quando o pipeline de predição individual é utilizado.
- Falhas de rede, timeout ou indisponibilidade retornam uma resposta controlada com status `503` nas rotas proxy.

## Configuração

Todas as variáveis possuem defaults no código, mas os valores de produção devem ser fornecidos pelo ambiente. Não versione arquivos `.env` com segredos reais.

| Variável                    | Finalidade                             | Default                                           |
| --------------------------- | -------------------------------------- | ------------------------------------------------- |
| `NODE_ENV`                  | Ambiente e formato dos logs            | `development`                                     |
| `PORT`                      | Porta HTTP                             | `3000`                                            |
| `LOG_LEVEL`                 | Nível do logger Pino                   | `info`                                            |
| `DB_HOST`                   | Host PostgreSQL                        | `localhost`                                       |
| `DB_PORT`                   | Porta PostgreSQL                       | `5432`                                            |
| `DB_NAME`                   | Nome do banco                          | `algamar`                                         |
| `DB_USER`                   | Usuário PostgreSQL                     | `postgres`                                        |
| `DB_PASSWORD`               | Senha PostgreSQL                       | default de desenvolvimento                        |
| `DB_POOL_MAX`               | Máximo de conexões do pool             | `5`                                               |
| `ML_API_URL`                | URL base da API Python                 | `http://127.0.0.1:8000`                           |
| `ML_API_LIMIT`              | Limite usado na sincronização de dados | `100`                                             |
| `ML_REQUEST_TIMEOUT_MS`     | Timeout das requisições ao ML          | `10000`                                           |
| `ML_CACHE_TTL_MS`           | TTL do cache GET em milissegundos      | `300000`                                          |
| `ML_PREDICTION_CONCURRENCY` | Concorrência de predições individuais  | `5`                                               |
| `ML_HISTORY_RETENTION_DAYS` | Retenção temporal do histórico         | `90`                                              |
| `ML_MAX_HISTORY_BATCHES`    | Número máximo de lotes mantidos        | `1000`                                            |
| `JWT_SECRET`                | Segredo de assinatura dos tokens       | default de desenvolvimento; substitua em produção |
| `JWT_EXPIRES_IN`            | Expiração do JWT                       | `1d`                                              |

## Execução local

Instale as dependências e configure o PostgreSQL e a API Python conforme as variáveis de ambiente:

```bash
npm install
npm run dev
```

Para produção, o fluxo previsto é compilar TypeScript e iniciar `dist/server.js`. A aplicação testa a conexão com o banco e cria as tabelas antes de abrir a porta HTTP.

## Tecnologias

- Node.js e TypeScript
- Express 5
- PostgreSQL e `pg`
- JWT e `jsonwebtoken`
- bcryptjs
- Pino e `pino-pretty`
- CORS

## Princípios de dados

A API Python é a fonte das predições e dos dados ambientais. O backend deve validar, encaminhar, normalizar, enriquecer e persistir esses dados sem substituir o processamento científico do modelo. Valores, versões de modelo e indicadores exibidos aos consumidores devem permanecer rastreáveis à fonte de Machine Learning.
