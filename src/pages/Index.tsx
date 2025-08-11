import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, LineChart, Link2, MessageSquare } from "lucide-react";
import { useState } from "react";

const Index = () => {
  const [spot, setSpot] = useState({ x: "50%", y: "50%" });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="container py-4 flex items-center justify-between">
          <a href="/" className="font-bold text-lg">Auto BarberSalon</a>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="/admin">Painel</a>
            <a href="#recursos">Recursos</a>
            <a href="#planos">Planos</a>
          </nav>
          <a href="/admin" className="ml-4">
            <Button variant="hero">Criar minha página grátis</Button>
          </a>
        </div>
      </header>

      <main>
        <section
          className="spotlight"
          style={{
            // @ts-ignore - CSS vars for spotlight
            "--spot-x": spot.x,
            "--spot-y": spot.y,
          }}
          onMouseMove={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setSpot({ x: `${e.clientX - rect.left}px`, y: `${e.clientY - rect.top}px` });
          }}
        >
          <div className="container py-20 md:py-28 text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              Agendamentos que funcionam sozinhos para barbearias e salões
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Link público customizável, agenda inteligente, notificações automáticas e um dashboard financeiro — tudo em um só lugar.
            </p>
            <div className="flex items-center justify-center gap-4">
              <a href="/admin"><Button variant="hero" className="px-8">Criar minha página grátis</Button></a>
              <a href="/barbearia-exemplo"><Button variant="outline" className="px-8">Ver exemplo</Button></a>
            </div>
          </div>
        </section>

        <section id="recursos" className="container py-16 grid gap-6 md:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <Link2 className="h-6 w-6 mb-3" />
              <h3 className="font-semibold mb-2">Página pública por slug</h3>
              <p className="text-sm text-muted-foreground">Seu link exclusivo (ex: /sua-barbearia) para clientes agendarem em segundos.</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <CheckCircle2 className="h-6 w-6 mb-3" />
              <h3 className="font-semibold mb-2">Agenda inteligente</h3>
              <p className="text-sm text-muted-foreground">Horários fora do expediente são bloqueados automaticamente.</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <LineChart className="h-6 w-6 mb-3" />
              <h3 className="font-semibold mb-2">Dashboard financeiro (Pro)</h3>
              <p className="text-sm text-muted-foreground">Acompanhe faturamento e indicadores de desempenho.</p>
            </CardContent>
          </Card>
        </section>

        <section id="planos" className="container py-16">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="theme-barber">
              <CardContent className="p-6">
                <h4 className="font-semibold mb-2">Tema Barbearia</h4>
                <p className="text-sm text-muted-foreground mb-4">Estética dark com detalhes em dourado.</p>
                <Button variant="hero">Ativar</Button>
              </CardContent>
            </Card>
            <Card className="theme-salon">
              <CardContent className="p-6">
                <h4 className="font-semibold mb-2">Tema Salão</h4>
                <p className="text-sm text-muted-foreground mb-4">Estética clean e clara com rosa suave.</p>
                <Button variant="hero">Ativar</Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Automatize seus agendamentos</h2>
          <p className="text-muted-foreground mb-6">e foque no que realmente importa: seus clientes.</p>
          <a href="/admin"><Button variant="hero" className="px-8">Criar minha página grátis</Button></a>
          <p className="mt-3 text-xs text-muted-foreground">Transforme a gestão do seu negócio hoje mesmo!</p>
        </section>
      </main>
    </div>
  );
};

export default Index;
