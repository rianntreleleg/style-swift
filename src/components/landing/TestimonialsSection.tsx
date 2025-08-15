import React from 'react';
import { Quote, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Dados de exemplo para os depoimentos mais autoritativos
const testimonials = [
  {
    id: 1,
    name: 'Roberto Almeida',
    business: 'Barbearia Clássica',
    plan: 'Premium',
    rating: 5,
    text: 'Implementamos o StyleSwift há 8 meses e nossos lucros aumentaram 45%. O sistema de agendamento reduziu cancelamentos em 70% e a integração com pagamentos é impecável.',
    avatar: 'https://images.unsplash.com/photo-1703792686383-4f307cbfa544?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    stats: '45% aumento de lucro',
    location: 'São Paulo, SP'
  },
  {
    id: 2,
    name: 'Camila Rodriguez',
    business: 'Salão Bella Vista',
    plan: 'Professional',
    rating: 5,
    text: 'Antes perdíamos 2 horas por dia com agendamentos. Agora, tudo é automático. Clientes elogiam a praticidade e nossa equipe pode focar no atendimento. ROI de 300% no primeiro ano.',
    avatar: 
    'https://images.unsplash.com/photo-1704311193935-cb5b0fcee05c?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    stats: '300% ROI no 1º ano',
    location: 'Curitiba, PR'
  },
  {
    id: 3,
    name: 'Márcio Santos',
    business: 'Barbearia Urbana',
    plan: 'Premium',
    rating: 5,
    text: 'Ferramenta que entrega exatamente o prometido. Painel financeiro nos ajudou a identificar os serviços mais lucrativos e otimizar nossa oferta. Suporte técnico responde em menos de 2 horas.',
    avatar: 'https://images.unsplash.com/photo-1676233442872-761fded02157?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    stats: 'Processos 3x mais rápidos',
    location: 'Belo Horizonte, MG'
  }
];

// Função para definir a cor da badge do plano
const getPlanColor = (plan) => {
  switch (plan.toLowerCase()) {
    case 'premium':
      return 'bg-violet-600 text-violet-50';
    case 'professional':
      return 'bg-blue-600 text-blue-50';
    default:
      return 'bg-gray-500 text-white';
  }
};

export default function TestimonialsSection() {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold text-primary/80 uppercase tracking-widest mb-2 inline-block">
            Resultados Reais
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold mt-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Transformando Negócios
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Donos de barbearias e salões que aumentaram sua receita e eficiência com o StyleSwift
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card
              key={testimonial.id}
              className={`group relative overflow-hidden transition-all duration-500 ease-in-out border-0 shadow-xl hover:shadow-2xl bg-gradient-to-br from-background to-muted/10 ${
                index === 1 ? 'lg:scale-105 lg:z-10' : ''
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
              <CardContent className="p-8 relative z-10">
                {/* Quote icon */}
                <div className="flex justify-between items-start mb-6">
                  <Quote className="h-8 w-8 text-primary/20 transition-transform duration-300 group-hover:scale-110" />
                  <div className="flex items-center gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                </div>

                {/* Testimonial text */}
                <p className="text-lg text-foreground leading-relaxed mb-6 italic">
                  "{testimonial.text}"
                </p>

                {/* Stats badge */}
                <div className="mb-6">
                  <Badge className="bg-green-500/10 text-green-700 dark:text-green-300 border border-green-500/20 px-3 py-1 text-sm font-medium">
                    {testimonial.stats}
                  </Badge>
                </div>

                {/* Client info */}
                <div className="flex items-center gap-4">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-primary/20 shadow-sm"
                  />
                  <div className="flex-1">
                    <h4 className="font-bold text-lg">{testimonial.name}</h4>
                    <p className="text-sm text-muted-foreground font-medium">
                      {testimonial.business}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground/70">
                        {testimonial.location}
                      </p>
                      <Badge className={`${getPlanColor(testimonial.plan)} text-xs px-2 py-1`}>
                        {testimonial.plan}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust indicators */}
        <div className="mt-20 text-center">
          <p className="text-muted-foreground mb-6">
            Confiam no StyleSwift
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-80">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">500+</span>
              <span className="text-muted-foreground">Estabelecimentos</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">4.9/5</span>
              <span className="text-muted-foreground">Avaliação Média</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">98%</span>
              <span className="text-muted-foreground">de Satisfação</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}