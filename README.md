# Algamar Backend

Backend responsável por receber, organizar, validar e disponibilizar os dados do sistema Algamar. A aplicação funciona como uma camada intermediária entre a API de Machine Learning em Python, o banco de dados PostgreSQL e os consumidores da API.

## Responsabilidades

- Expor uma API HTTP para o sistema Algamar.
- Autenticar usuários e proteger as rotas internas.
- Consultar a API Python de Machine Learning.
- Combinar predições com dados ambientais marinhos.
- Normalizar formatos recebidos de fontes externas.
- Classificar pontos por região e nível de risco.
- Persistir o histórico das sincronizações e das predições.
- Calcular resumos e tendências históricas.
- Disponibilizar dados consistentes para mapas, tabelas e indicadores.

O backend não executa o modelo de Machine Learning. A responsabilidade pela geração das predições permanece com o serviço Python.

## Arquitetura

```text
API Python de Machine Learning
        |
        | /predictions e /marine-data
        v
Backend Algamar
        |
        | validação, enriquecimento e regras de negócio
        v
PostgreSQL
        |
        | dados persistidos e histórico
        v
API do Algamar
```

A implementação é organizada em camadas:

- `routes`: definição dos caminhos HTTP.
- `controllers`: entrada e saída das requisições.
- `services`: regras de negócio e integração com a API Python.
- `repositories`: acesso ao PostgreSQL.
- `entities`: modelos dos dados do domínio.
- `middlewares`: autenticação, logs e tratamento de erros.
- `config`: configuração da aplicação e do banco.

## Integração com a API Python

A integração é realizada pelo serviço de Machine Learning configurado na aplicação. O backend consulta dois conjuntos de dados:

- Predições de risco.
- Dados ambientais marinhos.

As informações são cruzadas principalmente por latitude, longitude, ano e mês. A API Python pode fornecer os dados em diferentes formatos equivalentes, e o backend realiza a normalização antes da persistência.

### Dados de predição esperados

Cada predição pode conter:

- identificador da predição;
- latitude e longitude;
- ano e mês ou uma data equivalente;
- probabilidade de risco;
- nível de risco;
- versão do modelo.

### Dados ambientais esperados

Os dados marinhos podem conter:

- temperatura em graus Celsius;
- clorofila em miligramas por metro cúbico;
- salinidade em PSU;
- latitude e longitude;
- ano e mês ou uma data equivalente.

Os fatores ambientais também podem ser enviados agrupados em um objeto `environmental_factors`.

### Processamento realizado

A cada sincronização, o backend:

1. Consulta `/predictions` para obter as probabilidades e os níveis de risco calculados pelo modelo oficial.
2. Consulta `/marine-data` para obter os fatores ambientais da mesma amostra.
3. Valida os registros recebidos.
4. Cruza os registros por localização e período.
5. Enriquece cada predição com os fatores ambientais correspondentes.
6. Classifica a região costeira para fins de agrupamento geográfico.
7. Preserva o `risk_level` e a `probability` retornados pelo Machine Learning.
8. Persiste o lote e os pontos individuais no PostgreSQL.
9. Consulta o histórico já armazenado.
10. Calcula tendências por ano e mês.
11. Retorna os dados consolidados pela API do Algamar.

O backend não recalcula as probabilidades com features parciais. Isso garante que os valores exibidos sejam os mesmos produzidos pelo modelo e pelos artefatos carregados pela API Python.

Se a API Python retornar erro, JSON inválido ou não responder dentro do tempo limite, o backend utiliza o último histórico válido disponível. Nesse caso, a resposta permanece HTTP 200 e inclui `stale: true`. Quando a sincronização é concluída normalmente, a resposta inclui `stale: false`. Se ainda não houver histórico salvo, a rota retorna erro.

## Banco de dados

O banco utilizado é o PostgreSQL. As tabelas essenciais são criadas automaticamente na inicialização da aplicação, de forma idempotente.

### `users`

Armazena os dados de autenticação dos usuários:

- identificador;
- nome completo;
- email único;
- hash da senha;
- datas de criação e atualização.

A senha nunca é armazenada em texto puro. O backend utiliza bcrypt para gerar o hash.

### `prediction_batches`

Representa cada sincronização realizada com a API Python. Armazena:

- identificador do lote;
- origem dos dados;
- versão do modelo, quando disponível;
- data de criação.

### `predictions`

Armazena cada ponto de predição de forma normalizada e relacionada a um lote. Contém:

- identificador do lote;
- identificador externo da predição;
- latitude e longitude;
- região;
- ano e mês;
- probabilidade;
- nível de risco;
- temperatura;
- clorofila;
- salinidade;
- versão do modelo;
- data de criação.

Existem índices para período, região e nível de risco. Isso permite consultar o histórico e aplicar filtros com melhor desempenho.

