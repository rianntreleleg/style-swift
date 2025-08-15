import { motion } from "framer-motion";
import { Palette, Sparkles, Monitor, Smartphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const themes = [
  {
    title: "Barbearia Clássica",
    description: "Um tema robusto e clássico para o ambiente da barbearia, com cores escuras e tipografia elegante que transmite profissionalismo e tradição.",
    colors: ["#2e2723", "#030202", "#5d4e46"],
    features: ["Tipografia elegante", "Efeitos metálicos", "Layout focado em serviços masculinos"],
    delay: 0.2,
    icon: "💈"
  },
  {
    title: "Salão de Beleza Moderno",
    description: "Um tema leve e moderno, com paleta de cores claras e elementos sofisticados que criam uma atmosfera acolhedora e premium.",
    colors: ["#fce7f3", "#fbcfe8", "#f9a8d4"],
    features: ["Design minimalista", "Elementos florais", "Layout focado em beleza e bem-estar"],
    delay: 0.4,
    icon: "💇‍♀️"
  }
];

const ThemesSection = () => {
  return (
    <section id="temas" className="py-20 lg:py-32 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 max-w-7xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="flex justify-center mb-4">
            <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2 text-sm font-medium">
              <Palette className="w-4 h-4 mr-2" />
              Personalização Premium
            </Badge>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Temas Personalizados
          </h2>
          <p className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
            Crie uma identidade visual única para sua marca com nossos temas profissionais, 
            desenvolvidos especificamente para barbearias e salões de beleza.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {themes.map((theme, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: theme.delay }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="h-full"
            >
              <Card className="h-full border-0 shadow-xl bg-gradient-to-br from-background to-muted/10 hover:shadow-2xl transition-all duration-300 overflow-hidden group">
                <CardContent className="p-8">
                  {/* Theme header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{theme.icon}</div>
                      <h3 className="text-2xl font-bold">{theme.title}</h3>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Popular
                    </Badge>
                  </div>

                  {/* Theme description */}
                  <p className="text-muted-foreground mb-8 leading-relaxed">
                    {theme.description}
                  </p>

                  {/* Color palette */}
                  <div className="mb-8">
                    <h4 className="font-semibold mb-3 flex items-center">
                      <Palette className="w-4 h-4 mr-2" />
                      Paleta de Cores
                    </h4>
                    <div className="flex gap-3">
                      {theme.colors.map((color, colorIndex) => (
                        <div 
                          key={colorIndex}
                          className="w-12 h-12 rounded-lg shadow-md border border-border/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-300"
                          style={{ backgroundColor: color }}
                        >
                          <span className="text-xs font-medium text-white/80 mix-blend-difference">
                            {colorIndex + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mb-8">
                    <h4 className="font-semibold mb-3">Características</h4>
                    <ul className="space-y-2">
                      {theme.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                          </div>
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Preview devices */}
                  <div className="pt-6 border-t border-border/50">
                    <h4 className="font-semibold mb-4 flex items-center">
                      <Monitor className="w-4 h-4 mr-2" />
                      Visualização em Dispositivos
                    </h4>
                    <div className="flex items-end gap-4">
                      <div className="bg-muted/50 rounded-lg p-3 border">
                        <Smartphone className="w-6 h-6 text-muted-foreground" />
                        <p className="text-xs mt-2 text-muted-foreground">Mobile</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 border">
                        <Monitor className="w-6 h-6 text-muted-foreground" />
                        <p className="text-xs mt-2 text-muted-foreground">Desktop</p>
                      </div>
                      <div className="ml-auto text-sm text-muted-foreground/70">
                        Totalmente responsivo
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Additional info */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-full px-6 py-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">
              Todos os planos incluem temas personalizados gratuitamente
            </span>
          </div>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Adapte cores, fontes e layouts conforme sua marca evolui. 
            Atualizações em tempo real sem necessidade de programação.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default ThemesSection;