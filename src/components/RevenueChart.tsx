import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Calendar, Users, Target } from 'lucide-react';
import { formatBRL } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface RevenueData {
  date: string;
  revenue: number;
  appointments: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  totalRevenue: number;
  period: string;
}

export default function RevenueChart({ data, totalRevenue, period }: RevenueChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [tooltipData, setTooltipData] = useState<{ x: number; y: number; revenue: number; date: string; appointments: number } | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animação de entrada
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationProgress(1);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurar canvas para alta resolução e responsividade
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const width = rect.width;
    const height = rect.height;
    
    // Padding responsivo
    const padding = isMobile ? {
      top: 40,
      right: 20,
      bottom: 60,
      left: 40
    } : {
      top: 60,
      right: 40,
      bottom: 80,
      left: 60
    };

    // Limpar canvas
    ctx.clearRect(0, 0, width, height);

    // Encontrar valores máximos
    const maxRevenue = Math.max(...data.map(d => d.revenue));
    const minRevenue = Math.min(...data.map(d => d.revenue));
    const maxAppointments = Math.max(...data.map(d => d.appointments));

    // Configurar escala
    const xScale = (width - padding.left - padding.right) / (data.length - 1);
    const yScale = (height - padding.top - padding.bottom) / (maxRevenue - minRevenue || 1);

    // Desenhar grade de fundo com animação
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    
    // Linhas horizontais da grade
    const gridLines = isMobile ? 3 : 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (i * (height - padding.top - padding.bottom)) / gridLines;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      // Labels do eixo Y (menores no mobile)
      const value = maxRevenue - (i * (maxRevenue - minRevenue)) / gridLines;
      ctx.fillStyle = '#6b7280';
      ctx.font = isMobile ? '10px system-ui' : '12px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(formatBRL(value), padding.left - 10, y + 4);
    }

    // Linha de base
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    // Desenhar área sob a linha (gradiente) com animação
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.1)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.01)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);

    // Aplicar animação progressiva
    const animatedDataLength = Math.floor(data.length * animationProgress);
    
    for (let i = 0; i < animatedDataLength; i++) {
      const point = data[i];
      const x = padding.left + i * xScale;
      const y = height - padding.bottom - (point.revenue - minRevenue) * yScale;
      
      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.closePath();
    ctx.fill();

    // Desenhar linha de receita com gradiente e animação
    const lineGradient = ctx.createLinearGradient(0, 0, width, 0);
    lineGradient.addColorStop(0, '#3b82f6');
    lineGradient.addColorStop(0.5, '#8b5cf6');
    lineGradient.addColorStop(1, '#06b6d4');

    ctx.strokeStyle = lineGradient;
    ctx.lineWidth = isMobile ? 2 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    for (let i = 0; i < animatedDataLength; i++) {
      const point = data[i];
      const x = padding.left + i * xScale;
      const y = height - padding.bottom - (point.revenue - minRevenue) * yScale;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Desenhar pontos com efeito de hover e animação
    for (let i = 0; i < animatedDataLength; i++) {
      const point = data[i];
      const x = padding.left + i * xScale;
      const y = height - padding.bottom - (point.revenue - minRevenue) * yScale;
      
      const isHovered = hoveredPoint === i;
      const radius = isMobile ? (isHovered ? 6 : 3) : (isHovered ? 8 : 4);
      
      // Sombra do ponto
      if (isHovered) {
        ctx.shadowColor = 'rgba(59, 130, 246, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }
      
      // Círculo de fundo
      ctx.fillStyle = isHovered ? '#ffffff' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(x, y, radius + 2, 0, 2 * Math.PI);
      ctx.fill();
      
      // Círculo interno
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = isHovered ? '#3b82f6' : '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Desenhar labels do eixo X (menores no mobile)
    ctx.fillStyle = '#6b7280';
    ctx.font = isMobile ? '10px system-ui' : '12px system-ui';
    ctx.textAlign = 'center';

    // Mostrar menos labels no mobile para evitar sobreposição
    const labelInterval = isMobile ? Math.max(1, Math.floor(data.length / 5)) : 1;
    
    for (let i = 0; i < data.length; i += labelInterval) {
      const point = data[i];
      const x = padding.left + i * xScale;
      const y = height - padding.bottom + (isMobile ? 15 : 20);
      
      // Formatar data
      const date = new Date(point.date);
      const label = isMobile 
        ? date.toLocaleDateString('pt-BR', { day: 'numeric' })
        : date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
      
      ctx.fillText(label, x, y);
    }

    // Adicionar evento de mouse/touch para interatividade
    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;

      // Encontrar ponto mais próximo
      let closestPoint = -1;
      let minDistance = Infinity;

      data.forEach((point, index) => {
        const x = padding.left + index * xScale;
        const y = height - padding.bottom - (point.revenue - minRevenue) * yScale;
        
        const distance = Math.sqrt((pointerX - x) ** 2 + (pointerY - y) ** 2);
        const threshold = isMobile ? 15 : 20;
        if (distance < minDistance && distance < threshold) {
          minDistance = distance;
          closestPoint = index;
        }
      });

      setHoveredPoint(closestPoint >= 0 ? closestPoint : null);
      
      if (closestPoint >= 0) {
        const point = data[closestPoint];
        const x = padding.left + closestPoint * xScale;
        const y = height - padding.bottom - (point.revenue - minRevenue) * yScale;
        
        setTooltipData({
          x: pointerX,
          y: pointerY,
          revenue: point.revenue,
          date: new Date(point.date).toLocaleDateString('pt-BR'),
          appointments: point.appointments
        });
      } else {
        setTooltipData(null);
      }
    };

    const handlePointerLeave = () => {
      setHoveredPoint(null);
      setTooltipData(null);
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
    };

  }, [data, hoveredPoint, animationProgress, isMobile]);

  // Calcular métricas adicionais
  const avgRevenue = data.length > 0 ? totalRevenue / data.length : 0;
  const totalAppointments = data.reduce((sum, item) => sum + item.appointments, 0);
  const avgAppointments = data.length > 0 ? totalAppointments / data.length : 0;
  const growthRate = data.length >= 2 ? 
    ((data[data.length - 1].revenue - data[data.length - 2].revenue) / data[data.length - 2].revenue) * 100 : 0;

  // Animações de entrada
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  const chartVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Cards de métricas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div variants={cardVariants}>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <motion.div 
                className="flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <DollarSign className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-600">Receita Média</p>
                  <motion.p 
                    className="text-lg font-bold"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    {formatBRL(avgRevenue)}
                  </motion.p>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <motion.div 
                className="flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <Calendar className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-600">Agendamentos</p>
                  <motion.p 
                    className="text-lg font-bold"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    {totalAppointments}
                  </motion.p>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <motion.div 
                className="flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <Users className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-purple-600">Média/Dia</p>
                  <motion.p 
                    className="text-lg font-bold"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                  >
                    {avgAppointments.toFixed(1)}
                  </motion.p>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <motion.div 
                className="flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-600">Crescimento</p>
                  <motion.p 
                    className={`text-lg font-bold ${growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                  >
                    {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
                  </motion.p>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Gráfico principal */}
      <motion.div variants={chartVariants}>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4">
            <motion.div 
              className="flex items-center justify-between"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                  Evolução da Receita
                </CardTitle>
                <CardDescription className="text-base">
                  Últimos {period} dias • Total: {formatBRL(totalRevenue)}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Receita</span>
                </div>
              </div>
            </motion.div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="relative">
              <motion.canvas
                ref={canvasRef}
                className="w-full h-80 cursor-pointer transition-all duration-200"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                style={{ touchAction: 'none' }}
              />
              
              {/* Tooltip */}
              <AnimatePresence>
                {tooltipData && (
                  <motion.div 
                    className="absolute z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 pointer-events-none"
                    style={{
                      left: tooltipData.x + 10,
                      top: tooltipData.y - 60,
                      transform: 'translateX(-50%)'
                    }}
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="text-sm font-medium">{tooltipData.date}</div>
                    <div className="text-lg font-bold text-blue-600">
                      {formatBRL(tooltipData.revenue)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tooltipData.appointments} agendamento(s)
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