### Persistência transacional

A gravação de um lote e dos seus pontos ocorre em uma transação. Se alguma inserção falhar, o lote inteiro é revertido para evitar histórico incompleto.

## Fluxo dos dados

```text
API Python
   |
   | predições + dados ambientais
   v
Normalização e validação
   |
   v
Enriquecimento por localização e período
   |
   v
Criação do lote de sincronização
   |
   v
Persistência dos pontos em predictions
   |
   v
Consulta do histórico
   |
   v
Tendências e resposta consolidada
```

A rota de riscos registra um novo lote somente quando o conteúdo normalizado recebido da API Python é diferente do último conteúdo persistido. Dessa forma, o histórico representa mudanças reais nas sincronizações, sem repetir indefinidamente os mesmos pontos.

Para evitar crescimento desnecessário, o backend calcula um hash do lote normalizado. Se a API Python retornar exatamente os mesmos dados, o lote existente é reutilizado e nenhum ponto é inserido novamente. Lotes antigos também podem ser removidos automaticamente pelas configurações `ML_HISTORY_RETENTION_DAYS` e `ML_MAX_HISTORY_BATCHES`.

## Segurança e configuração

As rotas de autenticação são utilizadas para criar usuários e obter tokens. As demais rotas exigem um token JWT válido. Segredos, senhas e valores específicos de infraestrutura devem ser fornecidos por variáveis de ambiente e não devem ser registrados no README ou no controle de versão.

Variáveis utilizadas pela aplicação:

| Variável         | Finalidade                                 |
| ---------------- | ------------------------------------------ |
| `NODE_ENV`       | Ambiente de execução                       |
| `PORT`           | Porta HTTP da aplicação                    |
| `LOG_LEVEL`      | Nível de detalhamento dos logs             |
| `DB_HOST`        | Endereço do PostgreSQL                     |
| `DB_PORT`        | Porta do PostgreSQL                        |
| `DB_NAME`        | Nome do banco                              |
| `DB_USER`        | Usuário de conexão                         |
| `DB_PASSWORD`    | Senha de conexão                           |
| `ML_API_URL`     | Endereço da API Python de Machine Learning |
| `ML_API_LIMIT`   | Quantidade máxima de registros solicitados à API Python |
| `ML_REQUEST_TIMEOUT_MS` | Tempo limite das requisições à API Python, em milissegundos |
| `ML_PREDICTION_CONCURRENCY` | Limite configurável para chamadas individuais de predição |
| `ML_HISTORY_RETENTION_DAYS` | Número máximo de dias de histórico mantido |
| `ML_MAX_HISTORY_BATCHES` | Número máximo de lotes de histórico mantidos |
| `JWT_SECRET`     | Segredo usado para assinar tokens          |
| `JWT_EXPIRES_IN` | Tempo de expiração dos tokens              |

Os valores dessas variáveis devem ser definidos no ambiente de execução. O arquivo `.env` não deve ser versionado.

## Rotas principais

- `POST /api/auth/register`: cria um usuário.
- `POST /api/auth/login`: autentica um usuário e retorna um token.
- `PUT /api/auth/me`: edita o usuário autenticado.
- `DELETE /api/auth/me`: exclui o usuário autenticado.
- `GET /api/health`: verifica a disponibilidade da aplicação e do banco.
- `GET /api/ml/coastal-risks`: sincroniza, persiste e retorna os riscos costeiros e suas tendências.

As rotas de cadastro e login são públicas. As operações de edição e exclusão
exigem autenticação.

A rota de riscos aceita filtros opcionais por região, nível de risco e mês. O retorno contém resumo geral, tendências históricas, filtros aplicados, pontos enriquecidos e o indicador `stale`.

### Resposta de `/api/ml/coastal-risks`

Os campos `summary` e `data` representam a amostra atual retornada pelo Machine Learning. O campo `trends` é calculado sobre o histórico persistido no PostgreSQL e pode conter mais pontos do que a amostra atual.

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
  "stale": false,
  "data": []
}
```

`trends.high_risk_points` conta os pontos históricos classificados como `ALTO` para cada combinação de ano e mês. Portanto, esse valor não deve ser comparado diretamente com `summary.high_risk_count` sem considerar que as fontes podem ter quantidades e lotes diferentes.

## Tecnologias

- Node.js
- TypeScript
- Express
- PostgreSQL
- `pg`
- bcrypt
- JWT
- Pino

## Princípios de dados

O backend deve trabalhar com dados provenientes de fontes reais e identificáveis. A API Python é a origem das predições e dos dados ambientais; o backend é responsável por validar, relacionar, persistir e disponibilizar essas informações sem substituir o processamento científico do modelo.

A estrutura do banco deve evoluir conforme novos dados reais e novas necessidades de análise forem validados pela equipe do projeto.
