# Guia de Uso — Atualização do Túnel do Algamar (Windows, WSL e Tailscale)

## 1. Objetivo

Este guia documenta como restaurar o acesso remoto à API do projeto Algamar quando o túnel de rede deixa de funcionar e o navegador apresenta o erro:

```text
ERR_CONNECTION_REFUSED
```

A solução utiliza o script PowerShell já existente:

```text
%USERPROFILE%\atualizar-algamar-portproxy.ps1
```

O script atualiza o encaminhamento de portas do Windows (`portproxy`) para que as conexões recebidas pelo endereço Tailscale do computador sejam direcionadas ao backend do Algamar executado no WSL.

---

## 2. Entendendo a arquitetura

O acesso à API funciona por meio da seguinte comunicação:

```text
Dispositivo cliente
       |
       | Tailscale
       v
Windows
IP Tailscale: 100.109.64.40
Porta: 3000
       |
       | Windows portproxy
       v
WSL (Linux)
IP interno variável
Porta: 3000
       |
       v
Backend Algamar
```

### Função de cada componente

| Componente      | Função                                                                            |
| --------------- | --------------------------------------------------------------------------------- |
| Tailscale       | Cria uma rede privada para permitir a comunicação entre dispositivos autorizados. |
| Windows         | Recebe as conexões destinadas ao endereço Tailscale.                              |
| `portproxy`     | Encaminha as conexões TCP recebidas pelo Windows para o endereço interno do WSL.  |
| WSL             | Executa o ambiente Linux no qual o backend do Algamar pode estar hospedado.       |
| Backend Algamar | Processa as requisições HTTP e disponibiliza as rotas da API.                     |

### Por que o túnel pode parar de funcionar?

No modo de rede padrão do WSL 2, o endereço IPv4 interno do Linux pode mudar após reinicializações ou alterações no ambiente.

Por exemplo:

```text
IP anterior do WSL: 172.28.100.10
IP atual do WSL:    172.28.115.20
```

Se o `portproxy` continuar apontando para `172.28.100.10`, as conexões não chegarão ao backend, mesmo que o Tailscale esteja conectado e a API esteja funcionando dentro do Linux.

O script de atualização existe para corrigir esse tipo de situação, identificando o IP atual do WSL e atualizando a regra de encaminhamento conforme a implementação existente.

---

## 3. Comando para restaurar o túnel

