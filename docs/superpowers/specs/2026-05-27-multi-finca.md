# Arquitectura Multi-Finca — GanaCR

**Date:** 2026-05-27
**Status:** Approved

---

## Goal

Introducir el concepto de **Finca** como nivel jerárquico entre el Usuario y sus Lotes. Cada usuario puede tener una o más fincas; cada lote pertenece a exactamente una finca. Esta es la base arquitectónica que habilita la gestión multi-finca y todas las features que dependen de ella (mover animales entre fincas, gastos a nivel de finca, reportes por finca).

**Scope de esta fase:** arquitectura base únicamente — colección `fincas`, campo `fincaId` en todos los documentos, `FincaContext`, navegación, y migración de datos existentes. Las features de "mover animales" y "gastos a nivel de finca" quedan para el siguiente ciclo.

---

## Jerarquía de datos

```
Antes:   Usuario → Lotes → Animales / Pesos / Gastos / Ventas
Después: Usuario → Fincas → Lotes → Animales / Pesos / Gastos / Ventas
```

---

## 1 — Modelo de datos

### Nueva interfaz `Finca`

```typescript
export interface Finca {
  id: string;
  userId: string;
  nombre: string;
  createdAt: string;
  updatedAt: string;
}
```

Minimalista — sin campos de ubicación, descripción ni área (YAGNI).

### Cambios en interfaces existentes

Agregar `fincaId: string` a: `Lote`, `Animal`, `Peso`, `Gasto`, `Venta`.

`Usuario.nombreFinca` se mantiene como campo legacy sin uso activo. Se usó para pre-llenar el onboarding modal durante la migración.

### Firestore

- Nueva colección `fincas`
- Las colecciones `lotes`, `animales`, `pesos`, `gastos`, `ventas` agregan el campo `fincaId`
- Documentos existentes (pre-migración) no tendrán `fincaId` — el hook de onboarding los actualiza en `writeBatch` al confirmar la primera finca

---

## 2 — FincaContext

**Archivo:** `src/contexts/FincaContext.tsx`

```typescript
interface FincaContextValue {
  fincas: Finca[];
  fincaActiva: Finca | null;
  setFincaActiva: (finca: Finca) => void;
  loading: boolean;
  necesitaOnboarding: boolean; // true cuando loading=false y fincas.length === 0
}
```

### Comportamiento

- Carga las fincas del usuario con `onSnapshot` (tiempo real)
- Persiste la finca activa en `localStorage` con clave `ganacr_finca_activa_{userId}`. Al iniciar, intenta restaurar la última finca usada; si ya no existe, usa la primera de la lista
- `necesitaOnboarding` se vuelve `true` cuando la carga termina y no hay fincas → dispara el modal de onboarding
- Mientras `fincaActiva` es `null` (cargando), los hooks que dependen de ella no disparan queries

### Posición en el árbol de componentes

```
AuthProvider
  └── FincaProvider        ← solo dentro de rutas autenticadas
        └── Dashboard / LoteDetalle / etc.
```

---

## 3 — Navegación: FincaSelector

**Archivo:** `src/components/FincaSelector.tsx`

Componente que se inserta en la navbar de Dashboard (y LoteDetalle si aplica).

### Tres estados

| Condición | Comportamiento |
|-----------|---------------|
| 1 sola finca | Muestra solo el nombre con icono 🌾, sin dropdown |
| 2+ fincas | Muestra nombre + `▼`; al hacer clic abre dropdown con lista de fincas + opción "Nueva finca" |
| Cargando | Muestra placeholder vacío |

### Dropdown (2+ fincas)

- Lista de fincas con check en la activa
- Opción "+ Nueva finca" al final abre modal de creación (mismo estilo que `CrearLoteModal`)
- Al seleccionar otra finca: llama `setFincaActiva(finca)` → los hooks re-ejecutan con el nuevo `fincaId` → dashboard actualiza automáticamente

---

## 4 — Onboarding de primera vez

**Archivo:** `src/components/OnboardingFinca.tsx`

Aparece cuando `necesitaOnboarding === true`. Es un modal bottom-sheet en móvil (mismo patrón que los modales existentes en ≤640px).

### Flujo

1. Modal se abre automáticamente — no se puede cerrar sin completar
2. Input pre-llenado con `usuario.nombreFinca` (si existe) o placeholder "Mi finca"
3. Al confirmar → `useCrearFinca` ejecuta:
   a. `addDoc('fincas', { userId, nombre, createdAt, updatedAt })`
   b. `getDocs` de TODOS los documentos del usuario en `lotes`, `animales`, `pesos`, `gastos`, `ventas` (sin filtro de fincaId — todos pertenecen a esta primera finca)
   c. Batches chunkeados de 500 operaciones (límite de Firestore) que actualizan `fincaId` en todos esos documentos — mismo patrón que `useEliminarLoteConCascada`
   d. Cada batch se commitea en secuencia; si falla alguno, el usuario ve error y puede reintentar
4. Modal desaparece, dashboard carga con la nueva finca activa

---

## 5 — Cambios en hooks

