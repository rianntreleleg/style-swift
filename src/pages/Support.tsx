import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { 
  HelpCircle, 
  Mail, 
  Phone, 
  MessageSquare, 
  BookOpen, 
  Video, 
  FileText, 
  Clock, 
  Zap, 
  Users, 
  Shield,
  Search,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  User,
  Building2,
  CreditCard,
  Settings,
  Calendar,
  Scissors,
  Lock,
  Crown,
  X
} from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Define types for FAQ structure
interface FAQQuestion {
  question: string;
  answer: string;
}

interface FAQCategory {
  category: string;
  questions: FAQQuestion[];
}

const Support = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("help");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FAQCategory[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [modalContent, setModalContent] = useState<{ title: string; content: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Buscar tenant ID do usuário logado
  useEffect(() => {
    const fetchTenantId = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('tenants')
            .select('id')
            .eq('owner_id', user.id)
            .single();

          if (!error && data) {
            setTenantId(data.id);
          }
        } catch (error) {
          console.error('Erro ao buscar tenant:', error);
        }
      }
    };

    fetchTenantId();
  }, [user]);

  // Usar hook de permissões
  const { planLimits, isLoading: permissionsLoading } = usePermissions(tenantId || undefined);
  const isEssentialPlan = planLimits && !planLimits.has_financial_dashboard;

  // FAQ Data
  const faqs = [
    {
      category: "Conta e Acesso",
      questions: [
        {
          question: "Como faço para recuperar minha senha?",
          answer: "Você pode recuperar sua senha clicando em 'Esqueci minha senha' na página de login. Enviaremos um link para seu email cadastrado para redefinir a senha. O link é válido por 24 horas."
        },
        {
          question: "Posso alterar o email associado à minha conta?",
          answer: "Sim, você pode alterar o email de acesso na seção de configurações do seu painel administrativo. Após a alteração, você receberá um email de confirmação no novo endereço."
        },
        {
          question: "Esqueci meu login. Como posso recuperar?",
          answer: "Use o email cadastrado para solicitar a recuperação de senha na página de login. Se não lembrar o email, entre em contato com nosso suporte através do formulário de contato."
        },
        {
          question: "Como faço para acessar o painel administrativo?",
          answer: "Acesse o painel administrativo através do link styleswift.com.br/admin usando suas credenciais de login. É possível acessar de qualquer dispositivo com navegador moderno."
        },
        {
          question: "Posso ter mais de um usuário administrador?",
          answer: "Nos planos Profissional e Premium, é possível adicionar múltiplos usuários administradores com diferentes níveis de permissão. O plano Essencial permite apenas um usuário administrador."
        }
      ]
    },
    {
      category: "Pagamento e Faturamento",
      questions: [
        {
          question: "Quais formas de pagamento vocês aceitam?",
          answer: "Aceitamos cartões de crédito (Visa, Mastercard, Elo, Hipercard) e boletos bancários através do Stripe, nossa plataforma de pagamentos segura. Todos os pagamentos são processados com criptografia de ponta a ponta."
        },
        {
          question: "Como faço para cancelar minha assinatura?",
          answer: "Você pode cancelar sua assinatura a qualquer momento na seção 'Gerenciar Assinatura' do seu painel administrativo. O cancelamento é imediato, mas você continuará com acesso até o final do período pago."
        },
        {
          question: "Posso mudar de plano a qualquer momento?",
          answer: "Sim, você pode fazer upgrade ou downgrade do seu plano a qualquer momento. As mudanças são aplicadas imediatamente, e o valor proporcional será ajustado na próxima cobrança."
        },
        {
          question: "Receberei nota fiscal dos pagamentos?",
          answer: "Sim, todas as transações geram nota fiscal eletrônica que é enviada automaticamente para o email cadastrado. Você também pode acessar suas notas fiscais na seção de faturamento do painel."
        },
        {
          question: "O que acontece se meu pagamento for recusado?",
          answer: "Se um pagamento for recusado, você receberá um aviso por email e terá 3 dias para atualizar os dados de pagamento. Após esse período, o acesso ao sistema será suspenso até a regularização."
        }
      ]
    },
    {
      category: "Funcionalidades",
      questions: [
        {
          question: "Como configuro os horários de funcionamento?",
          answer: "Na seção 'Horários' do seu painel, você pode definir os horários de abertura e fechamento para cada dia da semana. Também é possível configurar horários especiais para feriados ou eventos."
        },
        {
          question: "Posso personalizar a página de agendamento?",
          answer: "Sim, você pode personalizar cores, logo, informações da empresa e mensagens na sua página de agendamento na seção 'Configurações'. Nos planos Profissional e Premium, é possível também personalizar o domínio."
        },
        {
          question: "Como adiciono profissionais ao meu estabelecimento?",
          answer: "Vá até a seção 'Profissionais' e clique em 'Adicionar Profissional'. Preencha as informações solicitadas como nome, especialidades e disponibilidade. Nos planos Profissional e Premium, você pode adicionar múltiplos profissionais."
        },
        {
          question: "Como funcionam os lembretes automáticos?",
          answer: "O sistema envia lembretes automáticos por WhatsApp e email 24 horas antes do agendamento. Você pode configurar esses lembretes e adicionar mensagens personalizadas na seção de configurações."
        },
        {
          question: "Posso integrar com outras ferramentas?",
          answer: "Nos planos Profissional e Premium, oferecemos integrações com Google Calendar, Outlook e sistemas de gestão. O plano Essencial permite exportação manual de agendamentos."
        }
      ]
    },
    {
      category: "Agendamentos",
      questions: [
        {
          question: "Como os clientes fazem agendamentos?",
          answer: "Os clientes acessam o link personalizado da sua página de agendamento, escolhem serviço, profissional e horário disponível. Após confirmar, recebem um WhatsApp de confirmação."
        },
        {
          question: "Como funciona o bloqueio de horários?",
          answer: "Você pode bloquear horários específicos na agenda para intervalos, reuniões ou indisponibilidade. Basta clicar no horário desejado e selecionar 'Bloquear horário'."
        },
        {
          question: "Posso editar ou cancelar agendamentos?",
          answer: "Sim, você pode editar ou cancelar agendamentos a qualquer momento no painel administrativo. O cliente receberá automaticamente um aviso por WhatsApp sobre a alteração."
        },
        {
          question: "Como funciona o sistema de status dos agendamentos?",
          answer: "Os agendamentos podem ter os status: Agendado, Confirmado, Concluído, Cancelado ou Não Compareceu. O sistema atualiza automaticamente para 'Concluído' 24 horas após o horário agendado."
        },
        {
          question: "Como vejo relatórios de agendamentos?",
          answer: "Na seção de relatórios, você pode visualizar estatísticas de agendamentos por período, profissional, serviço e status. É possível exportar esses dados em formato Excel."
        }
      ]
    },
    {
      category: "Página Pública",
      questions: [
        {
          question: "Como personalizo minha página de agendamento?",
          answer: "Na seção 'Configurações', você pode personalizar logo, cores, informações da empresa, mensagens de boas-vindas e rodapé. Nos planos Profissional e Premium, também pode usar um domínio personalizado."
        },
        {
          question: "Os clientes precisam se cadastrar para agendar?",
          answer: "Não, os clientes podem agendar diretamente informando nome, telefone e email. O sistema cria automaticamente um cadastro para eles, facilitando agendamentos futuros."
        },
        {
          question: "Como funciona a seleção de serviços e profissionais?",
          answer: "Os clientes veem apenas os serviços e profissionais ativos que você cadastrou. Você pode definir quais profissionais realizam quais serviços e configurar duração e preço de cada serviço."
        },
        {
          question: "Posso desativar a página pública temporariamente?",
          answer: "Sim, você pode desativar a página pública a qualquer momento na seção 'Configurações'. Quando desativada, os clientes verão uma mensagem de 'Estabelecimento fechado temporariamente'."
        },
        {
          question: "Como funciona o sistema de avaliações?",
          answer: "Após um agendamento concluído, os clientes recebem um link para avaliar o serviço. As avaliações aparecem na sua página pública (nos planos que permitem) e você pode respondê-las diretamente no painel."
        }
      ]
    },
    {
      category: "Outros Assuntos",
      questions: [
        {
          question: "Como faço backup dos meus dados?",
          answer: "O sistema realiza backups automáticos diários de todos os seus dados. Nos planos Profissional e Premium, você também pode realizar backups manuais e exportar seus dados a qualquer momento na seção 'Backups'."
        },
        {
          question: "O sistema funciona off-line?",
          answer: "O sistema requer conexão com a internet para funcionar. No entanto, os dados são sincronizados automaticamente quando a conexão é restabelecida, garantindo que nenhuma informação seja perdida."
        },
        {
          question: "Como funciona o suporte técnico?",
          answer: "Oferecemos suporte por chat, email e telefone em horário comercial. Usuários dos planos Profissional e Premium têm suporte prioritário e acesso a recursos avançados de ajuda."
        },
        {
          question: "Posso migrar dados de outro sistema?",
          answer: "Sim, oferecemos serviços de migração de dados de outros sistemas. Entre em contato com nosso suporte para obter informações sobre os formatos suportados e o processo de migração."
        },
        {
          question: "Como são tratados meus dados e privacidade?",
          answer: "Seguimos rigorosamente a LGPD e mantemos seus dados em servidores seguros na AWS. Nenhum dado é compartilhado com terceiros sem autorização. Você pode solicitar a exclusão de seus dados a qualquer momento."
        }
      ]
    }
  ];

  // Support categories
  const supportCategories = [
    {
      id: "account",
      title: "Conta e Acesso",
      description: "Gerenciamento de conta, login, senha, permissões e segurança",
      icon: User,
      color: "bg-blue-500",
      content: `Esta seção aborda todas as questões relacionadas à sua conta e acesso ao sistema:

● Gerenciamento de usuários e permissões
● Recuperação de senha e email de acesso
● Configurações de segurança e autenticação
● Perfis de administradores múltiplos
● Histórico de acessos e atividades
● Conformidade com LGPD e proteção de dados

Problemas comuns:
- Não consigo acessar minha conta
- Preciso recuperar minha senha
- Quero adicionar um novo administrador
- Suspeito que minha conta foi acessada por alguém
- Preciso alterar meu email de acesso`
    },
    {
      id: "billing",
      title: "Pagamento e Faturamento",
      description: "Planos, cobranças, métodos de pagamento e questões financeiras",
      icon: CreditCard,
      color: "bg-green-500",
      content: `Tudo sobre planos, pagamentos e questões financeiras:

● Planos disponíveis e suas funcionalidades
● Métodos de pagamento aceitos
● Processo de cobrança e renovação
● Notas fiscais e comprovantes
● Cancelamento e reembolsos
● Upgrade e downgrade de planos
● Descontos e promoções

Questões financeiras:
- Quero mudar meu plano
- Preciso de segunda via de nota fiscal
- Meu cartão foi recusado
- Quero cancelar minha assinatura
- Há um valor incorreto na minha fatura`
    },
    {
      id: "features",
      title: "Funcionalidades",
      description: "Configuração e uso das funcionalidades do sistema",
      icon: Settings,
      color: "bg-purple-500",
      content: `Explore todas as funcionalidades do StyleSwift:

● Configuração de perfis e personalização
● Gestão de serviços e profissionais
● Sistema de horários e disponibilidade
● Integrações com outras ferramentas
● Relatórios e análises
● Configurações avançadas
● Novidades e atualizações

Funcionalidades principais:
- Como configurar meus horários de funcionamento
- Posso personalizar minha página pública?
- Como adiciono novos serviços?
- Onde vejo meus relatórios?
- Como funcionam as integrações?`
    },
    {
      id: "booking",
      title: "Agendamentos",
      description: "Gestão de agendamentos, status, bloqueios e relatórios",
      icon: Calendar,
      color: "bg-orange-500",
      content: `Gerencie todos os aspectos do sistema de agendamentos:

● Criação, edição e cancelamento de agendamentos
● Sistema de status e histórico
● Bloqueio de horários e dias especiais
● Agendamentos recorrentes
● Lembretes automáticos
● Relatórios de agendamentos
● Integraação com calendários externos

Tópicos importantes:
- Como vejo minha agenda diária?
- Preciso bloquear um horário específico
- Cliente não compareceu, como registro?
- Como funcionam os lembretes automáticos?
- Posso exportar meus agendamentos?`
    },
    {
      id: "public-page",
      title: "Página Pública",
      description: "Personalização e configuração da página de agendamento online",
      icon: Building2,
      color: "bg-pink-500",
      content: `Personalize sua página pública de agendamentos:

● Personalização de aparência e branding
● Configuração de domínio personalizado (planos avançados)
● Gestão de informações da empresa
● Configuração de mensagens automáticas
● Integração com redes sociais
● Otimização para dispositivos móveis
● Experiência do cliente e conversão

Configurações importantes:
- Como adiciono meu logotipo?
- Posso usar meu próprio domínio?
- Como personalizo as cores?
- Onde configuro as mensagens de confirmação?
- Minha página está lenta, como otimizar?`
    },
    {
      id: "other",
      title: "Outros Assuntos",
      description: "Questões diversas não categorizadas especificamente",
      icon: HelpCircle,
      color: "bg-gray-500",
      content: `Questões diversas que não se enquadram nas outras categorias:

● Backup e recuperação de dados
● Compatibilidade com dispositivos e navegadores
● Migração de dados de outros sistemas
● LGPD e conformidade regulatória
● Comunidade de usuários e feedback
● Programa de afiliados e parcerias
● Responsividade e performance
● Acessibilidade e usabilidade

Assuntos variados:
- Como faço backup dos meus dados?
- O sistema funciona em tablets?
- Quero migrar de outro sistema
- Como posso dar feedback?
- Há um app para celular?`
    }
  ];

  // Contact methods
  const contactMethods = [
    {
      title: "Chat ao Vivo",
      description: "Atendimento imediato de nossa equipe",
      icon: MessageSquare,
      action: "Iniciar chat",
      available: true,
      responseTime: "Menos de 2 minutos"
    },
    {
      title: "Email de Suporte",
      description: "Suporte por email com ticket de acompanhamento",
      icon: Mail,
      action: "Enviar email",
      available: true,
      responseTime: "Até 4 horas"
    },
    {
      id: "phone",
      title: "Telefone",
      description: "Atendimento por telefone em horário comercial",
      icon: Phone,
      action: "(11) 99999-9999",
      available: true,
      responseTime: "Imediato"
    },
    {
      title: "Base de Conhecimento",
      description: "Artigos e tutoriais detalhados",
      icon: BookOpen,
      action: "Acessar artigos",
      available: true,
      responseTime: "Instantâneo"
    }
  ];

  // Resources
  const resources = [
    {
      title: "Guia de Início Rápido",
      description: "Comece com o pé direito configurando seu estabelecimento",
      icon: Zap,
      link: "#",
      type: "Guia",
      content: `Este guia irá ajudá-lo a configurar seu estabelecimento em minutos:

1. Criação do perfil da empresa
   - Preencha as informações básicas do seu negócio
   - Adicione seu logotipo e personalize as cores
   - Configure seus horários de funcionamento

2. Cadastro de serviços
   - Adicione todos os serviços oferecidos
   - Defina duração e preço para cada serviço
   - Associe serviços aos profissionais adequados

3. Cadastro de profissionais
   - Adicione seus colaboradores ao sistema
   - Defina especialidades e disponibilidade
   - Configure a agenda de cada profissional

4. Personalização da página pública
   - Customize a aparência da sua página de agendamento
   - Adicione informações importantes sobre o estabelecimento
   - Configure mensagens de boas-vindas e confirmação

5. Teste o sistema
   - Faça alguns agendamentos de teste
   - Verifique os lembretes automáticos
   - Confirme o funcionamento da integração com WhatsApp

Em menos de 30 minutos, seu estabelecimento estará pronto para receber agendamentos online!`
    },
    {
      title: "Vídeos Tutoriais",
      description: "Aprenda visualmente com nossos tutoriais em vídeo",
      icon: Video,
      link: "#",
      type: "Vídeo",
      content: `Nossa biblioteca de vídeos tutoriais abrange todas as funcionalidades do sistema:

1. Configuração inicial (12 minutos)
   - Criação do perfil da empresa
   - Configuração de horários de funcionamento
   - Personalização da página pública

2. Gerenciamento de serviços (8 minutos)
   - Cadastro de novos serviços
   - Edição de preços e duração
   - Organização por categorias

3. Gestão de profissionais (10 minutos)
   - Adição de novos profissionais
   - Configuração de disponibilidade
   - Atribuição de especialidades

4. Sistema de agendamentos (15 minutos)
   - Visualização da agenda
   - Criação de novos agendamentos
   - Edição e cancelamento
   - Uso dos diferentes status

5. Relatórios e análises (7 minutos)
   - Interpretação dos gráficos
   - Exportação de dados
   - Análise de desempenho

6. Configurações avançadas (9 minutos)
   - Integrações com outros sistemas
   - Configuração de lembretes
   - Personalização de mensagens automáticas

7. Solução de problemas comuns (5 minutos)
   - Resolução de conflitos de agenda
   - Recuperação de acesso
   - Dúvidas frequentes

Os vídeos estão disponíveis em qualidade HD com narração em português e legendas opcionais.`
    },
    {
      title: "Manual Completo",
      description: "Documentação detalhada de todas as funcionalidades",
      icon: FileText,
      link: "#",
      type: "Documento",
      content: `O manual completo oferece uma visão abrangente de todas as funcionalidades:

PRIMEIROS PASSOS
- Requisitos do sistema
- Criação de conta
- Navegação no painel administrativo
- Conceitos fundamentais

CONFIGURAÇÃO DO ESTABELECIMENTO
- Perfil da empresa
- Horários de funcionamento
- Feriados e dias especiais
- Configurações de notificação

GESTÃO DE SERVIÇOS
- Tipos de serviços
- Categorização
- Preços e promoções
- Duração e intervalos

ADMINISTRAÇÃO DE PROFISSIONAIS
- Perfis de profissionais
- Especialidades e habilidades
- Disponibilidade e folgas
- Comissões e pagamentos

SISTEMA DE AGENDAMENTOS
- Criação de agendamentos
- Edição e cancelamento
- Status e histórico
- Bloqueio de horários
- Agendamentos recorrentes

PÁGINA PÚBLICA DE AGENDAMENTO
- Personalização
- Domínio personalizado (planos avançados)
- Integração com redes sociais
- Formulários personalizados

RECURSOS DE COMUNICAÇÃO
- Integração com WhatsApp
- Envio de emails automáticos
- Lembretes e notificações
- Mensagens personalizadas

RELATÓRIOS E ANÁLISES
- Relatórios financeiros
- Estatísticas de desempenho
- Análise de ocupação
- Exportação de dados

SEGURANÇA E PRIVACIDADE
- Proteção de dados
- Cópias de segurança
- Recuperação de informações
- Conformidade com LGPD

SUPORTE E TROUBLESHOOTING
- Solução de problemas comuns
- Contato com suporte técnico
- Comunidade de usuários
- Atualizações e melhorias`
    },
    {
      title: "FAQ Completo",
      description: "Respostas para as perguntas mais frequentes",
      icon: HelpCircle,
      link: "#",
      type: "FAQ",
      content: `O FAQ completo reúne as dúvidas mais frequentes organizadas por categorias:

CONTA E ACESSO
- Problemas com login e senha
- Recuperação de conta
- Alteração de informações pessoais
- Gerenciamento de usuários

PAGAMENTO E ASSINATURA
- Formas de pagamento aceitas
- Processo de cancelamento
- Mudança de planos
- Cobranças e faturamento

FUNCIONALIDADES DO SISTEMA
- Configuração de horários
- Personalização da página pública
- Gestão de serviços e profissionais
- Integrações com outros sistemas

AGENDAMENTOS
- Criação e edição de agendamentos
- Sistema de status
- Bloqueio de horários
- Agendamentos recorrentes

PÁGINA PÚBLICA
- Personalização da aparência
- Domínio personalizado
- Experiência do cliente
- Avaliações e feedbacks

SUPORTE E TROUBLESHOOTING
- Problemas técnicos comuns
- Tempo de resposta do suporte
- Recursos de ajuda disponíveis
- Comunidade de usuários

SEGURANÇA
- Proteção de dados
- Cópias de segurança
- Conformidade com LGPD
- Recuperação de informações

ATUALIZAÇÕES
- Novas funcionalidades
- Melhorias contínuas
- Notificações de atualizações
- Processo de atualização

Cada dúvida inclui uma explicação detalhada, passos para solução e links para recursos adicionais quando aplicável.`
    }
  ];

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Filter FAQ questions based on search query
      const results = faqs.reduce((acc: FAQCategory[], category) => {
        const filteredQuestions = category.questions.filter(faq => 
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        if (filteredQuestions.length > 0) {
          acc.push({
            category: category.category,
            questions: filteredQuestions
          });
        }
        
        return acc;
      }, [] as FAQCategory[]);
      
      setSearchResults(results);
      setActiveSection("help"); // Switch to help section to show results
      
      if (results.length === 0) {
        toast({
          title: "Nenhum resultado encontrado",
          description: `Não encontramos resultados para: "${searchQuery}"`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Busca concluída",
          description: `Encontramos ${results.reduce((count, cat) => count + cat.questions.length, 0)} resultados para: "${searchQuery}"`,
        });
      }
    }
  };

  // Handle contact form submission
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Criar mensagem para WhatsApp
    const message = `*Nova mensagem de suporte - StyleSwift*

*Nome:* ${contactForm.name}
*Email:* ${contactForm.email}
*Assunto:* ${contactForm.subject}

*Mensagem:*
${contactForm.message}

---
Enviado via formulário de contato do StyleSwift`;

    // Codificar a mensagem para URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/5533991094120?text=${encodedMessage}`;
    
    // Abrir WhatsApp
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: "Mensagem enviada!",
      description: "Abrindo WhatsApp para enviar sua mensagem.",
    });
    
    // Reset form
    setContactForm({
      name: "",
      email: "",
      subject: "",
      message: ""
    });
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setContactForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Open modal with content
  const openModal = (title: string, content: string) => {
    setModalContent({ title, content });
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between py-4">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <Scissors className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">StyleSwift</h1>
              <p className="text-muted-foreground text-sm">Central de Ajuda</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button 
              variant="outline" 
              onClick={() => navigate("/auth")}
            >
              Acessar Conta
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold mb-4">Como podemos ajudar você?</h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Encontre respostas rápidas, entre em contato com nossa equipe ou explore nossos recursos de ajuda.
            </p>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Procure por tópicos, dúvidas ou problemas..."
                  className="pl-10 h-12 text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button 
                  type="submit" 
                  className="absolute right-1 top-1 h-10"
                >
                  Buscar
                </Button>
              </div>
            </form>
            
            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-6 mb-8">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-muted-foreground">95% resolvido no chat</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <span className="text-muted-foreground">Resposta em 2h</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                <span className="text-muted-foreground">Suporte 24h</span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Navigation Tabs */}
        <section className="mb-12">
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
                      variant={activeSection === "help" ? "default" : "outline"}
                      onClick={() => setActiveSection("help")}
                      className="flex items-center gap-2"
                    >
                      <HelpCircle className="h-4 w-4" />
                      Central de Ajuda
                    </Button>
                    <Button
                      variant={activeSection === "contact" ? "default" : "outline"}
                      onClick={() => setActiveSection("contact")}
                      className="flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      Contato
                    </Button>
                    <Button
                      variant={activeSection === "resources" ? "default" : "outline"}
                      onClick={() => setActiveSection("resources")}
                      className="flex items-center gap-2"
                    >
                      <BookOpen className="h-4 w-4" />
                      Recursos
                    </Button>
          </div>
        </section>

        {/* Content Sections */}
        {activeSection === "help" && (
          <>
            {isEssentialPlan && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
              >
                <Card className="border-0 shadow-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                        <Lock className="h-6 w-6 text-yellow-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-yellow-500 mb-2">
                          Suporte Limitado - Plano Essencial
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Usuários do plano Essencial têm acesso limitado ao suporte. 
                          Faça upgrade para o plano Profissional ou Premium para acessar suporte completo.
                        </p>
                        <Button 
                          onClick={() => navigate("/subscription")}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white"
                        >
                          <Crown className="h-4 w-4 mr-2" />
                          Fazer Upgrade
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}
          </>
        )}

        {activeSection === "help" && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">
                {searchQuery ? `Resultados da busca: "${searchQuery}"` : "Perguntas Frequentes"}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {searchQuery 
                  ? `Encontramos ${searchResults.reduce((count, cat) => count + cat.questions.length, 0)} resultados` 
                  : "Encontre respostas rápidas para as dúvidas mais comuns"}
              </p>
            </div>

            <div className="grid gap-6">
              {(searchQuery ? searchResults : faqs).map((category, index) => (
                <Card key={index} className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge variant="secondary">{category.category}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {category.questions.map((faq, faqIndex) => (
                      <div key={faqIndex} className="border-b border-border/50 pb-6 last:border-0 last:pb-0">
                        <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
                        <p className="text-muted-foreground">{faq.answer}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
              
              {searchQuery && searchResults.length === 0 && (
                <Card className="border-0 shadow-lg">
                  <CardContent className="text-center py-12">
                    <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Nenhum resultado encontrado</h3>
                    <p className="text-muted-foreground mb-4">
                      Não encontramos perguntas relacionadas a "{searchQuery}".
                    </p>
                    <Button onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                    }}>
                      Limpar busca
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.section>
        )}

        {activeSection === "contact" && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {isEssentialPlan ? (
              <div className="text-center">
                <Card className="border-0 shadow-lg bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/20 max-w-2xl mx-auto">
                  <CardContent className="p-8">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="h-8 w-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-red-500 mb-4">Contato Bloqueado</h2>
                    <p className="text-muted-foreground mb-6">
                      Usuários do plano Essencial não têm acesso ao suporte por contato direto. 
                      Faça upgrade para o plano Profissional ou Premium para acessar nosso suporte completo.
                    </p>
                    <Button 
                      onClick={() => navigate("/subscription")}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Fazer Upgrade para Acessar Suporte
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-4">Entre em Contato</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Nossa equipe está pronta para ajudar você
                  </p>
                </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Contact Methods */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold">Canais de Atendimento</h3>
                <div className="space-y-4">
                  {contactMethods.map((method, index) => (
                    <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${method.available ? 'bg-primary/10' : 'bg-muted'}`}>
                            <method.icon className={`h-6 w-6 ${method.available ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold flex items-center gap-2">
                              {method.title}
                              {method.available && (
                                <Badge variant="secondary" className="text-xs">
                                  Disponível
                                </Badge>
                              )}
                            </h4>
                            <p className="text-muted-foreground text-sm mb-2">{method.description}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                Tempo médio: {method.responseTime}
                              </span>
                              <Button 
                                variant="outline" 
                                size="sm"
                                disabled={!method.available}
                                onClick={() => {
                                  if (method.title === "Chat ao Vivo") {
                                    toast({
                                      title: "Chat ao Vivo",
                                      description: "Conectando você ao nosso atendente...",
                                    });
                                  } else if (method.title === "Email de Suporte") {
                                    // Abrir cliente de email padrão
                                    window.location.href = "mailto:suporte@styleswift.com.br?subject=Suporte StyleSwift";
                                  } else if (method.title === "Telefone") {
                                    // Fazer chamada telefônica
                                    window.location.href = "tel:+5511999999999";
                                  } else if (method.title === "Base de Conhecimento") {
                                    toast({
                                      title: "Base de Conhecimento",
                                      description: "Direcionando para nossa base de conhecimento...",
                                    });
                                  } else {
                                    toast({
                                      title: "Em breve",
                                      description: "Este canal de atendimento estará disponível em breve.",
                                    });
                                  }
                                }}
                              >
                                {method.action}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Contact Form */}
              <div>
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Envie uma Mensagem
                    </CardTitle>
                    <CardDescription>
                      Preencha o formulário abaixo e nossa equipe entrará em contato
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input 
                          id="name" 
                          placeholder="Seu nome" 
                          value={contactForm.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          required 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="seu@email.com" 
                          value={contactForm.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          required 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="subject">Assunto</Label>
                        <Select value={contactForm.subject} onValueChange={(value) => handleInputChange('subject', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um assunto" />
                          </SelectTrigger>
                          <SelectContent>
                            {supportCategories.map((category) => (
                              <SelectItem key={category.id} value={category.title}>
                                {category.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="message">Mensagem</Label>
                        <Textarea 
                          id="message" 
                          placeholder="Descreva sua dúvida ou problema em detalhes..." 
                          rows={5}
                          value={contactForm.message}
                          onChange={(e) => handleInputChange('message', e.target.value)}
                          required 
                        />
                      </div>
                      
                      <Button type="submit" className="w-full">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Enviar via WhatsApp
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
              </>
            )}
          </motion.section>
        )}

        {activeSection === "resources" && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Recursos de Ajuda</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Materiais e tutoriais para ajudar você a aproveitar ao máximo o StyleSwift
              </p>
            </div>

            {/* Resource Categories */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {supportCategories.map((category, index) => {
                const IconComponent = category.icon;
                return (
                  <Card 
                    key={index} 
                    className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
                    onClick={() => {
                      if (category.title === "Vídeos Tutoriais") {
                        toast({
                          title: "Em desenvolvimento",
                          description: "Esta funcionalidade está em desenvolvimento e estará disponível em breve.",
                          variant: "destructive"
                        });
                      } else {
                        openModal(category.title, category.content || `Conteúdo sobre ${category.title} estará disponível em breve.`);
                      }
                    }}
                  >
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-lg ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle>{category.title}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        variant="outline" 
                        className={`w-full ${
                          category.title === "Vídeos Tutoriais" 
                            ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/30" 
                            : "group-hover:bg-primary group-hover:text-primary-foreground"
                        }`}
                      >
                        {category.title === "Vídeos Tutoriais" ? (
                          <>
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Não acessível
                          </>
                        ) : (
                          <>
                            Explorar
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Learning Resources */}
            <div>
              <h3 className="text-2xl font-semibold mb-6">Materiais de Aprendizado</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {resources.map((resource, index) => {
                  const IconComponent = resource.icon;
                  return (
                    <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-primary/10 rounded-lg">
                            <IconComponent className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">{resource.title}</h4>
                              <Badge variant="secondary">{resource.type}</Badge>
                            </div>
                            <p className="text-muted-foreground text-sm mt-2 mb-4">
                              {resource.description}
                            </p>
                            <Button 
                              variant="outline" 
                              className="w-full"
                              onClick={() => {
                                if (resource.title === "Vídeos Tutoriais") {
                                  toast({
                                    title: "Em desenvolvimento",
                                    description: "Esta funcionalidade está em desenvolvimento e estará disponível em breve.",
                                    variant: "destructive"
                                  });
                                } else {
                                  openModal(resource.title, resource.content || "Conteúdo em breve disponível.");
                                }
                              }}
                            >
                              {resource.title === "Vídeos Tutoriais" ? (
                                <>
                                  <AlertCircle className="h-4 w-4 mr-2" />
                                  Não acessível
                                </>
                              ) : (
                                "Acessar"
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </motion.section>
        )}

        {/* Content Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="text-2xl">{modalContent?.title}</DialogTitle>
              <Button variant="ghost" size="icon" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>
            <div className="py-4">
              {modalContent?.content.split('\n\n').map((paragraph, index) => (
                <div key={index} className="mb-6 last:mb-0">
                  {paragraph.startsWith('●') || paragraph.startsWith('-') ? (
                    // Lista
                    <ul className="list-disc list-inside space-y-2">
                      {paragraph.split('\n').map((item, itemIndex) => (
                        <li key={itemIndex} className="text-muted-foreground">
                          {item.replace('●', '').trim()}
                        </li>
                      ))}
                    </ul>
                  ) : paragraph.startsWith('PRIMEIROS PASSOS') || 
                     paragraph.startsWith('CONFIGURAÇÃO DO ESTABELECIMENTO') ||
                     paragraph.startsWith('GESTÃO DE SERVIÇOS') ||
                     paragraph.startsWith('ADMINISTRAÇÃO DE PROFISSIONAIS') ||
                     paragraph.startsWith('SISTEMA DE AGENDAMENTOS') ||
                     paragraph.startsWith('PÁGINA PÚBLICA DE AGENDAMENTO') ||
                     paragraph.startsWith('RECURSOS DE COMUNICAÇÃO') ||
                     paragraph.startsWith('RELATÓRIOS E ANÁLISES') ||
                     paragraph.startsWith('SEGURANÇA E PRIVACIDADE') ||
                     paragraph.startsWith('SUPORTE E TROUBLESHOOTING') ||
                     paragraph.startsWith('CONTA E ACESSO') ||
                     paragraph.startsWith('PAGAMENTO E ASSINATURA') ||
                     paragraph.startsWith('FUNCIONALIDADES DO SISTEMA') ||
                     paragraph.startsWith('AGENDAMENTOS') ||
                     paragraph.startsWith('PÁGINA PÚBLICA') ||
                     paragraph.startsWith('SUPORTE E TROUBLESHOOTING') ||
                     paragraph.startsWith('SEGURANÇA') ||
                     paragraph.startsWith('ATUALIZAÇÕES') ||
                     paragraph.startsWith('Cada dúvida inclui') ? (
                    // Cabeçalhos em maiúsculo
                    <h3 className="text-xl font-bold mb-3 text-primary">{paragraph}</h3>
                  ) : paragraph.match(/^\d+\./) ? (
                    // Passos numerados
                    <div className="space-y-2">
                      <h4 className="font-semibold text-lg">{paragraph.split('\n')[0]}</h4>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        {paragraph.split('\n').slice(1).map((item, itemIndex) => (
                          <li key={itemIndex} className="text-muted-foreground">
                            {item.replace(/^\s*-\s*/, '').trim()}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    // Parágrafos normais
                    <p className="text-muted-foreground mb-4">{paragraph}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={closeModal}>Fechar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Emergency Support Banner */}
        <section className="mt-16">
          {isEssentialPlan ? (
            <Card className="border-0 shadow-lg bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/20">
              <CardContent className="p-8 text-center">
                <Lock className="h-12 w-12 mx-auto mb-4 text-red-500" />
                <h3 className="text-2xl font-bold mb-2 text-red-500">Ajuda de Emergência Bloqueada</h3>
                <p className="mb-6 max-w-2xl mx-auto text-muted-foreground">
                  Usuários do plano Essencial não têm acesso ao suporte de emergência. 
                  Faça upgrade para acessar nosso suporte prioritário 24h.
                </p>
                <Button 
                  onClick={() => navigate("/subscription")}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Fazer Upgrade para Acessar Suporte de Emergência
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
              <CardContent className="p-8 text-center">
                <Shield className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Precisa de ajuda urgente?</h3>
                <p className="mb-6 max-w-2xl mx-auto">
                  Nossa equipe de suporte prioritário está disponível 24h para resolver problemas críticos.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    variant="secondary" 
                    className="bg-white text-primary hover:bg-gray-100"
                    onClick={() => {
                      toast({
                        title: "Contato de Emergência",
                        description: "Ligando para suporte de emergência: (11) 99999-9999",
                      });
                    }}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Ligar Agora
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-white text-white hover:bg-white/10"
                    onClick={() => setActiveSection("contact")}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat de Emergência
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background mt-16">
        <div className="container py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Scissors className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">StyleSwift</span>
            </div>
            <p className="text-muted-foreground mb-4">
              Automatizando agendamentos para barbearias e salões de beleza
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Termos de Uso
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Política de Privacidade
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                LGPD
              </a>
            </div>
            <p className="text-muted-foreground text-sm mt-6">
              &copy; {new Date().getFullYear()} StyleSwift. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Support;