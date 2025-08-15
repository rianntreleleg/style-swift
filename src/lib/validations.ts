// Validações para formulários
export const validations = {
  // Validação de email
  email: {
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    validate: (email: string): boolean => {
      if (!email || email.trim() === '') return false;
      return validations.email.pattern.test(email.trim());
    },
    message: 'Digite um email válido (ex: seu@email.com)'
  },

  // Validação de telefone brasileiro
  phone: {
    // Aceita formatos: (11) 99999-9999, 11 99999-9999, 11999999999, +55 11 99999-9999
    pattern: /^(\+55\s?)?(\(?\d{2}\)?\s?)(\d{4,5}-?\d{4})$/,
    validate: (phone: string): boolean => {
      if (!phone || phone.trim() === '') return false;
      
      // Remove todos os caracteres não numéricos
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Verifica se tem pelo menos 10 dígitos (DDD + número)
      if (cleanPhone.length < 10) return false;
      
      // Verifica se tem no máximo 13 dígitos (+55 + DDD + número)
      if (cleanPhone.length > 13) return false;
      
      // Se começa com 55, remove para verificar o DDD
      const phoneWithoutCountry = cleanPhone.startsWith('55') ? cleanPhone.slice(2) : cleanPhone;
      
      // Verifica se o DDD é válido (11-99)
      const ddd = parseInt(phoneWithoutCountry.slice(0, 2));
      if (ddd < 11 || ddd > 99) return false;
      
      // Verifica se o número tem 8 ou 9 dígitos (com DDD)
      if (phoneWithoutCountry.length < 10 || phoneWithoutCountry.length > 11) return false;
      
      return true;
    },
    format: (phone: string): string => {
      if (!phone) return '';
      
      // Remove todos os caracteres não numéricos
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Se não tem 55 no início, adiciona
      const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
      
      // Remove o 55 para formatar
      const phoneWithoutCountry = phoneWithCountry.slice(2);
      
      // Formata baseado no número de dígitos
      if (phoneWithoutCountry.length === 10) {
        // (11) 9999-9999
        return `(${phoneWithoutCountry.slice(0, 2)}) ${phoneWithoutCountry.slice(2, 6)}-${phoneWithoutCountry.slice(6)}`;
      } else if (phoneWithoutCountry.length === 11) {
        // (11) 99999-9999
        return `(${phoneWithoutCountry.slice(0, 2)}) ${phoneWithoutCountry.slice(2, 7)}-${phoneWithoutCountry.slice(7)}`;
      }
      
      return phone;
    },
    message: 'Digite um telefone válido (ex: (11) 99999-9999)'
  }
};

// Função para validar formulário completo
export const validateForm = (values: { email?: string; phone?: string; [key: string]: any }) => {
  const errors: { [key: string]: string } = {};

  // Validar email
  if (values.email && !validations.email.validate(values.email)) {
    errors.email = validations.email.message;
  }

  // Validar telefone
  if (values.phone && !validations.phone.validate(values.phone)) {
    errors.phone = validations.phone.message;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Função para verificar se o formulário pode ser enviado
export const canSubmitForm = (values: { email?: string; phone?: string; [key: string]: any }) => {
  const validation = validateForm(values);
  return validation.isValid;
};
