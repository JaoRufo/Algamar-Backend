# 🌊 Algamar Backend

Backend do sistema **Algamar**, desenvolvido como projeto acadêmico para a disciplina de **Análise e Projeto de Sistemas II**.

O Algamar tem como objetivo estruturar e disponibilizar informações relacionadas à **florações de algas tóxicas na costa brasileira**, com foco em **monitoramento preditivo de impactos ambientais e riscos à saúde pública**, utilizando dados reais obtidos por meio da pesquisa e coleta realizada pela equipe do projeto.

> 🚧 **Status atual:** estrutura inicial do backend. A modelagem definitiva do banco de dados e as funcionalidades de negócio serão definidas posteriormente, após a coleta, análise e validação dos dados da pesquisa.

---

## 📚 Sobre o Projeto

O **Algamar** é um projeto desenvolvido por uma equipe de 8 integrantes como parte da disciplina de **Análise e Projeto de Sistemas II**.

O projeto possui caráter de pesquisa e desenvolvimento de software, tendo como requisito fundamental a utilização de **dados reais**, evitando informações fictícias ou dados criados exclusivamente para demonstração.

A aplicação será desenvolvida para organizar, processar e disponibilizar os dados coletados pela equipe, permitindo futuramente sua visualização e utilização por meio de uma interface frontend.

O backend será responsável por:

- disponibilizar uma API;
- realizar a comunicação com o banco de dados;
- processar os dados coletados;
- fornecer informações para o frontend;
- aplicar regras de negócio;
- realizar validações;
- registrar logs das operações;
- garantir uma estrutura preparada para expansão;
- permitir futura implantação em infraestrutura de nuvem.

---

# 🏗️ Arquitetura

A aplicação está sendo estruturada utilizando uma arquitetura separada entre frontend, backend e banco de dados.

