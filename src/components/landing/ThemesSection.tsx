import { motion } from "framer-motion";

const themes = [
  {
    title: "Visual de Barbearia",
    description: "Um tema robusto e clássico para o ambiente da barbearia, com cores escuras e tipografia elegante.",
    colors: ["#1a237e", "#283593", "#3f51b5"],
    delay: 0.2
  },
  {
    title: "Visual de Salão de Beleza",
    description: "Um tema leve e moderno, com paleta de cores claras e elementos sofisticados.",
    colors: ["#f8bbd0", "#f48fb1", "#f06292"],
    delay: 0.4
  }
];

const ThemesSection = () => {
  return (
    <section className="container py-20 text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <h2 className="text-4xl md:text-5xl font-bold mb-4">Temas Personalizados</h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
          Destaque sua marca com layouts modernos, criados para o seu segmento.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8">
        {themes.map((theme, index) => (
          <motion.div
            key={index}
            className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center text-center group"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: theme.delay }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.02 }}
          >
            <h3 className="text-2xl font-semibold mb-4">{theme.title}</h3>
            <p className="text-muted-foreground mb-6">{theme.description}</p>

            {/* Paleta de Cores */}
            <div className="flex justify-center gap-4 mt-6">
              {theme.colors.map((color, colorIndex) => (
                <div 
                  key={colorIndex}
                  className="w-10 h-10 rounded-full shadow-md"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default ThemesSection;