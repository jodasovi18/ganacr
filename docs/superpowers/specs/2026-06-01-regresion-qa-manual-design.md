# Diseño — Regresión QA manual completa del sistema

**Fecha:** 2026-06-01
**Tipo:** QA / pruebas manuales (no es una feature)
**Estado:** Aprobado, pendiente plan de ejecución

## Resumen

Barrido de QA manual sobre **todos** los flujos del sistema (MVP + Fase 2A + 2B + 3),
ejecutado por el controlador conduciendo el browser sobre el demo en producción.
Objetivo: encontrar bugs reales antes de seguir construyendo, documentarlos y arreglarlos.

## Entorno y datos

- **App:** demo en producción — `https://ganacr.vercel.app`, usuario `demo@ganacr.com`.
- **Driver:** Chrome MCP (claude-in-chrome). Verificación con screenshots **y** queries al
  DOM vía `javascript_tool` (más confiable; los screenshots han dado timeout intermitente).
- **Datos:** la regresión incluye operaciones **destructivas** (crear/editar/borrar/vender/
  mover/registrar muerte). Se asume que el demo quedará alterado durante el QA.
- **Restauración al final:** `npm run copy-to-demo` (recopia datos del usuario real al demo)
  + `npm run clean-demo` (quita campos basura). Deja el demo en estado limpio conocido.

## Áreas a cubrir (regresión completa)

Cada área: ejecutar los flujos, registrar **pass/fail** y detalle de cualquier anomalía.

1. **Auth & Dashboard** — login; stats globales de finca (Lotes/Animales/Invertido/Utilidad);
   selector multi-finca (cambio de finca actualiza todo); onboarding (no romper si ya hay finca).
2. **Lotes** — crear lote propio; crear lote a medias (socio + %); editar lote; borrar lote
   con cascade (animales/pesos/gastos/ventas) y reversión de stats de finca.
3. **Animales** — agregar con los 3 orígenes (comprado con/sin precio + N° subasta; nacido y
   sin registro con "Valor estimado"); con y sin arete SENASA; editar (incluye cambiar origen);
   borrar (borra pesos asociados, ajusta contadores).
4. **Pesajes** — registrar peso (actualiza pesoActual); historial; gráfico por animal y
   promedio por lote; semáforo de umbrales (PesosTab).
5. **Ventas** — vender N animales (cálculo de utilidad bruta, inversión, gastos proporcional);
   reparto a medias (utilidad socio/propietario); anular venta (animales vuelven a activo,
   reversión de contadores).
6. **Muerte/baja** — registrar muerte (fecha, precio/kg, causa, doc vet; pérdida = peso×precio
   resta a utilidadTotal; aviso fiscal); badge "muerto"; revertir muerte (restaura); reporte
   de pérdidas Excel (reparto socio en columnas).
7. **Mover animales** — mover en la misma finca; **cross-finca** (migración de fincaId en
   animal y pesos, marca importado; contadores de ambos lotes; precio de traspaso).
8. **Gastos** — gasto por lote (editar/borrar, ajusta totalGastos); **gastos de finca** con
   distribución proporcional entre lotes seleccionados; borrar gasto de finca (revierte hijos).
9. **Sanidad** — registrar evento sanitario (vacuna/tratamiento/etc.); historial individual
   por animal; eliminar evento (revierte gasto si aplica).
10. **Areteo/alertas SENASA** — campo "Arete oficial SENASA (DIIO)" al agregar/editar; ⚠️ por
    animal activo sin arete (tabla + cards); aviso de finca en Dashboard; badge "N sin arete"
    por lote; filtro "Solo sin arete SENASA"; al completar el arete desaparece la alerta.
11. **Filtro avanzado** — estado (multi), raza, origen, rango de peso, rango de ganancia,
    combinados (AND); contador "Mostrando X de Y"; "Limpiar filtros"; búsqueda por arete.
12. **Exports/Reportes** — Excel de inventario y ventas; PDF de lote; PDF de socio (a medias).
13. **Offline** — indicador "Sin conexión" (DevTools → Offline) aparece/desaparece; los
    cambios offline se persisten (verificación básica).
