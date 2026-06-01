# Diseño — Areteo oficial SENASA, alertas y indicador offline

**Fecha:** 2026-05-31
**Módulo:** Engorde · Inicio de Fase 3 (Trazabilidad SENASA, alcance reducido)
**Estado:** Aprobado, pendiente plan de implementación

## Resumen

Primer sub-proyecto de Fase 3, con alcance reducido (sin integración Trazar-Agro). Tres
piezas que aportan valor por sí solas para el cumplimiento SENASA:

1. **Registro del arete oficial SENASA (DIIO)** por animal — campo nuevo separado del arete
   interno de manejo.
2. **Alertas de animales sin arete** registrado — en Dashboard, por lote y como filtro.
3. **Indicador offline** visible — la app ya sincroniza offline; falta mostrar el estado.

### Contexto legal (resumen, con fuentes)

SENASA regula la identificación individual (Ley 8495, Decreto 44336-MAG-S-SP-MOPT, vigente
desde jul 2024; plazo final 26 oct 2026). El identificador oficial es el **DIIO**: arete
visual (paleta, oreja izquierda) + botón RFID (oreja derecha); el número incluye la
secuencia **188** (código de Costa Rica). La plataforma oficial es Trazar-Agro (SIRECO),
cuya integración se **difiere** (sin documentación de su API). No es asesoría legal.

---

## 1. Modelo de datos

`Animal` (en `src/types/index.ts`) — agregar un campo:

- `areteSenasa?: string` — número DIIO oficial. Texto libre, **opcional, sin validación de
  formato**. Vacío o ausente = "sin arete SENASA registrado".

El `numeroArete` interno de manejo no se toca. Sin migración de datos: los animales
existentes simplemente cuentan como "sin arete" hasta que se complete.

---

## 2. Registro del arete (modal Agregar/Editar Animal)

`AgregarAnimalModal.tsx`:
- Campo nuevo **"Arete oficial SENASA (DIIO)"**, opcional, con hint:
  *"Número oficial del dispositivo. Podés completarlo después."*
- Se inicializa con `editData?.areteSenasa ?? ''`.
- Se pasa a los hooks como `areteSenasa: areteSenasa.trim()`.

`useAnimales.ts`:
- `AgregarAnimalInput` y `EditarAnimalInput` aceptan `areteSenasa?: string`.
- `agregarAnimal`: escribe `areteSenasa: input.areteSenasa ?? ''` en el doc.
- `editarAnimal`: el `...data` ya incluye `areteSenasa`. Sin cambio adicional.

---

## 3. Alertas "sin arete" — enfoque por query (sin contadores)

Regla: un animal está **pendiente** si `estado === 'activo'` y `!areteSenasa` (vacío o ausente).
Se eligió el enfoque por query (no contadores en el lote) por exactitud (es compliance) y
simplicidad (sin sitios de actualización ni backfill). El cache offline sirve las lecturas
localmente sin costo de servidor.

**LoteDetalle** (client-side, sobre los `animales` ya cargados):
- Badge ⚠️ por animal en la lista (tabla y cards) cuando `estado==='activo' && !areteSenasa`.
- Mostrar el `areteSenasa` del animal donde corresponda (ej. junto al arete interno).

**Dashboard** (una query por finca al cargar):
- Función/handler que hace `getDocs(query(collection(db,'animales'), where('userId','==',uid),
  where('fincaId','==',fincaActiva.id), where('estado','==','activo')))` y deriva en cliente:
  - `totalSinArete` (finca): cantidad con `!areteSenasa`.
  - `sinAretePorLote: Map<loteId, number>`.
- Mostrar un **aviso de finca**: "⚠️ N animales sin arete SENASA" (si N>0), con estilo de
  alerta sutil. Si N===0, no se muestra (o "✓ Todos identificados").
