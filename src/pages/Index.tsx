import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getProductId } from "@/config/stripe";
import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import ThemesSection from "@/components/landing/ThemesSection";
import PricingSection from "@/components/landing/PricingSection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const startCheckout = async (productId: string) => {
    try {
      setLoadingPlan(productId);
      localStorage.setItem('planSelected', productId);
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { productId }
      });
      
      if (error) {
        console.error('Function error:', error);
        throw new Error(error.message || 'Erro na function');
      }
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não recebida');
      }
    } catch (e: any) {
      console.error('Checkout error:', e);
      toast({ 
        title: 'Erro ao iniciar assinatura', 
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
        <PricingSection loadingPlan={loadingPlan} startCheckout={startCheckout} />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
