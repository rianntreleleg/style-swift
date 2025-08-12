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

# StyleSwift - Plataforma de Agendamentos para Barbearias e Salões

Uma plataforma moderna e profissional para barbearias e salões automatizarem seus agendamentos com design elegante, tema escuro e funcionalidades avançadas.

## ✨ Características Principais

### 🎨 Design Profissional
- **Interface moderna** com animações suaves usando Framer Motion
- **Tema escuro/claro** com toggle automático
- **Design responsivo** para todos os dispositivos
- **Gradientes e efeitos visuais** profissionais
- **Glassmorphism** e efeitos de hover elegantes

### 🚀 Funcionalidades Avançadas
- **Página pública personalizada** para cada estabelecimento
- **Sistema de agendamento inteligente** com slots automáticos
- **Gestão de profissionais** e especialidades
- **Dashboard administrativo** completo
- **Notificações automáticas** (preparado para integração)
- **Múltiplos temas** (Barbearia e Salão)

### 💼 Gestão Completa
- **Cadastro de serviços** com preços em reais
- **Gestão de horários** de funcionamento
- **Controle de agendamentos** com status
- **Relatórios e métricas** (preparado para implementação)
- **Configurações personalizáveis**

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: Shadcn/ui + Tailwind CSS
- **Animações**: Framer Motion
- **Formulários**: React Hook Form + Zod
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Roteamento**: React Router DOM
- **Estado**: React Query (TanStack Query)
- **Ícones**: Lucide React

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Conta no Supabase

### Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/style-swift.git
cd style-swift
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o Supabase**
   - Crie um projeto no [Supabase](https://supabase.com)
   - Configure as variáveis de ambiente no arquivo `.env.local`:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

4. **Execute as migrações do banco**
```bash
# Execute este SQL no seu projeto Supabase:
```

```sql
-- Adicionar tabela de horários de funcionamento
CREATE TABLE IF NOT EXISTS public.business_hours (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
    open_time TIME,
    close_time TIME,
    closed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, weekday)
);

-- Adicionar campos ativos nas tabelas existentes
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Adicionar campos de endereço e contato no tenant
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS description TEXT;

-- Adicionar campo de status nos agendamentos
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'));

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_business_hours_tenant_weekday ON public.business_hours(tenant_id, weekday);
CREATE INDEX IF NOT EXISTS idx_services_tenant_active ON public.services(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_professionals_tenant_active ON public.professionals(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_status ON public.appointments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);

-- RLS para business_hours
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

-- Políticas para business_hours
CREATE POLICY "Tenant owners can manage business hours" ON public.business_hours
    FOR ALL USING (
        tenant_id IN (
            SELECT id FROM public.tenants WHERE owner_id = auth.uid()
        )
    );

-- Política para leitura pública dos horários
CREATE POLICY "Public can read business_hours" ON public.business_hours
    FOR SELECT USING (true);

-- Inserir horários padrão para tenants existentes
INSERT INTO public.business_hours (tenant_id, weekday, open_time, close_time, closed)
SELECT 
    t.id,
    weekday,
    CASE 
        WHEN weekday = 0 THEN NULL
        ELSE '09:00'::time
    END as open_time,
    CASE 
        WHEN weekday = 0 THEN NULL
        ELSE '18:00'::time
    END as close_time,
    weekday = 0 as closed
FROM public.tenants t
CROSS JOIN generate_series(0, 6) as weekday
ON CONFLICT (tenant_id, weekday) DO NOTHING;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_business_hours_updated_at 
    BEFORE UPDATE ON public.business_hours 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

5. **Execute o projeto**
```bash
npm run dev
```

O projeto estará disponível em `http://localhost:5173`

## 📱 Como Usar

### Para Barbearias/Salões

1. **Criar conta**: Acesse `/auth` e crie sua conta gratuita
2. **Configurar estabelecimento**: Defina nome, slug e tema
3. **Cadastrar serviços**: Adicione serviços com preços em reais
4. **Adicionar profissionais**: Cadastre sua equipe
5. **Configurar horários**: Defina horários de funcionamento
6. **Compartilhar link**: Seus clientes acessam `/agendamento?tenant=seu-slug`

### Para Clientes

1. **Acessar página**: Use o link compartilhado pela barbearia
2. **Escolher serviço**: Selecione o serviço desejado
3. **Selecionar profissional**: Escolha um profissional (opcional)
4. **Escolher data/horário**: Selecione data e horário disponível
5. **Preencher dados**: Nome e contato
6. **Confirmar agendamento**: Receba confirmação

## 🎨 Temas Disponíveis

### Tema Barbearia
- **Cores**: Dark com detalhes em dourado
- **Estilo**: Moderno e elegante
- **Ideal para**: Barbearias masculinas

### Tema Salão
- **Cores**: Clean com rosa suave
- **Estilo**: Feminino e sofisticado
- **Ideal para**: Salões de beleza

## 🔧 Estrutura do Projeto

```
src/
├── components/
│   ├── ui/                 # Componentes base (shadcn/ui)
│   ├── theme-toggle.tsx    # Toggle de tema escuro/claro
│   └── loading.tsx         # Componentes de loading
├── hooks/
│   ├── useAuth.tsx         # Hook de autenticação
│   └── useTheme.tsx        # Hook de tema
├── integrations/
│   └── supabase/           # Configuração do Supabase
├── lib/
│   └── utils.ts            # Utilitários
├── pages/
│   ├── Index.tsx           # Página inicial
│   ├── Auth.tsx            # Autenticação
│   ├── Admin.tsx           # Dashboard administrativo
│   ├── PublicBooking.tsx   # Página de agendamento público
│   └── NotFound.tsx        # Página 404
└── App.tsx                 # Componente principal
```

## 🚀 Melhorias Implementadas

### ✅ Design e UX
- [x] Tema escuro/claro com toggle
- [x] Animações suaves com Framer Motion
- [x] Design responsivo e moderno
- [x] Gradientes e efeitos visuais
- [x] Componentes de loading elegantes
- [x] Glassmorphism e hover effects

### ✅ Funcionalidades
- [x] Página inicial profissional
- [x] Dashboard administrativo melhorado
- [x] Página de agendamento funcional
- [x] Preços em reais (R$)
- [x] Sistema de horários de funcionamento
- [x] Gestão de profissionais
- [x] Configurações personalizáveis

### ✅ Banco de Dados
- [x] Tabela de horários de funcionamento
- [x] Campos de status para agendamentos
- [x] Campos de endereço e contato
- [x] Índices para performance
- [x] Políticas de segurança (RLS)

### ✅ Performance
- [x] Lazy loading de componentes
- [x] Otimização de imagens
- [x] Índices no banco de dados
- [x] Animações otimizadas

## 🔮 Próximas Melhorias

### Funcionalidades Planejadas
- [ ] Sistema de notificações (WhatsApp/Email)
- [ ] Relatórios e analytics
- [ ] Sistema de pagamentos
- [ ] App mobile (React Native)
- [ ] Integração com Google Calendar
- [ ] Sistema de avaliações
- [ ] Chat em tempo real
- [ ] Backup automático

### Melhorias Técnicas
- [ ] Testes automatizados
- [ ] CI/CD pipeline
- [ ] Monitoramento de performance
- [ ] PWA (Progressive Web App)
- [ ] SEO otimizado
- [ ] Internacionalização (i18n)

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

- **Email**: suporte@styleswift.com
- **Documentação**: [docs.styleswift.com](https://docs.styleswift.com)
- **Issues**: [GitHub Issues](https://github.com/seu-usuario/style-swift/issues)

---

**StyleSwift** - Transformando a gestão de barbearias e salões com tecnologia moderna e design profissional. ✨
