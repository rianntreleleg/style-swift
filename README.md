## Billing (Stripe) – Setup rápido

1. Variáveis (server-side, Functions/Edge):

```
SUPABASE_URL=https://jsubmkwvqzddgppvgxiu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<coloque sua chave de service role>
STRIPE_SECRET_KEY=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
STRIPE_WEBHOOK_SECRET=<preencher depois>
```

2. Variáveis (frontend):

```
VITE_STRIPE_PUBLISHABLE_KEY=<sua chave publicável>
VITE_STRIPE_PRODUCT_ESSENTIAL=prod_SqqVGzUIvJPVpt
VITE_STRIPE_PRODUCT_PROFESSIONAL=<preencher>
VITE_STRIPE_PRODUCT_PREMIUM=<preencher>
```

3. Webhook da Stripe

- Crie um endpoint público na Function `/stripe-webhook` (ver pasta `supabase/functions`).
- No dashboard da Stripe, em Developers → Webhooks, adicione o endpoint e copie o `Signing secret` para `STRIPE_WEBHOOK_SECRET`.

# StyleSwift - Sistema de Gerenciamento para Barbearias e Salões de Beleza

StyleSwift é uma plataforma SaaS completa para gerenciamento de barbearias e salões de beleza, com foco em performance, usabilidade e recursos avançados.

## 🚀 Funcionalidades Principais

### 📅 **Agendamentos Inteligentes**
- Sistema de agendamento em tempo real
- Bloqueio de horários
- Integração com Google Calendar
- Confirmação automática de agendamentos
- Prevenção de conflitos de horários

### 👥 **Gestão de Clientes**
- Cadastro completo de clientes
- Histórico de serviços
- Aniversariantes do mês
- Fidelização por pontos
- Campanhas de marketing

### 💼 **Gestão de Profissionais**
- Perfis detalhados
- Especialidades e habilidades
- Disponibilidade personalizada
- Comissões configuráveis
- Estatísticas de desempenho

### 💰 **Controle Financeiro**
- Integração com Stripe
- Planos de assinatura
- Relatórios financeiros
- Controle de pagamentos
- Estatísticas de receita

### 📊 **Analytics e Relatórios**
- Dashboards personalizados
- Relatórios em tempo real
- Gráficos interativos
- Métricas de desempenho
- Comparação de períodos

### 🔔 **Sistema de Notificações**
- Notificações em tempo real
- Configurações personalizáveis
- Lembretes automáticos
- Alertas do sistema
- Notificações push

### 🎨 **Interface Moderna**
- Design responsivo
- Temas personalizáveis
- Navegação intuitiva
- Componentes reutilizáveis
- Experiência otimizada para mobile

## 🛠️ Tecnologias Utilizadas

### **Frontend**
- React 18 com TypeScript
- TailwindCSS para estilização
- Shadcn/ui para componentes
- Framer Motion para animações
- React Hook Form para formulários
- Zod para validação
- React Query para gerenciamento de estado
- Lucide React para ícones

### **Backend**
- Supabase (Database, Auth, Storage, Functions)
- PostgreSQL como banco de dados
- Edge Functions para lógica serverless
- Realtime para atualizações em tempo real
- Storage para arquivos

### **Integrações**
- Stripe para pagamentos
- Firebase para push notifications
- Google Calendar API
- Twilio para SMS (futuro)
- WhatsApp Business API (futuro)

## 📦 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
├── hooks/              # Hooks personalizados
├── integrations/       # Integrações com APIs externas
├── lib/                # Funções utilitárias e helpers
├── pages/              # Páginas da aplicação
├── services/           # Serviços para comunicação com APIs
├── store/              # Gerenciamento de estado global
├── types/              # Definições de tipos TypeScript
└── utils/              # Funções utilitárias
```

## 🚀 Como Começar

### **Pré-requisitos**
- Node.js 18+
- npm ou yarn
- Conta no Supabase
- Conta no Stripe (para pagamentos)

### **Instalação**

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/style-swift.git
   cd style-swift
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   # ou
   yarn install
   ```

3. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```
   Edite o arquivo `.env` com suas credenciais.

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   # ou
   yarn dev
   ```

5. **Acesse a aplicação:**
   Abra [http://localhost:8080](http://localhost:8080) no seu navegador.

## 📖 Documentação

### **Documentos Principais**
- [IMPLEMENTACAO_COMPLETA_SISTEMA.md](IMPLEMENTACAO_COMPLETA_SISTEMA.md) - Implementação completa do sistema
- [MELHORIAS_COMPLETAS_IMPLEMENTADAS.md](MELHORIAS_COMPLETAS_IMPLEMENTADAS.md) - Melhorias implementadas
- [NOTIFICATIONS_SYSTEM.md](NOTIFICATIONS_SYSTEM.md) - Sistema de notificações
- [PERMISSIONS_RULES.md](PERMISSIONS_RULES.md) - Regras de permissões
- [PUSH_NOTIFICATIONS_README.md](PUSH_NOTIFICATIONS_README.md) - Push notifications
- [PWA_README.md](PWA_README.md) - Progressive Web App
- [SECURITY_AND_BACKUP_OPTIMIZATION.md](SECURITY_AND_BACKUP_OPTIMIZATION.md) - Segurança e backup
- [SECURITY_TABLES_IMPLEMENTED.md](SECURITY_TABLES_IMPLEMENTED.md) - Tabelas de segurança

### **Atualizações Recentes**
- **Correção do sistema de notificações** (16/08/2025)
  - Atualização das variáveis de ambiente para Firebase
  - Correção dos triggers de notificação no banco de dados
  - Melhoria nas funções RPC para gerenciamento de notificações
  - Adição de função de teste para verificar o sistema
  - Atualização dos componentes de notificação com botão de teste
  - Adição de funções de diagnóstico e reparo automático
  - Correção das políticas de segurança (RLS)

### **Comandos Úteis**
```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview

# Linting
npm run lint

# Type checking
npm run type-check

# Testes
npm run test
```

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

Para suporte, entre em contato através do [nosso site](https://styleswift.com.br) ou abra uma issue no GitHub.

---

**StyleSwift** - Transformando a gestão de barbearias e salões de beleza! 💇‍♂️💇‍♀️