```text
┌──────────────────────────────┐
│           FRONTEND           │
│                              │
│ Vue + Quasar                 │
│                              │
│ Interface do sistema         │
└──────────────┬───────────────┘
               │
               │ HTTP / REST API
               │
               ▼
┌──────────────────────────────┐
│           BACKEND            │
│                              │
│ Node.js + TypeScript         │
│ Express                      │
│                              │
│ Regras de negócio            │
│ Validações                   │
│ API                          │
│ Logs                         │
└──────────────┬───────────────┘
               │
               │ PostgreSQL
               │
               ▼
┌──────────────────────────────┐
│          DATABASE            │
│                              │
│ PostgreSQL                   │
│                              │
│ Dados reais da pesquisa      │
└──────────────────────────────┘
💻 Tecnologias
Backend
Node.js
TypeScript
Express
PostgreSQL
Pino
Pino Pretty
dotenv
CORS
Desenvolvimento
WSL
Visual Studio Code
Git
GitHub
Futuro ambiente de produção
O backend e o banco de dados serão posteriormente preparados para execução em infraestrutura de nuvem, com previsão de utilização da Oracle Cloud.
📁 Estrutura do Projeto
algamar-backend/
│
├── src/
│   │
│   ├── config/
│   │   ├── database.ts
│   │   └── env.ts
│   │
│   ├── logger/
│   │   └── logger.ts
│   │
│   ├── middlewares/
│   │   ├── errorHandler.ts
│   │   └── requestLogger.ts
│   │
│   ├── routes/
│   │   └── index.ts
│   │
│   ├── app.ts
│   └── server.ts
│
├── scripts/
│   ├── db-start.sh
│   ├── db-stop.sh
│   ├── db-status.sh
│   └── db-reset.sh
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
├── start.sh
├── stop.sh
├── restart.sh
├── status.sh
└── README.md
⚙️ Requisitos
Para executar o backend localmente, é necessário possuir:
Node.js
npm
PostgreSQL
WSL 2
Git
Visual Studio Code
O desenvolvimento do backend é realizado dentro do WSL, utilizando o Visual Studio Code com a extensão de integração com Linux/WSL.
🚀 Instalação
Clone o repositório:
git clone URL_DO_REPOSITORIO
Entre na pasta:
cd algamar-backend
Instale as dependências:
npm install
🔐 Variáveis de Ambiente
O projeto utiliza variáveis de ambiente para configuração.
Crie o arquivo .env a partir do exemplo:
cp .env.example .env
Configure o arquivo .env:
NODE_ENV=development
PORT=3000

LOG_LEVEL=debug

DB_HOST=localhost
DB_PORT=5432
DB_NAME=algamar
DB_USER=postgres
DB_PASSWORD=
Variáveis
Variável	Descrição
NODE_ENV	Ambiente de execução
PORT	Porta utilizada pelo backend
LOG_LEVEL	Nível mínimo dos logs
DB_HOST	Host do PostgreSQL
DB_PORT	Porta do PostgreSQL
DB_NAME	Nome do banco
DB_USER	Usuário do PostgreSQL
DB_PASSWORD	Senha do PostgreSQL


⚠️ O arquivo .env contém informações de configuração local e não deve ser enviado para o GitHub.

O arquivo .env.example deve permanecer no repositório como referência para configuração do ambiente.
🗄️ Banco de Dados
O projeto utiliza PostgreSQL.
Configuração inicial:
Host:     localhost
Port:     5432
Database: algamar
User:     postgres
Neste estágio inicial, o banco de dados permanece propositalmente sem tabelas e sem estrutura definitiva.
Isso ocorre porque a modelagem será realizada posteriormente, após:
coleta dos dados da pesquisa;
análise dos dados;
definição das informações relevantes;
identificação das entidades;
definição dos relacionamentos;
validação das informações pela equipe.
Dessa forma, evita-se criar uma estrutura de banco baseada em dados fictícios ou em suposições antes da conclusão da pesquisa.
▶️ Executando o Projeto
O projeto possui scripts para facilitar o desenvolvimento.
Iniciar o Algamar
./start.sh
O comando:
verifica o PostgreSQL;
inicia o PostgreSQL caso necessário;
inicia o backend;
disponibiliza a API;
mantém os logs em tempo real no terminal.
🛑 Encerrando o Algamar
Durante o desenvolvimento, basta pressionar:
CTRL + C
O sistema realizará o encerramento dos serviços.
Fluxo:
CTRL + C
     │
     ▼
Backend encerrado
     │
     ▼
PostgreSQL encerrado
🔄 Reiniciar
Para reiniciar o ambiente:
./restart.sh
📊 Verificar Status
Para verificar o ambiente:
./status.sh
O comando apresenta informações relacionadas ao ambiente de desenvolvimento e ao PostgreSQL.
🐘 PostgreSQL
Também é possível controlar o PostgreSQL individualmente.
Iniciar
./scripts/db-start.sh
Parar
./scripts/db-stop.sh
Verificar status
./scripts/db-status.sh
Reset
./scripts/db-reset.sh
⚠️ O script de reset ainda não realiza alterações no banco. Ele existe como preparação para futuras necessidades de desenvolvimento.

🧪 Desenvolvimento
Durante o desenvolvimento, o backend utiliza o modo de execução com tsx watch.
Para iniciar somente o servidor:
npm run dev
🔍 Verificação do TypeScript
Para verificar possíveis erros no código:
npm run check
📦 Build
Para gerar a versão compilada:
npm run build
Os arquivos compilados serão gerados no diretório:
dist/
▶️ Executar Build
Após realizar o build:
npm start
🌐 API
A API atualmente possui uma estrutura inicial para testes.
Servidor:
http://localhost:3000
❤️ Health Check
O endpoint de health check permite verificar o funcionamento do backend e a comunicação com o PostgreSQL.
Endpoint:
GET /api/health
Teste utilizando:
curl http://localhost:3000/api/health
Exemplo de resposta:
{
  "success": true,
  "system": "Algamar",
  "status": "online",
  "database": {
    "status": "online",
    "serverTime": "2026-08-10T00:00:00.000Z"
  }
}
O endpoint é utilizado inicialmente para verificar:
disponibilidade da API;
funcionamento do servidor;
conexão com o PostgreSQL;
execução de consultas no banco.
📋 Logs
O backend utiliza Pino como sistema de logging e Pino Pretty para apresentação dos logs durante o desenvolvimento.
Os logs permitem acompanhar o funcionamento do sistema em tempo real.
São registrados eventos como:
inicialização do servidor;
configuração do ambiente;
conexão com PostgreSQL;
erros de banco de dados;
requests HTTP;
responses HTTP;
tempo de execução;
consultas ao banco;
encerramento do servidor;
erros inesperados.
🆔 Request ID
Cada requisição HTTP recebe um identificador único.
Exemplo:
REQUEST
requestId: 8b3a1f...
GET /api/health
E posteriormente:
RESPONSE
requestId: 8b3a1f...
200
3.42ms
O mesmo identificador permite relacionar diferentes eventos pertencentes à mesma requisição.
Além disso, o ID é disponibilizado através do header:
X-Request-ID
📈 Níveis de Log
O projeto permite configurar o nível de detalhamento através de:
LOG_LEVEL=debug
Os principais níveis utilizados são:
debug
info
warn
error
fatal
Durante o desenvolvimento, o nível debug permite acompanhar informações mais detalhadas.
Em ambientes de produção, o nível poderá ser ajustado conforme a necessidade.
🔒 Segurança dos Logs
Informações sensíveis não devem ser registradas nos logs.
Por exemplo, a senha do PostgreSQL:
DB_PASSWORD
nunca deve aparecer nos logs.
Também deve ser evitado o registro indiscriminado de dados pessoais ou informações sensíveis provenientes dos dados da pesquisa.
🧪 Estado Atual
O projeto encontra-se na fase inicial de desenvolvimento.
Atualmente estão implementados:
estrutura inicial do backend;
servidor Express;
TypeScript;
configuração por variáveis de ambiente;
conexão com PostgreSQL;
pool de conexões;
health check;
middleware de requests;
tratamento inicial de erros;
sistema de logs;
Request ID;
scripts de inicialização;
scripts de gerenciamento do PostgreSQL;
estrutura preparada para expansão.
Ainda não estão implementados:
modelagem definitiva do banco;
tabelas de dados;
entidades;
regras de negócio definitivas;
autenticação;
autorização;
endpoints relacionados aos dados da pesquisa;
funcionalidades definitivas do frontend.
Essas funcionalidades serão definidas conforme a pesquisa e a coleta de dados avançarem.
🔬 Pesquisa e Dados Reais
Um dos principais requisitos do projeto é trabalhar com dados reais.
Consequentemente, as estruturas de dados do sistema não devem ser criadas simplesmente com informações fictícias para preencher o banco.
A definição das entidades, atributos e relacionamentos deverá considerar os dados efetivamente coletados e validados pela equipe responsável pela pesquisa.
O fluxo esperado é:
Pesquisa
   │
   ▼
Coleta de dados reais
   │
   ▼
Validação
   │
   ▼
Análise
   │
   ▼
Modelagem dos dados
   │
   ▼
Banco PostgreSQL
   │
   ▼
API
   │
   ▼
Frontend
🧩 Desenvolvimento Futuro
Conforme o projeto evoluir, o backend deverá receber novos módulos.
Possíveis etapas:
1. Coleta dos dados
        ↓
2. Análise dos dados
        ↓
3. Modelagem do banco
        ↓
4. Criação das migrations
        ↓
5. Criação das entidades
        ↓
6. Repositories
        ↓
7. Services
        ↓
8. Controllers
        ↓
9. Rotas
        ↓
10. Validações
        ↓
11. Integração com frontend
        ↓
12. Testes
        ↓
13. Deploy
A arquitetura deverá ser mantida modular para permitir a evolução do projeto sem necessidade de grandes alterações estruturais.
☁️ Deploy
O ambiente atual é local:
Windows
   │
   └── WSL
        │
        ├── Node.js
        ├── TypeScript
        └── PostgreSQL
Posteriormente, o projeto será preparado para execução em ambiente de nuvem.
A infraestrutura planejada atualmente considera a utilização da Oracle Cloud, permitindo disponibilizar o backend e o banco de dados para acesso do frontend e dos demais integrantes da equipe.
A utilização de variáveis de ambiente facilita a mudança entre:
Desenvolvimento
      ↓
Ambiente de produção
sem necessidade de alterar diretamente o código da aplicação.
👥 Equipe
O projeto é desenvolvido por uma equipe de 8 integrantes, com responsabilidades distribuídas entre pesquisa, levantamento e coleta de dados, análise, desenvolvimento, frontend, backend, banco de dados e demais atividades necessárias para o projeto.
🎓 Contexto Acadêmico
Projeto desenvolvido para a disciplina:
Análise e Projeto de Sistemas II
O desenvolvimento envolve pesquisa, análise, modelagem e implementação de uma solução computacional baseada em dados reais.
🚧 Status
Em desenvolvimento
[████░░░░░░░░░░░░░░░░] Estrutura inicial
As próximas etapas serão definidas conforme os dados da pesquisa forem coletados e validados pela equipe.
📄 Licença
Este projeto foi desenvolvido para fins acadêmicos.
```
