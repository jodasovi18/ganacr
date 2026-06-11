# Checklist de arranque de la beta — GanaCR

Lista para ir marcando antes y durante la beta con ganaderos reales.
Estado al **05/06/2026**.

## A. Técnico

- [x] Reglas Firestore endurecidas **desplegadas en producción** (verificado vía API)
- [x] Aislamiento por usuario + 42 tests de reglas
- [x] **Sentry activo en prod** (verificado en vivo)
- [x] CI en cada PR + branch protection en `main` + CodeQL + Dependabot
- [x] Respaldo/DR funcionando (export/import/verify + runbook)
- [x] Performance optimizada (carga inicial −67%)
- [x] **Backup pre-beta** hecho (`npm run backup:export`)
- [ ] **Mover ese backup off-cloud** (disco cifrado u otro proveedor) — ver `docs/runbook-respaldo-dr.md`
- [ ] **Alerta de email en Sentry** (instrucciones abajo)
- [ ] **Monitor de uptime** (instrucciones abajo)
- [ ] **Smoke test en prod con cuenta nueva** (instrucciones abajo)

## B. Contenido / legal

- [ ] **Términos + Privacidad revisados por abogado** y **PR #40 mergeado** (ahí quedan vivos en la app)
- [ ] Evaluar inscripción ante **PRODHAB** con asesoría legal

## C. Preparar la operación (lo más importante)

- [ ] Elegir **3–5 ganaderos** conocidos para arrancar
- [ ] Definir el **canal de feedback** (un grupo de WhatsApp suele funcionar mejor que un formulario)
- [ ] Escribir el **mensaje de invitación** (qué es, que es **gratis y beta**, qué esperás de ellos, el link)
- [ ] Acordar una **llamada/visita de seguimiento** a la semana

## D. Durante la beta (rutina)

- [ ] Revisar **Sentry** a diario (qué les falla de verdad)
- [ ] Revisar el **monitor de uptime**
- [ ] **Backup** semanal (`npm run backup:export` + mover off-cloud)
- [ ] Anotar pedidos/bugs en una lista para priorizar

---

## Instrucciones de los pendientes técnicos

### 1. Alerta de email en Sentry
Para enterarte apenas un ganadero tope un error (sin estar mirando el dashboard):
1. sentry.io → proyecto **ganacr** → **Alerts** → **Create Alert**.
2. Tipo **Issues** → condición "**A new issue is created**".
3. Acción: **Send a notification to email** (tu correo).
4. Guardar.

### 2. Monitor de uptime (te avisa si el sitio se cae)
1. Crear cuenta gratis en **uptimerobot.com**.
2. **+ New Monitor** → Type `HTTP(s)` → Name `GanaCR` → URL `https://ganacr.vercel.app` → intervalo `5 min`.
3. **Alert Contacts:** tu email (opcional: Telegram/WhatsApp para aviso instantáneo).
4. Crear. *(Alternativa con mejor plan gratis: BetterStack.)*

### 3. Smoke test en prod con cuenta nueva
Antes de invitar, probá el flujo completo como lo haría un ganadero:
1. En `https://ganacr.vercel.app`, **registrate** con un correo de prueba → confirmá que **exige el checkbox** de Términos/Privacidad.
2. Creá **finca → lote → animal → pesaje → venta**; revisá que los números cuadren.
3. Probá **offline**: cargá la app, apagá el wifi, agregá un animal, reconectá y verificá que sincronizó.
4. Generá un **PDF** y un **Excel** (confirma la carga diferida).
5. **Borrá** la cuenta/datos de prueba al terminar.

---

> **Dónde está el foco:** lo técnico ya está prácticamente cerrado. El trabajo real de la beta es la
> **sección C** — conseguir los ganaderos y un buen canal de feedback. Eso es lo que valida si el
> producto sirve.