Abra o **Windows PowerShell como administrador** e execute:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "$env:USERPROFILE\atualizar-algamar-portproxy.ps1"
```

Esse é o comando utilizado para atualizar o encaminhamento de portas do Algamar.

### Explicação de cada parte

| Trecho                                               | Significado                                                                                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `powershell.exe`                                     | Inicia uma nova instância do Windows PowerShell.                                                                                                                    |
| `-ExecutionPolicy Bypass`                            | Permite executar o script nessa instância sem aplicar as restrições usuais de execução de scripts do PowerShell. Não altera permanentemente a política de execução. |
| `-File`                                              | Informa que o próximo argumento é o arquivo de script que deve ser executado.                                                                                       |
| `"$env:USERPROFILE\atualizar-algamar-portproxy.ps1"` | Monta o caminho do script usando a pasta de perfil do usuário atual do Windows.                                                                                     |

Por exemplo, se a pasta do usuário for `C:\Users\Joao Rufo`, o caminho completo será:

```text
C:\Users\Joao Rufo\atualizar-algamar-portproxy.ps1
```

As aspas são importantes porque o caminho pode conter espaços.

**Importante:** `-ExecutionPolicy Bypass` não concede privilégios de administrador por si só. O PowerShell deve ser aberto com privilégios elevados caso o script precise modificar regras de encaminhamento protegidas do Windows.

---

## 4. Como utilizar o comando no dia a dia

### Situação A — O túnel parou de funcionar

1. Verifique se o Tailscale está conectado.
2. Verifique se o backend do Algamar está em execução no WSL.
3. Abra o Windows PowerShell como administrador.
4. Execute o comando de atualização do túnel.
5. Observe a saída do script e confirme se não houve erros.
6. Teste novamente a API pelo endereço Tailscale.

### Situação B — O computador ou o WSL foi reiniciado

Após uma reinicialização, o IP interno do WSL pode mudar. Se o encaminhamento não estiver atualizado, execute novamente o comando.

O comando pode ser usado sempre que necessário; ele não exige reinstalar o Tailscale ou recriar o projeto.

### Situação C — O comando não funciona

Confirme se o script existe:

```powershell
Test-Path "$env:USERPROFILE\atualizar-algamar-portproxy.ps1"
```

O resultado esperado é:

```text
True
```

Verifique o endereço atual do WSL:

```powershell
wsl.exe hostname -I
```

Confira as regras de encaminhamento configuradas:

```powershell
netsh interface portproxy show v4tov4
```

Verifique se o backend responde dentro do WSL:

```bash
curl -i http://localhost:3000/api/health
```

Se essa rota não existir, utilize uma rota válida da API.

---

## 5. Como testar se o túnel está funcionando

No Windows PowerShell, execute:

```powershell
Test-NetConnection 127.0.0.1 -Port 3000
```

Depois:

```powershell
Test-NetConnection 100.109.64.40 -Port 3000
```

Procure a propriedade:

```text
TcpTestSucceeded : True
```

O resultado `True` indica que foi possível estabelecer uma conexão TCP com o endereço e a porta testados.

Em seguida, teste uma rota HTTP da API pelo navegador ou com `curl`:

```text
http://100.109.64.40:3000/api/health
```

O endereço acima pressupõe que o IP Tailscale do Windows continue sendo `100.109.64.40` e que a rota `/api/health` exista.

Se o IP Tailscale mudar, utilize o endereço retornado por:

```powershell
tailscale ip -4
```

---

## 6. O comando inicia o backend automaticamente?

**Não necessariamente.**

O comando executa o script PowerShell de atualização do `portproxy`. Sua função principal é corrigir o encaminhamento de rede, e não iniciar a aplicação Node.js, o banco de dados ou o serviço Tailscale.

A inicialização do backend continua dependendo do procedimento configurado no projeto.

Também não se deve presumir que o script configure a inicialização automática do túnel. Isso depende de como ele foi implementado e de eventuais tarefas agendadas ou mecanismos de inicialização já configurados no Windows.

---

## 7. Como evitar que o problema volte a ocorrer

Para reduzir a necessidade de executar o comando manualmente:

- **Manter o backend operacional:** garantir que a aplicação esteja em execução no WSL.
- **Atualizar o encaminhamento:** executar o script depois de alterações de rede ou reinicializações que afetem o IP do WSL.
- **Verificar a inicialização automática:** conferir se o script já possui uma tarefa agendada ou outro mecanismo de execução automática.
- **Validar a regra de encaminhamento:** verificar periodicamente se o destino configurado corresponde ao IP atual do WSL.
- **Conferir o firewall:** garantir que o tráfego TCP na porta 3000 seja permitido somente conforme as necessidades do projeto e da rede privada.

Não é necessário executar o script continuamente sem motivo. A frequência ideal depende da configuração de inicialização e da estabilidade do ambiente WSL.

---

## 8. Segurança

O Tailscale permite acesso por uma rede privada, mas isso não substitui os controles de acesso da aplicação.

Recomendações:

- Mantenha o Tailscale conectado apenas nos dispositivos autorizados.
- Não abra a porta 3000 indiscriminadamente para a internet pública.
- Preserve a autenticação das rotas protegidas da API.
- Evite desativar o firewall do Windows para resolver problemas de conectividade.
- Execute scripts com privilégios administrativos somente quando necessário e após verificar seu conteúdo.

O parâmetro `-ExecutionPolicy Bypass` reduz as restrições de execução de scripts para aquela instância do PowerShell; portanto, utilize-o apenas com scripts confiáveis.

---

## 9. Resumo rápido

Quando o túnel do Algamar apresentar `ERR_CONNECTION_REFUSED`:

1. Confirme se o backend está funcionando no WSL.
2. Abra o PowerShell como administrador.
3. Execute:

   ```powershell
   powershell.exe -ExecutionPolicy Bypass -File "$env:USERPROFILE\atualizar-algamar-portproxy.ps1"
   ```

4. Verifique se o script terminou sem erros.
5. Teste a porta TCP 3000.
6. Acesse novamente a API pelo endereço Tailscale.

### Conclusão

O script `atualizar-algamar-portproxy.ps1` facilita a recuperação do túnel ao atualizar o encaminhamento de portas entre o Windows e o WSL. Ele é especialmente útil quando o endereço IP interno do WSL muda e a regra de encaminhamento deixa de apontar para o destino correto.

A execução bem-sucedida do script, entretanto, não garante sozinha que o backend esteja ativo, que o Tailscale esteja conectado ou que o firewall permita a conexão. Esses componentes devem ser verificados separadamente quando o erro persistir.
