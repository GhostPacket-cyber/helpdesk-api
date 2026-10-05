import { z } from 'zod';

// Mensagens padrão do zod em português. Valem para os casos em que o validador não define
// uma mensagem própria (por exemplo, quando o corpo enviado é um array em vez de um objeto).
z.config(z.locales.ptBR());
