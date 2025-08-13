import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeApplicator } from './ThemeApplicator';
import { 
  Scissors, 
  Heart, 
  Star, 
  Calendar,
  Users,
  TrendingUp,
  Settings
} from 'lucide-react';

export function ThemeDemo() {
  const [currentTheme, setCurrentTheme] = useState<'barber' | 'salon'>('barber');

  return (
    <>
      <ThemeApplicator themeVariant={currentTheme} />
      
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-8">
        <div className="container mx-auto space-y-8">
          {/* Header com seletor de tema */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {currentTheme === 'barber' ? 'Barbearia StyleSwift' : 'Salão StyleSwift'}
              </h1>
              <p className="text-muted-foreground mt-2">
                {currentTheme === 'barber' 
                  ? 'Tema masculino e elegante para barbearias' 
                  : 'Tema feminino e delicado para salões'
                }
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant={currentTheme === 'barber' ? 'default' : 'outline'}
                onClick={() => setCurrentTheme('barber')}
                className="flex items-center gap-2"
              >
                <Scissors className="h-4 w-4" />
                Barbearia
              </Button>
              <Button 
                variant={currentTheme === 'salon' ? 'default' : 'outline'}
                onClick={() => setCurrentTheme('salon')}
                className="flex items-center gap-2"
              >
                <Heart className="h-4 w-4" />
                Salão
              </Button>
            </div>
          </div>

          {/* Cards de demonstração */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Card de Estatísticas */}
            <Card className="card-hover border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Estatísticas
                </CardTitle>
                <CardDescription>
                  Visão geral do seu negócio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Agendamentos Hoje</span>
                  <Badge variant="secondary">12</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Clientes Ativos</span>
                  <Badge variant="secondary">45</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Receita Mensal</span>
                  <Badge className="badge-primary">R$ 2.450</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Card de Serviços */}
            <Card className="card-hover border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-primary" />
                  Serviços
                </CardTitle>
                <CardDescription>
                  Serviços mais populares
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-sm">Corte Masculino</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs">4.9</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-sm">Barba</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs">4.8</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-sm">Hidratação</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs">4.7</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card de Profissionais */}
            <Card className="card-hover border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Profissionais
                </CardTitle>
                <CardDescription>
                  Equipe disponível
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-medium">J</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">João Silva</p>
                    <p className="text-xs text-muted-foreground">Disponível</p>
                  </div>
                  <Badge variant="outline" className="text-xs">Online</Badge>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-medium">M</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Maria Santos</p>
                    <p className="text-xs text-muted-foreground">Ocupada</p>
                  </div>
                  <Badge variant="outline" className="text-xs">Ocupada</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Card de Agendamento */}
            <Card className="card-hover border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Próximo Agendamento
                </CardTitle>
                <CardDescription>
                  Agendamento em andamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Carlos Oliveira</span>
                    <Badge variant="secondary">14:30</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Corte + Barba</p>
                  <p className="text-xs text-muted-foreground">Prof. João Silva</p>
                </div>
                <Button className="w-full button-primary">
                  Ver Detalhes
                </Button>
              </CardContent>
            </Card>

            {/* Card de Configurações */}
            <Card className="card-hover border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Configurações
                </CardTitle>
                <CardDescription>
                  Personalize seu estabelecimento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Nome do Estabelecimento</Label>
                  <Input 
                    id="business-name" 
                    defaultValue={currentTheme === 'barber' ? 'Barbearia Elegante' : 'Salão de Beleza'}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theme">Tema Atual</Label>
                  <Input 
                    id="theme" 
                    value={currentTheme === 'barber' ? 'Barbearia (Dark + Marrom)' : 'Salão (Dark + Rosé)'}
                    disabled
                    className="h-9 bg-muted"
                  />
                </div>
                <Button variant="outline" className="w-full">
                  Salvar Alterações
                </Button>
              </CardContent>
            </Card>

            {/* Card de Informações */}
            <Card className="card-hover border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Informações
                </CardTitle>
                <CardDescription>
                  Dados do seu negócio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Plano Atual</span>
                  <Badge className="badge-primary">Premium</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avaliação</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs ml-1">(4.9)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Ativo
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer com informações do tema */}
          <div className="text-center py-8 border-t border-border">
            <p className="text-muted-foreground">
              Tema atual: <strong>{currentTheme === 'barber' ? 'Barbearia (Dark + Marrom)' : 'Salão (Dark + Rosé)'}</strong>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {currentTheme === 'barber' 
                ? 'Cores: Marrom escuro (#8B4513), Marrom médio (#D2691E), Marrom claro (#CD853F)' 
                : 'Cores: Rosa vibrante (#E91E63), Rosa médio (#FF69B4), Rosa claro (#FFB6C1)'
              }
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
