import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Link2,
  Clock,
  Smartphone,
  TrendingUp,
  Users,
  Shield,
  Calendar,
  CreditCard,
  BarChart
} from "lucide-react";

const features = [
  {
    icon: Link2,
    title: "Página Pública Personalizada",
    description: "Seu link exclusivo (ex: /sua-barbearia) para clientes agendarem em segundos, com design profissional e responsivo."
  },
  {
    icon: Clock,
    title: "Agenda Inteligente",
    description: "Horários fora do expediente são bloqueados automaticamente. Sistema de slots inteligente que evita conflitos."
  },
  {
    icon: Smartphone,
    title: "Notificações Automáticas",
    description: "WhatsApp e email automáticos para confirmações, lembretes e cancelamentos. Mantenha seus clientes informados."
  },
  {
    icon: TrendingUp,
    title: "Dashboard Financeiro",
    description: "Acompanhe faturamento, indicadores de desempenho, histórico de agendamentos e relatórios detalhados."
  },
  {
    icon: Users,
    title: "Gestão de Profissionais",
    description: "Cadastre sua equipe, defina especialidades e horários de trabalho. Cada profissional tem sua agenda."
  },
  {
    icon: Shield,
    title: "Segurança e Confiabilidade",
    description: "Dados protegidos, backup automático e sistema 100% disponível. Sua informação está segura conosco."
  }
];

const additionalFeatures = [
  {
    icon: Calendar,
    title: "Calendário Integrado",
    description: "Visualize todos os agendamentos em um calendário intuitivo com cores por profissional."
  },
  {
    icon: CreditCard,
    title: "Pagamentos Integrados",
    description: "Receba pagamentos online diretamente na plataforma com segurança e praticidade."
  },
  {
    icon: BarChart,
    title: "Relatórios Avançados",
    description: "Analise o desempenho do seu negócio com relatórios detalhados e gráficos interativos."
  }
];

const FeaturesSection = () => {
  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0 }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <section id="recursos" className="container py-20">
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Recursos que fazem a diferença
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Tudo que você precisa para automatizar seu negócio e focar no que realmente importa
        </p>
      </motion.div>

      <motion.div
        className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {features.map((feature, index) => (
          <motion.div key={index} variants={fadeInUp}>
            <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-background to-muted/20 hover:from-primary/5 hover:to-primary/10 group">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Additional features */}
      <motion.div
        className="mt-16 pt-16 border-t border-border/50"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        viewport={{ once: true }}
      >
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-4">E muito mais</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Recursos avançados disponíveis em todos os planos
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          {additionalFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="text-center p-6 rounded-xl bg-background/50 border border-border/50 hover:border-primary/30 transition-colors"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-semibold text-lg mb-2">{feature.title}</h4>
              <p className="text-muted-foreground text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default FeaturesSection;