- En cada **card de lote** del Dashboard, badge "⚠️ N sin arete" cuando el lote tenga >0.
- La query corre al montar y al cambiar de finca activa (depende de `fincaActiva?.id`),
  vía un hook `useAnimalesSinArete(fincaId)` que devuelve `{ total, porLote, loading }`.

Nota: 3 filtros de igualdad (userId + fincaId + estado), sin orderBy → no requiere índice
compuesto (consistente con el patrón del proyecto).

---

## 4. Filtro "Sin arete SENASA"

`src/utils/filtrarAnimales.ts`:
- Agregar a `FiltroAnimales` el campo `sinAreteSenasa: boolean` (default `false` en `FILTRO_VACIO`).
- En `filtrarAnimales`: si `f.sinAreteSenasa`, dejar pasar solo los que tengan `!a.areteSenasa`.
- En `contarFiltrosActivos`: contar +1 si `sinAreteSenasa` es true.
- Actualizar `scripts/test-filtrar-animales.ts` con casos para el nuevo filtro.

`src/components/AnimalesFilterBar.tsx`:
- Agregar un toggle/checkbox **"Solo sin arete SENASA"** que setea `sinAreteSenasa`.

---

## 5. Indicador offline

`src/hooks/useOnlineStatus.ts` (nuevo):
- Hook que devuelve `boolean` (online). Inicializa con `navigator.onLine`; suscribe a los
  eventos `window` `'online'` y `'offline'`; limpia en cleanup.

`src/components/OfflineIndicator.tsx` (nuevo):
- Usa `useOnlineStatus()`. Si está online, no renderiza nada (`return null`).
- Si está offline, muestra una barra/chip fija (ej. `fixed bottom-4` o top, estilo
  ámbar/warning) con: *"Sin conexión — tus cambios se guardan y se sincronizarán al volver
  la señal."*
- Se monta una sola vez en el root autenticado (en `App.tsx` o el layout que envuelve las
  rutas protegidas, a confirmar al leer `App.tsx`), para que aparezca en cualquier página.

---

## Archivos afectados

- `src/types/index.ts` (+`areteSenasa`)
- `src/components/AgregarAnimalModal.tsx` (campo arete SENASA)
- `src/hooks/useAnimales.ts` (inputs aceptan `areteSenasa`; nuevo `useAnimalesSinArete`)
- `src/utils/filtrarAnimales.ts` (+filtro `sinAreteSenasa`)
- `scripts/test-filtrar-animales.ts` (casos del nuevo filtro)
- `src/components/AnimalesFilterBar.tsx` (toggle sin arete)
- `src/pages/LoteDetalle.tsx` (badge por animal, mostrar areteSenasa)
- `src/pages/Dashboard.tsx` (aviso de finca + badge por lote)
- `src/hooks/useOnlineStatus.ts` (nuevo)
- `src/components/OfflineIndicator.tsx` (nuevo)
- `src/App.tsx` (montar OfflineIndicator)

## Fuera de alcance (YAGNI)

- Integración con Trazar-Agro / SIRECO (sin documentación de su API).
- Guías de movilización en PDF.
- Validación del formato DIIO (secuencia 188, largo).
- Regla de identificación por edad (6 meses) — no se captura fecha de nacimiento.
- Contadores `animalesSinArete` en el lote (se prefiere query por exactitud).
- Distinguir las dos piezas del DIIO (paleta vs botón RFID) — un solo número por ahora.

## Fuentes

- [Protocolo de Identificación Individual y Rastreabilidad del Ganado Bovino (MAG)](https://www.mag.go.cr/trazabilidad-bovina-y-bufalina/Protocolo-Identificacion-Individual-rastreabilidad-del-Ganado-Bovino.pdf)
- [Sistema Nacional de Trazabilidad Bovina y Bufalina (MAG)](http://mag.go.cr/sistema-nacional-de-trazabilidad-bovina-y-bufalina-en-costa-rica/)
- [SiRiGABB — SENASA (identificación y rastreabilidad individual)](https://trazabilidadindividual.addax.cc/)
