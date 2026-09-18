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
        | predições e dados marinhos
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

1. Consulta as predições e os dados marinhos.
2. Valida os registros recebidos.
3. Cruza os registros por localização e período.
4. Enriquece cada predição com os fatores ambientais correspondentes.
5. Classifica a região costeira.
6. Normaliza o nível de risco para `ALTO`, `MÉDIO` ou `BAIXO`.
7. Persiste o lote e os pontos individuais no PostgreSQL.
8. Consulta o histórico já armazenado.
9. Calcula tendências por ano e mês.
10. Retorna os dados consolidados pela API do Algamar.

Se a API Python retornar erro, JSON inválido ou não responder dentro do tempo limite, o backend informa a falha e não considera a sincronização concluída.

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

A cada consulta bem-sucedida da rota de riscos, um novo lote é registrado. Dessa forma, o histórico representa as sincronizações realizadas ao longo do tempo.

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
| `JWT_SECRET`     | Segredo usado para assinar tokens          |
| `JWT_EXPIRES_IN` | Tempo de expiração dos tokens              |

Os valores dessas variáveis devem ser definidos no ambiente de execução. O arquivo `.env` não deve ser versionado.

## Rotas principais

- `POST /api/auth/register`: cria um usuário.
- `POST /api/auth/login`: autentica um usuário e retorna um token.
- `GET /api/health`: verifica a disponibilidade da aplicação e do banco.
- `GET /api/ml/coastal-risks`: sincroniza, persiste e retorna os riscos costeiros e suas tendências.

As rotas de autenticação são públicas. As demais exigem autenticação.

A rota de riscos aceita filtros opcionais por região, nível de risco e mês. O retorno contém resumo geral, tendências históricas, filtros aplicados e pontos enriquecidos.

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
