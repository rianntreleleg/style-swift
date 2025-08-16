import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Calendar, Users, BarChart3 } from 'lucide-react';
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
  const [selectedSeries, setSelectedSeries] = useState<'revenue' | 'appointments' | 'both'>('both');

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
      top: 60,
      right: 40,
      bottom: 80,
      left: 60
    } : {
      top: 80,
      right: 60,
      bottom: 100,
      left: 80
    };

    // Limpar canvas
    ctx.clearRect(0, 0, width, height);

    // Encontrar valores máximos para normalização
    const maxRevenue = Math.max(...data.map(d => d.revenue));
    const minRevenue = Math.min(...data.map(d => d.revenue));
    const maxAppointments = Math.max(...data.map(d => d.appointments));
    const minAppointments = Math.min(...data.map(d => d.appointments));

    // Configurar escala
    const xScale = (width - padding.left - padding.right) / (data.length - 1);
    const yRevenueScale = (height - padding.top - padding.bottom) / (maxRevenue - minRevenue || 1);
    const yAppointmentsScale = (height - padding.top - padding.bottom) / (maxAppointments - minAppointments || 1);

    // Desenhar grade de fundo com estilo futurista
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.lineWidth = 1;
    
    // Linhas horizontais da grade
    const gridLines = isMobile ? 4 : 6;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (i * (height - padding.top - padding.bottom)) / gridLines;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      // Labels do eixo Y para receita
      const revenueValue = maxRevenue - (i * (maxRevenue - minRevenue)) / gridLines;
      ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.font = isMobile ? '10px system-ui' : '12px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(formatBRL(revenueValue), padding.left - 10, y + 4);
    }

    // Linha de base
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    // Aplicar animação progressiva
    const animatedDataLength = Math.floor(data.length * animationProgress);

    // Desenhar área sob a linha de receita (gradiente) com animação
    if (selectedSeries === 'revenue' || selectedSeries === 'both') {
      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
      gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.1)');
      gradient.addColorStop(1, 'rgba(6, 182, 212, 0.05)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(padding.left, height - padding.bottom);

      for (let i = 0; i < animatedDataLength; i++) {
        const point = data[i];
        const x = padding.left + i * xScale;
        const y = height - padding.bottom - (point.revenue - minRevenue) * yRevenueScale;
        
        if (i === 0) {
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.lineTo(width - padding.right, height - padding.bottom);
      ctx.closePath();
      ctx.fill();
    }

    // Desenhar linha de receita com gradiente e animação
    if (selectedSeries === 'revenue' || selectedSeries === 'both') {
      const lineGradient = ctx.createLinearGradient(0, 0, width, 0);
      lineGradient.addColorStop(0, '#3b82f6');
      lineGradient.addColorStop(0.3, '#8b5cf6');
      lineGradient.addColorStop(0.7, '#06b6d4');
      lineGradient.addColorStop(1, '#3b82f6');

      ctx.strokeStyle = lineGradient;
      ctx.lineWidth = isMobile ? 3 : 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      for (let i = 0; i < animatedDataLength; i++) {
        const point = data[i];
        const x = padding.left + i * xScale;
        const y = height - padding.bottom - (point.revenue - minRevenue) * yRevenueScale;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    }

    // Desenhar linha de agendamentos (segunda série)
    if (selectedSeries === 'appointments' || selectedSeries === 'both') {
      const appointmentsGradient = ctx.createLinearGradient(0, 0, width, 0);
      appointmentsGradient.addColorStop(0, '#10b981');
      appointmentsGradient.addColorStop(0.5, '#84cc16');
      appointmentsGradient.addColorStop(1, '#10b981');

      ctx.strokeStyle = appointmentsGradient;
      ctx.lineWidth = isMobile ? 2 : 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([5, 5]); // Linha tracejada para agendamentos
      ctx.beginPath();

      for (let i = 0; i < animatedDataLength; i++) {
        const point = data[i];
        const x = padding.left + i * xScale;
        const y = height - padding.bottom - (point.appointments - minAppointments) * yAppointmentsScale;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash
    }

    // Desenhar pontos com efeito de hover e animação
    for (let i = 0; i < animatedDataLength; i++) {
      const point = data[i];
      const x = padding.left + i * xScale;
      const yRevenue = height - padding.bottom - (point.revenue - minRevenue) * yRevenueScale;
      const yAppointments = height - padding.bottom - (point.appointments - minAppointments) * yAppointmentsScale;
      
      const isHovered = hoveredPoint === i;
      const radius = isMobile ? (isHovered ? 8 : 4) : (isHovered ? 10 : 5);
      
      // Sombra do ponto
      if (isHovered) {
        ctx.shadowColor = 'rgba(59, 130, 246, 0.4)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }
      
      // Ponto de receita
      if (selectedSeries === 'revenue' || selectedSeries === 'both') {
        // Círculo de fundo
        ctx.fillStyle = isHovered ? '#ffffff' : '#3b82f6';
        ctx.beginPath();
        ctx.arc(x, yRevenue, radius + 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // Círculo interno
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = isHovered ? '#3b82f6' : '#ffffff';
        ctx.beginPath();
        ctx.arc(x, yRevenue, radius, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Ponto de agendamentos
      if (selectedSeries === 'appointments' || selectedSeries === 'both') {
        // Círculo de fundo
        ctx.fillStyle = isHovered ? '#ffffff' : '#10b981';
        ctx.beginPath();
        ctx.arc(x, yAppointments, radius + 1, 0, 2 * Math.PI);
        ctx.fill();
        
        // Círculo interno
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = isHovered ? '#10b981' : '#ffffff';
        ctx.beginPath();
        ctx.arc(x, yAppointments, radius - 1, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // Desenhar labels do eixo X (menores no mobile para evitar sobreposição)
    ctx.fillStyle = 'rgba(107, 114, 128, 0.8)';
    ctx.font = isMobile ? '10px system-ui' : '12px system-ui';
    ctx.textAlign = 'center';

    // Mostrar menos labels no mobile para evitar sobreposição
    const labelInterval = isMobile ? Math.max(1, Math.floor(data.length / 4)) : 1;
    
    for (let i = 0; i < data.length; i += labelInterval) {
      const point = data[i];
      const x = padding.left + i * xScale;
      const y = height - padding.bottom + (isMobile ? 20 : 25);
      
      // Formatar data
      const date = new Date(point.date);
      const label = isMobile 
        ? date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
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
        const yRevenue = height - padding.bottom - (point.revenue - minRevenue) * yRevenueScale;
        const yAppointments = height - padding.bottom - (point.appointments - minAppointments) * yAppointmentsScale;
        
        const distanceRevenue = Math.sqrt((pointerX - x) ** 2 + (pointerY - yRevenue) ** 2);
        const distanceAppointments = Math.sqrt((pointerX - x) ** 2 + (pointerY - yAppointments) ** 2);
        const distance = Math.min(distanceRevenue, distanceAppointments);
        
        const threshold = isMobile ? 20 : 25;
        if (distance < minDistance && distance < threshold) {
          minDistance = distance;
          closestPoint = index;
        }
      });

      setHoveredPoint(closestPoint >= 0 ? closestPoint : null);
      
      if (closestPoint >= 0) {
        const point = data[closestPoint];
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

  }, [data, hoveredPoint, animationProgress, isMobile, selectedSeries]);

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
                  <BarChart3 className="h-6 w-6 text-blue-500" />
                  Evolução da Receita
                </CardTitle>
                <CardDescription className="text-base">
                  Últimos {period} dias • Total: {formatBRL(totalRevenue)}
                </CardDescription>
              </div>
              
              {/* Controles de série */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-4 text-sm">
                  <button
                    onClick={() => setSelectedSeries('both')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full transition-all ${
                      selectedSeries === 'both' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="hidden sm:inline">Ambos</span>
                  </button>
                  
                  <button
                    onClick={() => setSelectedSeries('revenue')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full transition-all ${
                      selectedSeries === 'revenue' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="hidden sm:inline">Receita</span>
                  </button>
                  
                  <button
                    onClick={() => setSelectedSeries('appointments')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full transition-all ${
                      selectedSeries === 'appointments' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="hidden sm:inline">Agendamentos</span>
                  </button>
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
                      top: tooltipData.y - 80,
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
                    <div className="text-sm text-green-600">
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
