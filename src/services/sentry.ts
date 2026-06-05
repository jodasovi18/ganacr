import * as Sentry from '@sentry/react';

/**
 * Inicializa el monitoreo de errores (Sentry).
 *
 * Solo se activa en **producción** y si hay un DSN configurado — igual que App Check —
 * para no enviar ruido durante el desarrollo. El DSN se provee vía la variable de entorno
 * `VITE_SENTRY_DSN` (en producción se configura en las variables de entorno de Vercel).
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!import.meta.env.PROD || !dsn) return;

  Sentry.init({
    dsn,
    environment: 'production',
    // Solo monitoreo de errores (sin performance tracing): liviano y suficiente para la beta.
    tracesSampleRate: 0,
    // No enviar datos personales por defecto (Ley 8968 de protección de datos).
    sendDefaultPii: false,
  });
}

export { Sentry };
