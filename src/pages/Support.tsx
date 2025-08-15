import { useState } from "react";
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
  Scissors
} from "lucide-react";
import { motion } from "framer-motion";

const Support = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("help");
  const [searchQuery, setSearchQuery] = useState("");

  // FAQ Data
  const faqs = [
    {
      category: "Conta e Acesso",
      questions: [
        {
          question: "Como faço para recuperar minha senha?",
          answer: "Você pode recuperar sua senha clicando em 'Esqueci minha senha' na página de login. Enviaremos um link para seu email para redefinir a senha."
        },
        {
          question: "Posso alterar o email associado à minha conta?",
          answer: "Sim, você pode alterar o email de acesso na seção de configurações do seu painel administrativo."
        },
        {
          question: "Esqueci meu login. Como posso recuperar?",
          answer: "Use o email cadastrado para solicitar a recuperação de senha. Se não lembrar o email, entre em contato com nosso suporte."
        }
      ]
    },
    {
      category: "Pagamento e Assinatura",
      questions: [
        {
          question: "Quais formas de pagamento vocês aceitam?",
          answer: "Aceitamos cartões de crédito (Visa, Mastercard, Elo) e boletos bancários através do Stripe, nossa plataforma de pagamentos segura."
        },
        {
          question: "Como faço para cancelar minha assinatura?",
          answer: "Você pode cancelar sua assinatura a qualquer momento na seção 'Gerenciar Assinatura' do seu painel administrativo."
        },
        {
          question: "Posso mudar de plano a qualquer momento?",
          answer: "Sim, você pode fazer upgrade ou downgrade do seu plano a qualquer momento. As mudanças são aplicadas imediatamente."
        }
      ]
    },
    {
      category: "Funcionalidades",
      questions: [
        {
          question: "Como configuro os horários de funcionamento?",
          answer: "Na seção 'Horários' do seu painel, você pode definir os horários de abertura e fechamento para cada dia da semana."
        },
        {
          question: "Posso personalizar a página de agendamento?",
          answer: "Sim, você pode personalizar cores, logo e informações da sua página de agendamento na seção 'Configurações'."
        },
        {
          question: "Como adiciono profissionais ao meu estabelecimento?",
          answer: "Vá até a seção 'Profissionais' e clique em 'Adicionar Profissional'. Preencha as informações solicitadas."
        }
      ]
    }
  ];

  // Support categories
  const supportCategories = [
    {
      id: "account",
      title: "Conta e Acesso",
      description: "Problemas com login, senha e acesso à conta",
      icon: User,
      color: "bg-blue-500"
    },
    {
      id: "billing",
      title: "Pagamento e Faturamento",
      description: "Dúvidas sobre cobranças, planos e pagamentos",
      icon: CreditCard,
      color: "bg-green-500"
    },
    {
      id: "features",
      title: "Funcionalidades",
      description: "Ajuda com as funcionalidades do sistema",
      icon: Settings,
      color: "bg-purple-500"
    },
    {
      id: "booking",
      title: "Agendamentos",
      description: "Dúvidas sobre o sistema de agendamentos",
      icon: Calendar,
      color: "bg-orange-500"
    },
    {
      id: "public-page",
      title: "Página Pública",
      description: "Configuração da página de agendamento",
      icon: Building2,
      color: "bg-pink-500"
    },
    {
      id: "other",
      title: "Outros Assuntos",
      description: "Questões não categorizadas",
      icon: HelpCircle,
      color: "bg-gray-500"
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
      type: "Guia"
    },
    {
      title: "Vídeos Tutoriais",
      description: "Aprenda visualmente com nossos tutoriais em vídeo",
      icon: Video,
      link: "#",
      type: "Vídeo"
    },
    {
      title: "Manual Completo",
      description: "Documentação detalhada de todas as funcionalidades",
      icon: FileText,
      link: "#",
      type: "Documento"
    },
    {
      title: "FAQ Completo",
      description: "Respostas para as perguntas mais frequentes",
      icon: HelpCircle,
      link: "#",
      type: "FAQ"
    }
  ];

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // In a real app, this would filter the FAQ or search the knowledge base
      toast({
        title: "Buscando...",
        description: `Procurando por: "${searchQuery}"`,
      });
    }
  };

  // Handle contact form submission
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Mensagem enviada!",
      description: "Nossa equipe entrará em contato em breve.",
    });
    // Reset form in a real implementation
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
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
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Perguntas Frequentes</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Encontre respostas rápidas para as dúvidas mais comuns
              </p>
            </div>

            <div className="grid gap-6">
              {faqs.map((category, index) => (
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
                        <Input id="name" placeholder="Seu nome" required />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="seu@email.com" required />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="subject">Assunto</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um assunto" />
                          </SelectTrigger>
                          <SelectContent>
                            {supportCategories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
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
                          required 
                        />
                      </div>
                      
                      <Button type="submit" className="w-full">
                        <Mail className="h-4 w-4 mr-2" />
                        Enviar Mensagem
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
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
                      toast({
                        title: "Em breve",
                        description: `Conteúdo sobre ${category.title} estará disponível em breve.`,
                      });
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
                      <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground">
                        Explorar
                        <ArrowRight className="h-4 w-4 ml-2" />
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
                                toast({
                                  title: "Em breve",
                                  description: "Este recurso estará disponível em breve.",
                                });
                              }}
                            >
                              Acessar
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

        {/* Emergency Support Banner */}
        <section className="mt-16">
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