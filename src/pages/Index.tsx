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
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { usePWA } from "@/hooks/usePWA";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Index = () => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { 
    showBanner, 
    isIOS, 
    isAndroid, 
    isInstallable, 
    showInstallPrompt, 
    dismissBanner,
    isInstalled 
  } = usePWA();

  const startCheckout = async (planId: string) => {
    try {
      setLoadingPlan(planId);
      
      // Salvar plano selecionado e redirecionar para cadastro com plano pré-selecionado
      localStorage.setItem('planSelected', planId);
      
      // Redirecionar para página de cadastro onde o plano já estará selecionado
      window.location.href = `/auth?plan=${planId}`;
      
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
      
        
        {/* PWA Install Card */}
        <section className="py-12 px-4 bg-muted/20">
          <div className="max-w-4xl mx-auto">
            <PWAInstallPrompt variant="card" showBenefits={true} />
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
