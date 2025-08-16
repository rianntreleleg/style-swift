import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatBRL } from '@/lib/utils';

interface ComparisonData {
  current: number;
  previous: number;
  label: string;
  color: string;
}

interface ComparisonChartProps {
  data: ComparisonData[];
  title: string;
  description: string;
}

export default function ComparisonChart({ data, title, description }: ComparisonChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurar canvas
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const width = rect.width;
    const height = rect.height;

    // Configurações do gráfico
    const padding = {
      top: 60,
      right: 40,
      bottom: 80,
      left: 80
    };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const barWidth = chartWidth / (data.length * 2 + 1); // Espaço para 2 barras por item + espaçamento

    // Limpar canvas
    ctx.clearRect(0, 0, width, height);

    // Encontrar valores máximos
    const maxValue = Math.max(...data.flatMap(d => [d.current, d.previous]));

    // Desenhar grade de fundo
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (i * chartHeight) / gridLines;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      // Labels do eixo Y
      const value = maxValue - (i * maxValue) / gridLines;
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(formatBRL(value), padding.left - 10, y + 4);
    }

    // Desenhar barras
    data.forEach((item, index) => {
      const x = padding.left + index * (chartWidth / data.length) + (chartWidth / data.length) * 0.1;
      const barSpacing = (chartWidth / data.length) * 0.8 / 2;

      // Barra do período atual
      const currentHeight = (item.current / maxValue) * chartHeight;
      const currentY = height - padding.bottom - currentHeight;
      
      ctx.fillStyle = hoveredBar === index * 2 ? item.color + 'CC' : item.color;
      ctx.fillRect(x, currentY, barSpacing, currentHeight);

      // Barra do período anterior
      const previousHeight = (item.previous / maxValue) * chartHeight;
      const previousY = height - padding.bottom - previousHeight;
      
      ctx.fillStyle = hoveredBar === index * 2 + 1 ? item.color + '80' : item.color + '60';
      ctx.fillRect(x + barSpacing + 5, previousY, barSpacing, previousHeight);

      // Bordas das barras
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, currentY, barSpacing, currentHeight);
      ctx.strokeRect(x + barSpacing + 5, previousY, barSpacing, previousHeight);

      // Labels dos valores
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      
      // Valor atual
      if (currentHeight > 20) {
        ctx.fillText(formatBRL(item.current), x + barSpacing / 2, currentY - 5);
      }
      
      // Valor anterior
      if (previousHeight > 20) {
        ctx.fillText(formatBRL(item.previous), x + barSpacing * 1.5 + 5, previousY - 5);
      }

      // Label do eixo X
      ctx.fillText(item.label, x + barSpacing + 2.5, height - padding.bottom + 20);
    });

    // Adicionar interatividade
    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;

      if (pointerX < padding.left || pointerX > width - padding.right ||
          pointerY < padding.top || pointerY > height - padding.bottom) {
        setHoveredBar(null);
        return;
      }

      const chartX = pointerX - padding.left;
      const itemIndex = Math.floor(chartX / (chartWidth / data.length));
      
      if (itemIndex >= 0 && itemIndex < data.length) {
        const x = padding.left + itemIndex * (chartWidth / data.length) + (chartWidth / data.length) * 0.1;
        const barSpacing = (chartWidth / data.length) * 0.8 / 2;
        
        // Verificar se está sobre a barra atual ou anterior
        if (pointerX >= x && pointerX <= x + barSpacing) {
          setHoveredBar(itemIndex * 2);
        } else if (pointerX >= x + barSpacing + 5 && pointerX <= x + barSpacing * 2 + 5) {
          setHoveredBar(itemIndex * 2 + 1);
        } else {
          setHoveredBar(null);
        }
      } else {
        setHoveredBar(null);
      }
    };

    const handlePointerLeave = () => {
      setHoveredBar(null);
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
    };

  }, [data, hoveredBar]);

  // Calcular estatísticas
  const totalCurrent = data.reduce((sum, item) => sum + item.current, 0);
  const totalPrevious = data.reduce((sum, item) => sum + item.previous, 0);
  const growthRate = totalPrevious > 0 ? ((totalCurrent - totalPrevious) / totalPrevious) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            {title}
          </CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Estatísticas de comparação */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {formatBRL(totalCurrent)}
                </div>
                <div className="text-sm text-muted-foreground">Período Atual</div>
              </div>
              
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {formatBRL(totalPrevious)}
                </div>
                <div className="text-sm text-muted-foreground">Período Anterior</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${
                  growthRate >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {growthRate >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Crescimento</div>
              </div>
            </div>

            {/* Gráfico */}
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="w-full h-80 cursor-pointer"
                style={{ touchAction: 'none' }}
              />
            </div>

            {/* Legenda */}
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span>Período Atual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 bg-opacity-60 rounded"></div>
                <span>Período Anterior</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
