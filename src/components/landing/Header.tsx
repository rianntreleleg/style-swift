import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const Header = () => {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container py-4 flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <a href="/" className="font-bold text-2xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            StyleSwift
          </a>
        </motion.div>

        <nav className="hidden md:flex items-center gap-8 text-sm">
          <motion.a
            href="#recursos"
            className="text-muted-foreground hover:text-foreground transition-colors"
            whileHover={{ scale: 1.05 }}
          >
            Recursos
          </motion.a>
          <motion.a
            href="#planos"
            className="text-muted-foreground hover:text-foreground transition-colors"
            whileHover={{ scale: 1.05 }}
          >
            Planos
          </motion.a>
          <motion.a
            href="#contato"
            className="text-muted-foreground hover:text-foreground transition-colors"
            whileHover={{ scale: 1.05 }}
          >
            Contato
          </motion.a>
        </nav>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <a href="#planos">
              <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300">
                Começar Grátis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </motion.div>
        </div>
      </div>
    </header>
  );
};

export default Header;