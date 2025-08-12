import { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign } from 'lucide-react';

interface RevenueData {
  date: string;
  revenue: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  totalRevenue: number;
  period: string;
}

export default function RevenueChart({ data, totalRevenue, period }: RevenueChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    // Encontrar valores máximos
    const maxRevenue = Math.max(...data.map(d => d.revenue));
    const minRevenue = Math.min(...data.map(d => d.revenue));

    // Configurar escala
    const xScale = (width - 2 * padding) / (data.length - 1);
    const yScale = (height - 2 * padding) / (maxRevenue - minRevenue || 1);

    // Desenhar linha de fundo
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Desenhar linha de receita
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = padding + index * xScale;
      const y = height - padding - (point.revenue - minRevenue) * yScale;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Desenhar pontos
    ctx.fillStyle = '#3b82f6';
    data.forEach((point, index) => {
      const x = padding + index * xScale;
      const y = height - padding - (point.revenue - minRevenue) * yScale;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Desenhar labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';

    data.forEach((point, index) => {
      const x = padding + index * xScale;
      const y = height - padding + 20;
      
      // Formatar data
      const date = new Date(point.date);
      const label = date.toLocaleDateString('pt-BR', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      ctx.fillText(label, x, y);
    });

  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          Receita {period}
        </CardTitle>
        <CardDescription>
          Evolução da receita ao longo do tempo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            <span className="text-2xl font-bold">
              R$ {totalRevenue.toLocaleString('pt-BR')}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Total no período</p>
        </div>
        
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={400}
            height={200}
            className="w-full h-48"
          />
        </div>
      </CardContent>
    </Card>
  );
}
