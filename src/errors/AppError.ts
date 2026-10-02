// Erro esperado da aplicação: carrega o status HTTP e um código legível por máquina.
// Qualquer outro erro é tratado como falha interna (500).
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
