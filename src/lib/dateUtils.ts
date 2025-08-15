/**
 * Utilitários para trabalhar com datas e horários de forma consistente no sistema.
 * Resolve problemas de timezone entre frontend e backend.
 */

// --- Funções de Criação e Conversão (Melhoradas) ---

/**
 * Cria uma data a partir de uma string de data (YYYY-MM-DD) e horário (HH:mm)
 * sem conversões de timezone, garantindo que a data seja exatamente como selecionada.
 * Esta função é a principal para a criação de agendamentos.
 */
export const createLocalDateTime = (dateStr: string, timeStr: string): Date => {
  const [h, m] = timeStr.split(":").map(Number);
  
  // Criar data de forma explícita para evitar problemas de timezone
  const [year, month, day] = dateStr.split('-').map(Number);
  // O construtor `Date` com argumentos cria uma data no fuso horário local.
  const date = new Date(year, month - 1, day, h, m, 0, 0); // month é 0-indexed
  
  console.log(`[createLocalDateTime] Input: ${dateStr} ${timeStr}`);
  console.log(`[createLocalDateTime] Result (Local): ${date.toLocaleString()}`);
  
  return date;
};

/**
 * Converte um objeto Date local para uma string que o banco de dados pode salvar
 * sem a indicação de fuso horário (UTC), prevenindo a diferença de 3 horas.
 * * Exemplo: Uma data local às 10:00 se torna a string "2025-08-15T10:00:00".
 * Isso é ideal para colunas de banco de dados do tipo TIMESTAMP sem fuso horário.
 */
export const toDatabaseString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  const result = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  console.log(`[toDatabaseString] String para salvar no banco: ${result}`);
  return result;
};


// --- Funções de Formatação (Mantidas) ---

/**
 * Formata uma data para exibição no formato brasileiro (DD/MM/YYYY HH:mm).
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
 * Formata apenas o horário no formato HH:mm.
 */
export const formatTimeBR = (date: Date): string => {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
};

/**
 * Converte uma data ISO string do banco (UTC) para Date local.
 * O banco salva em UTC (+00), mas precisamos exibir no fuso local.
 */
export const parseLocalDateTime = (isoString: string): Date => {
  return new Date(isoString);
};

/**
 * SIMPLESMENTE parse a string do banco para Date - SEM CONVERSÕES!
 * O que está no banco deve ser exibido IGUAL.
 */
export const parseSimpleDateTime = (dateString: string): Date => {
  return new Date(dateString);
};

/**
 * SIMPLESMENTE formata o horário sem conversões desnecessárias.
 * Se banco tem 13:00+00, exibe 13:00.
 */
export const formatSimpleTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'UTC' // MANTER UTC para não converter
  });
};

/**
 * SIMPLESMENTE formata data e hora sem conversões.
 */
export const formatSimpleDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC' // MANTER UTC para não converter
  });
};


// --- Funções de Lógica de Datas (Mantidas) ---

/**
 * Verifica se duas datas são do mesmo dia (ignorando horário).
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
    start: toDatabaseString(startOfDay),
    end: toDatabaseString(endOfDay)
  };
};
