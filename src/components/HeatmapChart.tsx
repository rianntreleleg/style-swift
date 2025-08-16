import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeatmapData {
  hour: number;
  day: string;
  count: number;
  revenue: number;
}

interface HeatmapChartProps {
  data: HeatmapData[];
  totalRevenue: number;
}

const days = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'];
const dayLabels = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8h às 19h

export default function HeatmapChart({ data, totalRevenue }: HeatmapChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null);

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

    // Configurações do heatmap
    const cellWidth = (width - 120) / hours.length;
    const cellHeight = (height - 80) / days.length;
    const startX = 100;
    const startY = 60;

    // Limpar canvas
    ctx.clearRect(0, 0, width, height);

          // Encontrar valores máximos para normalização
      const maxCount = Math.max(...data.map(d => d.count), 1);
      const maxRevenue = Math.max(...data.map(d => d.revenue), 1);

    // Desenhar células do heatmap
    days.forEach((day, dayIndex) => {
      hours.forEach((hour, hourIndex) => {
        const cellData = data.find(d => d.day === day && d.hour === hour);
        const x = startX + hourIndex * cellWidth;
        const y = startY + dayIndex * cellHeight;

        // Calcular intensidade baseada no número de agendamentos
        const intensity = cellData ? cellData.count / maxCount : 0;
        const revenueIntensity = cellData ? cellData.revenue / maxRevenue : 0;

        // Cor baseada na intensidade
        const alpha = 0.1 + (intensity * 0.8);
        const color = `rgba(59, 130, 246, ${alpha})`;
        
        // Verificar se está hovered
        const isHovered = hoveredCell?.day === dayIndex && hoveredCell?.hour === hourIndex;

        // Desenhar célula
        ctx.fillStyle = isHovered ? 'rgba(59, 130, 246, 0.9)' : color;
        ctx.fillRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);

        // Borda
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellWidth, cellHeight);

        // Texto se há dados
        if (cellData && cellData.count > 0) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(
            `${cellData.count}`,
            x + cellWidth / 2,
            y + cellHeight / 2 + 3
          );
        }
      });
    });

    // Desenhar labels dos dias
    ctx.fillStyle = '#374151';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'right';
    dayLabels.forEach((day, index) => {
      const y = startY + index * cellHeight + cellHeight / 2;
      ctx.fillText(day, startX - 10, y + 4);
    });

    // Desenhar labels das horas
    ctx.textAlign = 'center';
    hours.forEach((hour, index) => {
      const x = startX + index * cellWidth + cellWidth / 2;
      ctx.fillText(`${hour}h`, x, startY - 10);
    });

    // Adicionar interatividade
    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;

      const dayIndex = Math.floor((pointerY - startY) / cellHeight);
      const hourIndex = Math.floor((pointerX - startX) / cellWidth);

      if (dayIndex >= 0 && dayIndex < days.length && 
          hourIndex >= 0 && hourIndex < hours.length) {
        setHoveredCell({ day: dayIndex, hour: hourIndex });
      } else {
        setHoveredCell(null);
      }
    };

    const handlePointerLeave = () => {
      setHoveredCell(null);
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
    };

  }, [data, hoveredCell]);

  // Calcular estatísticas
  const totalAppointments = data.reduce((sum, item) => sum + item.count, 0);
  const avgAppointmentsPerHour = totalAppointments / (days.length * hours.length);
  const peakHour = data.length > 0 ? data.reduce((max, item) => item.count > max.count ? item : max, data[0]) : null;
  const peakDay = data.length > 0 ? data.reduce((max, item) => item.count > max.count ? item : max, data[0]) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Heatmap de Horários
          </CardTitle>
          <CardDescription>
            Horários mais procurados por dia da semana
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
              
              {/* Tooltip */}
              {hoveredCell && (() => {
                const cellData = data.find(d => 
                  d.day === days[hoveredCell.day] && 
                  d.hour === hours[hoveredCell.hour]
                );
                return (
                  <div className="absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 pointer-events-none z-10">
                    <div className="text-sm font-medium">
                      {dayLabels[hoveredCell.day]} às {hours[hoveredCell.hour]}h
                    </div>
                    {cellData ? (
                      <>
                        <div className="text-lg font-bold text-blue-600">
                          {cellData.count} agendamentos
                        </div>
                        <div className="text-sm text-muted-foreground">
                          R$ {(cellData.revenue / 100).toFixed(2)}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Nenhum agendamento
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                             <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                 <div className="text-2xl font-bold text-blue-600">
                   {peakHour ? `${peakHour.hour}h` : 'N/A'}
                 </div>
                 <div className="text-sm text-muted-foreground">Horário de Pico</div>
               </div>
               
               <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                 <div className="text-2xl font-bold text-green-600">
                   {peakDay ? (dayLabels[days.indexOf(peakDay.day)] || peakDay.day.charAt(0).toUpperCase() + peakDay.day.slice(1).replace('-feira', '')) : 'N/A'}
                 </div>
                 <div className="text-sm text-muted-foreground">Dia Mais Movimentado</div>
               </div>
              
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {avgAppointmentsPerHour.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Média/Hora</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