### `useLotes` — único hook que filtra por fincaId

```typescript
export function useLotes(fincaId: string | null) {
  // Si fincaId es null → no dispara query
  // Query: where('userId', '==', uid) + where('fincaId', '==', fincaId)
}
```

Llamado desde Dashboard:
```typescript
const { fincaActiva } = useFinca();
const { lotes } = useLotes(fincaActiva?.id ?? null);
```

### Hooks de `animales`, `pesos`, `gastos`, `ventas` — sin cambio en queries

Estos ya filtran por `loteId`. Como un lote pertenece a una sola finca, el scope ya está correcto. Solo se agrega `fincaId` al crear nuevos documentos.

### Hooks de creación — agregan `fincaId`

`useCrearLote`, `useAgregarAnimal`, `useAgregarGasto`, `useRegistrarPeso`, `useVenderAnimales` — reciben `fincaId` como parámetro y lo incluyen en el documento nuevo. El `fincaId` viene del componente llamador, que lo obtuvo de `useFinca()`.

### Nuevo hook file: `useFincas`

**Archivo:** `src/hooks/useFincas.ts`

- `useFincas()` — lista fincas del usuario (onSnapshot)
- `useCrearFinca()` — crea finca + migra documentos existentes en writeBatch
- `useActualizarFinca()` — editar nombre
- `useEliminarFinca()` — solo si la finca no tiene lotes activos (validación previa al borrado)

---

## 6 — Archivos a crear / modificar

### Nuevos

| Archivo | Contenido |
|---------|-----------|
| `src/contexts/FincaContext.tsx` | FincaProvider + useFinca hook |
| `src/hooks/useFincas.ts` | CRUD de fincas + migration batch |
| `src/components/FincaSelector.tsx` | Chip/dropdown en navbar |
| `src/components/OnboardingFinca.tsx` | Modal de primera vez |
| `tests/responsive/fincas.spec.ts` | 3 tests E2E del flujo |

### Modificados

| Archivo | Cambio |
|---------|--------|
| `src/types/index.ts` | Agregar `Finca`; agregar `fincaId` a `Lote`, `Animal`, `Peso`, `Gasto`, `Venta` |
| `src/App.tsx` | Envolver rutas protegidas en `FincaProvider` |
| `src/hooks/useLotes.ts` | `useLotes(fincaId)` + `useCrearLote` incluye `fincaId` |
| `src/hooks/useAnimales.ts` | `useAgregarAnimal` incluye `fincaId` |
| `src/hooks/useGastos.ts` | `useAgregarGasto` incluye `fincaId` |
| `src/hooks/usePesos.ts` | `useRegistrarPeso` incluye `fincaId` |
| `src/hooks/useVentas.ts` | `useVenderAnimales` incluye `fincaId` |
| `src/pages/Dashboard.tsx` | Lee `fincaActiva` de contexto; pasa `fincaId` a `useLotes`; muestra `OnboardingFinca` si `necesitaOnboarding` |
| `src/pages/LoteDetalle.tsx` | Pasa `fincaId` a hooks de creación de animales, gastos, pesos, ventas |
| `scripts/seed-data.ts` | Agrega 2 fincas; todos los documentos incluyen `fincaId` |

---

## 7 — Testing

Tres tests E2E en `tests/responsive/fincas.spec.ts`:

1. **Onboarding**: requiere usuario sin fincas. Se maneja con una cuenta de prueba secundaria (`TEST_EMAIL_ONBOARDING` / `TEST_PASSWORD_ONBOARDING`) cuyo seed NO crea fincas — solo lotes y animales sin `fincaId`. El test verifica: modal visible → usuario llena nombre → confirma → modal desaparece → lotes visibles en dashboard.
2. **FincaSelector con 1 finca**: con la cuenta principal de prueba (1 finca del seed), el chip muestra el nombre pero no abre dropdown al hacer clic.
3. **FincaSelector con 2 fincas**: el seed crea 2 fincas (`fincaId_A` con 3 lotes, `fincaId_B` con 1 lote). El test verifica: dropdown abre → seleccionar Finca B → dashboard muestra 1 lote.

Los tests 2 y 3 usan la cuenta principal (`TEST_EMAIL` / `TEST_PASSWORD`). El test 1 usa la cuenta secundaria de onboarding.

---

## Out of Scope

- Mover animales entre lotes o fincas (siguiente ciclo)
- Gastos a nivel de finca con distribución proporcional (siguiente ciclo)
- Permisos de finca para socios (Fase 7)
- Finca con múltiples usuarios (Fase 7)

---

## Success Criteria

1. Usuario existente sin fincas ve el onboarding modal al primer login, completa el flujo y sus lotes existentes son asignados a la finca creada
2. Usuario con 1 finca ve el nombre en la navbar sin dropdown
3. Usuario con 2 fincas puede cambiar de finca desde el dropdown y el dashboard muestra los lotes correspondientes
4. Crear un lote nuevo asigna `fincaId` correcto en Firestore
5. Build TypeScript sin errores
6. 3/3 tests E2E pasan
