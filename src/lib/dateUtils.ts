/**
 * Utilitários para trabalhar com datas e horários de forma consistente no sistema
 * Resolve problemas de timezone entre frontend e backend
 */

/**
 * Converte uma data para ISO string mantendo o timezone local (Brasil)
 * Isso evita problemas de conversão UTC que causam diferenças de horário
 */
export const toLocalISOString = (date: Date): string => {
  const offset = date.getTimezoneOffset() * 60000; // Offset em milissegundos
  const localISOTime = new Date(date.getTime() - offset);
  return localISOTime.toISOString();
};

/**
 * Cria uma data a partir de uma string de data (YYYY-MM-DD) e horário (HH:mm)
 * sem conversões de timezone
 */
export const createLocalDateTime = (dateStr: string, timeStr: string): Date => {
  const [h, m] = timeStr.split(":").map(Number);
  const date = new Date(dateStr);
  date.setHours(h, m, 0, 0);
  return date;
};

/**
 * Formata uma data para exibição no formato brasileiro
 */
export const formatDateTimeBR = (date: Date): string => {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
};

/**
 * Formata apenas o horário no formato HH:mm
 */
export const formatTimeBR = (date: Date): string => {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
};

/**
 * Converte uma data ISO string do banco para Date local
 */
export const parseLocalDateTime = (isoString: string): Date => {
  return new Date(isoString);
};

/**
 * Verifica se duas datas são do mesmo dia (ignorando horário)
 */
export const isSameLocalDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

/**
 * Cria inicio e fim do dia para consultas no banco
 */
export const getLocalDayBounds = (date: Date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return {
    start: toLocalISOString(startOfDay),
    end: toLocalISOString(endOfDay)
  };
};
