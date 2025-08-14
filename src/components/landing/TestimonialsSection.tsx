import React from 'react';
import { Quote, Star, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Dados de exemplo para os depoimentos
const testimonials = [
  {
    id: 1,
    name: 'João Silva',
    business: 'Barbearia do João',
    plan: 'Premium',
    rating: 5,
    text: 'A ferramenta mudou a forma como gerencio meu negócio. Agendamentos, pagamentos e clientes, tudo em um só lugar. Recomendo muito!',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0f10720014?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 2,
    name: 'Maria Pereira',
    business: 'Salão da Maria',
    plan: 'Professional',
    rating: 5,
    text: 'Interface intuitiva e fácil de usar. Meus clientes adoram a facilidade de agendar online. O suporte é rápido e eficiente!',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1888&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 3,
    name: 'Carlos Oliveira',
    business: 'Barbearia Estilo',
    plan: 'Professional',
    rating: 5,
    text: 'Uma solução completa que nos poupa muito tempo. Conseguimos focar no que realmente importa: nossos clientes. Valeu cada centavo!',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 4,
    name: 'Fernanda Lima',
    business: 'Salão Beleza Pura',
    plan: 'Premium',
    rating: 5,
    text: 'Funcionalidades incríveis e personalizáveis. A equipe de suporte nos ajudou a configurar tudo do zero e agora nossa operação é muito mais fluida.',
    avatar: 'https://images.unsplash.com/photo-1534528736940-a929729b8c3f?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 5,
    name: 'Ricardo Santos',
    business: 'Barbearia Moderna',
    plan: 'Professional',
    rating: 5,
    text: 'Integração com pagamento, relatórios detalhados e um sistema de agendamento que funciona de verdade. Super recomendo o plano profissional!',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 6,
    name: 'Juliana Costa',
    business: 'Salão Glamour',
    plan: 'Professional',
    rating: 5,
    text: 'Ajudou a aumentar nossa receita e reduzir o tempo gasto com a administração. A melhor decisão que tomamos para nosso salão!',
    avatar: 'https://images.unsplash.com/photo-1549068106-b024baf5062d?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
];

// Função para definir a cor da badge do plano
const getPlanColor = (plan) => {
  switch (plan.toLowerCase()) {
    case 'premium':
      return 'bg-violet-600 text-violet-50 hover:bg-violet-700';
    case 'professional':
      return 'bg-blue-600 text-blue-50 hover:bg-blue-700';
    default:
      return 'bg-gray-500 text-white hover:bg-gray-600';
  }
};

export default function TestimonialsSection() {
  return (
    <section className="py-20 lg:py-32 bg-muted/20">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold text-primary/70 uppercase tracking-widest">
            Depoimentos
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold mt-2">
            O que nossos clientes dizem
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Mais de 500 estabelecimentos já confiam no StyleSwift para gerenciar seus agendamentos, impulsionando seu sucesso.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <Card
              key={testimonial.id}
              className="group relative overflow-hidden transition-all duration-300 ease-in-out border-2 border-transparent hover:border-primary/50 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
              <CardContent className="p-8 relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <Quote className="h-10 w-10 text-primary/20 transition-transform duration-300 group-hover:scale-110" />
                  <div className="flex items-center gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                </div>

                <p className="text-lg text-foreground leading-relaxed mb-6">
                  "{testimonial.text}"
                </p>

                <div className="flex items-center gap-4">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-primary/20"
                  />
                  <div className="flex-1">
                    <h4 className="font-bold text-lg">{testimonial.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.business}
                    </p>
                  </div>
                  <Badge className={getPlanColor(testimonial.plan)}>
                    {testimonial.plan}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}