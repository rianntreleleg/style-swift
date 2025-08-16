import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatBRL } from '@/lib/utils';

interface PieData {
  label: string;
  value: number;
  color: string;
  percentage: number;
}

interface PieChartProps {
  data: PieData[];
  title: string;
  description: string;
}

const colors = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

export default function PieChart({ data, title, description }: PieChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);

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

    // Limpar canvas
    ctx.clearRect(0, 0, width, height);

    // Configurações do gráfico
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 60;
    const total = data.reduce((sum, item) => sum + item.value, 0);

    // Desenhar fatias do gráfico
    let currentAngle = -Math.PI / 2; // Começar do topo

    data.forEach((item, index) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      const isHovered = hoveredSlice === index;

      // Desenhar fatia
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius + (isHovered ? 5 : 0), currentAngle, currentAngle + sliceAngle);
      ctx.closePath();

      // Preenchimento com gradiente
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, item.color);
      gradient.addColorStop(1, item.color + '80');
      
      ctx.fillStyle = gradient;
      ctx.fill();

      // Borda
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Texto da porcentagem no centro da fatia
      if (item.percentage > 5) { // Só mostrar se for maior que 5%
        const textAngle = currentAngle + sliceAngle / 2;
        const textRadius = radius * 0.6;
        const textX = centerX + Math.cos(textAngle) * textRadius;
        const textY = centerY + Math.sin(textAngle) * textRadius;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${item.percentage.toFixed(1)}%`, textX, textY);
      }

      currentAngle += sliceAngle;
    });

    // Círculo central
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.3, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Texto central
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Total', centerX, centerY - 5);
    ctx.fillText(formatBRL(total), centerX, centerY + 10);

    // Adicionar interatividade
    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;

      // Calcular distância do centro
      const distance = Math.sqrt(
        Math.pow(pointerX - centerX, 2) + Math.pow(pointerY - centerY, 2)
      );

      if (distance <= radius) {
        // Calcular ângulo
        const angle = Math.atan2(pointerY - centerY, pointerX - centerX);
        if (angle < 0) angle += 2 * Math.PI;

        // Normalizar ângulo para começar do topo
        let normalizedAngle = angle + Math.PI / 2;
        if (normalizedAngle >= 2 * Math.PI) normalizedAngle -= 2 * Math.PI;

        // Encontrar fatia
        let currentAngle = 0;
        for (let i = 0; i < data.length; i++) {
          const sliceAngle = (data[i].value / total) * 2 * Math.PI;
          if (normalizedAngle >= currentAngle && normalizedAngle <= currentAngle + sliceAngle) {
            setHoveredSlice(i);
            return;
          }
          currentAngle += sliceAngle;
        }
      } else {
        setHoveredSlice(null);
      }
    };

    const handlePointerLeave = () => {
      setHoveredSlice(null);
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
    };

  }, [data, hoveredSlice]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-blue-500" />
            {title}
          </CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="w-full h-80 cursor-pointer"
                style={{ touchAction: 'none' }}
              />
            </div>

            {/* Legenda */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {data.map((item, index) => (
                <motion.div
                  key={index}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-200 ${
                    hoveredSlice === index 
                      ? 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  onMouseEnter={() => setHoveredSlice(index)}
                  onMouseLeave={() => setHoveredSlice(null)}
                >
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {item.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatBRL(item.value)} ({item.percentage.toFixed(1)}%)
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
