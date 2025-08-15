import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Link2,
  Clock,
  Smartphone,
  TrendingUp,
  Users,
  Shield
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
            <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
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
    </section>
  );
};

export default FeaturesSection;