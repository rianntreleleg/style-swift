import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const HeroSection = () => {
  const [spot, setSpot] = useState({ x: "50%", y: "50%" });

  const stats = [
    { value: "500+", label: "Estabelecimentos ativos", delay: 0.4 },
    { value: "10k+", label: "Agendamentos realizados", delay: 0.6 },
    { value: "4.9★", label: "Avaliação dos clientes", delay: 0.8 }
  ];

  return (
    <section
      className="spotlight relative overflow-hidden"
      style={{
        "--spot-x": spot.x,
        "--spot-y": spot.y,
      } as any}
      onMouseMove={(e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setSpot({ x: `${e.clientX - rect.left}px`, y: `${e.clientY - rect.top}px` });
      }}
    >
      <div className="container py-12 lg:py-20 xl:py-32 text-center relative z-10 px-4 lg:px-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center"
        >
          <Badge className="mb-4 px-4 py-2 bg-primary/10 text-primary border-primary/20">
            ✨ Plataforma #1 para Barbearias e Salões
          </Badge>
          <h1 className="text-3xl lg:text-4xl xl:text-6xl font-bold mb-4 lg:mb-6 leading-tight">
            Automatize seus{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              agendamentos
            </span>
            <br />
            em minutos
          </h1>
          <p className="text-lg lg:text-xl text-muted-foreground mb-6 lg:mb-8 max-w-3xl mx-auto leading-relaxed">
            Crie sua página de agendamento profissional. Gerencie clientes, horários e pagamentos tudo em um só lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 lg:mb-12">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <a href="#planos">
                <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-6 text-lg">
                  Selecionar um Plano
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
            </motion.div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: stat.delay }}
                className="text-center"
              >
                <div className="text-3xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;