14. **Responsive** — smoke de Dashboard y LoteDetalle en mobile (375px) y tablet (768px):
    navbar, tabs, cards de animales, modales (Dialog/Drawer).

## Método

- Recorrer las áreas **en orden**, con **checkpoint por área** (reportar avance al usuario).
- Para flujos destructivos, ejecutar de verdad (se restaura el demo al final).
- Registrar hallazgos en el reporte a medida que se avanza.

## Manejo de bugs

**Documentar todo** en `docs/qa/2026-06-01-regresion-demo.md`: por área, pass/fail, pasos
para reproducir, severidad (Crítico/Importante/Menor/Nit), y screenshot/DOM si aplica.

### Estrategia de agrupación de fixes (por dominio/arquitectura)

El codebase está organizado por **feature de dominio** — cada una es una unidad cohesiva
de `hook(s)` + `modal/componente(s)` + integración en `pages/` (+ a veces `types`/`utils`).
Un mismo bug suele tocar varias capas de UNA feature (ej. el hook y su modal). Por eso los
fixes se agrupan **por dominio**, no por capa ni por severidad:

1. **Un PR por dominio/feature afectado.** Todos los bugs cuyo fix toca el mismo dominio van
   juntos, porque comparten contexto y archivos. Dominios y su `scope` de commit:
   - `animales` (`useAnimales`, `AgregarAnimalModal`) · `lotes` (`useLotes`, `CrearLoteModal`)
   - `ventas` (`useVentas`, `VenderAnimalesModal`, `calculadora`) · `muerte` (`useRegistrar/AnularMuerte`, `RegistrarMuerteModal`)
   - `pesos` (`usePesos`/`usePesosLote`, `PesosTab`, SVG charts) · `mover` (`useMoverAnimales`, `MoverAnimalesModal`)
   - `gastos` / `gastos-finca` (`useGastos`/`useGastosFinca`, modales/tabs) · `sanidad` (`useEventosSanitarios`, `SanidadTab`)
   - `areteo` (`useAnimalesSinArete`, badges, alertas) · `filtro` (`filtrarAnimales`, `AnimalesFilterBar`)
   - `export` (`exportExcel`/`exportPDF`) · `dashboard` / `finca` (`Dashboard`, `FincaContext/Selector`) · `offline` (`useOnlineStatus`)
   Rationale: cada PR queda cohesivo y revisable con todo el contexto de esa feature; evita
   partir un fix entre PRs por capa; respeta los límites de archivos del proyecto.

2. **Bug Crítico / bloqueante → su propio PR, de inmediato** (no esperar a agrupar), para
   poder mergear y desplegar el fix sin demora.

3. **Bugs de lógica pura** (`calculadora`, `filtrarAnimales`, math de `exportExcel`) →
   **test que falla primero (TDD)** antes del fix, dentro del PR de su dominio. Reusar el
   patrón `npm run test:filtro` (tsx) o agregar un test análogo.

4. **Nits triviales transversales** (typos de copy/labels, espaciado, `aria-label` faltante,
   etc. dispersos en varios componentes) → **un único PR `chore(qa): nits`** al final.

5. Si un área **no tiene bugs**, no genera PR — queda documentada como pass.

**Orden:** no arreglar a mitad del barrido salvo que un bug bloquee continuar (ese sí se
arregla y mergea de inmediato como Crítico). Para el resto: terminar el área, anotar, y al
cerrar el barrido (o por lotes de dominios ya cubiertos) abrir los PR(s) agrupados.

## Entregable

- Reporte `docs/qa/2026-06-01-regresion-demo.md` con todos los hallazgos.
- PR(s) con los fixes de los bugs encontrados.
- Demo restaurado a estado limpio (`copy-to-demo` + `clean-demo`).

## Fuera de alcance

- Tests automatizados (Playwright) — es un barrido manual; la suite E2E es un esfuerzo aparte.
- Pruebas de carga/performance.
- Pruebas de seguridad/penetración de las security rules.
