import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getProductId } from "@/config/stripe";
import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import ThemesSection from "@/components/landing/ThemesSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PricingSection from "@/components/landing/PricingSection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const startCheckout = async (productId: string) => {
    try {
      setLoadingPlan(productId);
      
      // NOVO FLUXO: Redirecionar para página de cadastro
      const planId = productId === 'prod_SqqVGzUIvJPVpt' ? 'essential' : 
                   productId === 'prod_professional' ? 'professional' : 'premium';
      
      // Salvar plano selecionado e redirecionar para cadastro
      localStorage.setItem('planSelected', planId);
      localStorage.setItem('productSelected', productId);
      
      // Redirecionar para página de cadastro onde o usuário escolherá novamente o plano
      window.location.href = '/auth';
      
    } catch (e: any) {
      console.error('Redirect error:', e);
      toast({ 
        title: 'Erro ao redirecionar', 
        description: e.message || 'Erro desconhecido. Tente novamente.', 
        variant: 'destructive' 
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <ThemesSection />
        <TestimonialsSection />
        <PricingSection loadingPlan={loadingPlan} startCheckout={startCheckout} />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
