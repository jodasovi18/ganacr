# UI Redesign: shadcn/ui + Tailwind — GanaCR

**Fecha:** 2026-05-29  
**Estado:** Aprobado  
**Alcance:** Migración gradual del CSS vanilla a Tailwind CSS + shadcn/ui con paleta "Campo Claro"

---

## Contexto y motivación

El sistema actual usa CSS vanilla con variables CSS. Funciona pero el look es básico e inconsistente entre páginas — botones, modales y formularios no tienen coherencia visual. El objetivo es migrar a shadcn/ui + Tailwind para lograr:

- Look profesional moderno sin perder la identidad ganadera verde
- Componentes accesibles (Radix UI bajo shadcn)
- Funcionamiento 100% offline-safe: shadcn copia el código al repo, sin dependencia de CDN en runtime
- Consistencia visual en todos los componentes sin mantener CSS manual por página

---

## Stack técnico

| Librería | Versión | Rol |
|---|---|---|
| `tailwindcss` + `@tailwindcss/vite` | ^4.x | Utilidades CSS, reemplaza CSS vanilla |
| `shadcn/ui` (CLI) | latest | Componentes copiados al repo |
| `lucide-react` | ya en uso | Íconos (shadcn lo requiere) |
| Radix UI | via shadcn | Primitivos accesibles (Dialog, Select, Dropdown) |

**Modo:** Solo light mode. Dark mode queda fuera de alcance.

---

## Design system — Paleta "Campo Claro"

### Tokens de color

```
primary:        #1e4d3a   → navbar, botones CTA, links
primary-hover:  #2d7a57   → hover de botón primary
success:        #16a34a   → utilidad, badges "activo"
success-light:  #f0fdf4   → fondo de cards con utilidad positiva
bg:             #f8fafc   → fondo de página
surface:        #ffffff   → cards, modales, formularios
border:         #e2e8f0   → bordes, divisores
text:           #0f172a   → texto principal
muted:          #64748b   → labels, subtítulos, placeholders
danger:         #dc2626   → eliminar, errores de validación
danger-light:   #fee2e2   → fondo de mensajes de error
warning:        #d97706   → alertas
```

Estos tokens se configuran en `tailwind.config.ts` como colores semánticos para no hardcodear valores hex en los componentes.

### Tipografía

- **Fuente:** Inter (ya en uso, sin cambio)
- **Escala:** 12 / 14 / 15 / 16 / 18 / 24 / 32px
- **Pesos:** 400 (normal), 600 (semibold), 700 (bold), 800 (extrabold)
- **Labels secundarios:** uppercase, letter-spacing 0.05–0.08em, 11–12px

### Espaciado y radios

- Border radius base: `rounded-lg` (8px) para inputs y badges, `rounded-xl` (12px) para cards y modales
- Sombras: `shadow-sm` para cards en reposo, `shadow-md` para modales y dropdowns

---

## Componentes shadcn a instalar

| Componente | Dónde se usa |
|---|---|
| `Button` | Todos — variantes: default, ghost, destructive, outline |
| `Card` | Cards de lotes, animals, estadísticas del Dashboard |
| `Dialog` | Reemplaza todos los modales actuales (bottom-sheet en mobile) |
| `Tabs` | LoteDetalle (animales/pesos/gastos/sanidad) y Dashboard (lotes/gastosFinca) |
| `Input` | Todos los formularios |
| `Form` | Wrappers de formularios con validación |
| `Badge` | Estado activo/vendido/inactivo de animales y lotes |
| `DropdownMenu` | Acciones de lote (editar/borrar/PDF/Excel) y animal |
| `Select` | Filtros y selects en formularios |
| `Toast` (Sonner) | Confirmaciones de acción (guardar, eliminar, exportar) |

---

## Orden de migración

### Paso 1 — Setup inicial
- Instalar `tailwindcss`, `@tailwindcss/vite` y configurar en `vite.config.ts`
- Inicializar shadcn con `npx shadcn@latest init` (tema `default`, TypeScript, path aliases `@/`)
- Configurar paleta Campo Claro en `tailwind.config.ts`
- Instalar los 10 componentes base listados arriba
- Agregar `cn()` utility (`lib/utils.ts` — shadcn lo crea automáticamente)
- No tocar páginas ni componentes existentes en este paso

### Paso 2 — Login
Archivos: `src/pages/Login.tsx`, eliminar `src/pages/Login.css`

- Layout: pantalla centrada con card blanca sobre fondo `bg` (#f8fafc)
- Logo: ícono 🐄 en cuadrado redondeado `primary`, nombre "GanaCR", subtítulo
- Formulario: shadcn `Form` + `Input` para email y contraseña (con toggle mostrar/ocultar)
- Link "¿Olvidaste tu contraseña?" alineado a la derecha del label de contraseña
- Botón primario: `Button` full-width, color `primary`
- Divider con "o" para Google
- Botón Google: `Button variant="outline"` full-width
- Link de registro al pie de la card
- Responsive: mismo diseño en mobile, card ocupa 90% del ancho en pantallas pequeñas

### Paso 3 — Dashboard
Archivos: `src/pages/Dashboard.tsx`, eliminar `src/pages/Dashboard.css`. También migrar:
- `src/components/FincaSelector.tsx` + eliminar `FincaSelector.css`
- `src/components/OnboardingFinca.tsx`
- `src/components/GastosFincaTab.tsx`
- `src/components/GastoFincaModal.tsx` + eliminar `GastoFincaModal.css`

Estructura del Dashboard:
- **Navbar:** fondo blanco, borde inferior `border`, logo + selector de finca (shadcn `Select` o dropdown) + avatar del usuario con iniciales
- **Stat cards:** 3 cards (animales activos, total invertido, utilidad total) usando shadcn `Card`. La card de utilidad tiene fondo `success-light` cuando es positiva
- **Tabs:** shadcn `Tabs` para "Lotes" y "Gastos de Finca"
- **Lote cards:** shadcn `Card` con badge de estado, datos clave, `DropdownMenu` para acciones (Ver, Editar, PDF, Excel, Eliminar)
- **Botón "Nuevo lote":** `Button` primary en el header de la tab

### Paso 4 — LoteDetalle + todos los modales
Archivos: `src/pages/LoteDetalle.tsx`, eliminar `src/pages/LoteDetalle.css`. También migrar todos los componentes modales:
- `CrearLoteModal`, `AgregarAnimalModal`, `AgregarGastoModal`, `RegistrarPesoModal`, `VenderAnimalesModal`, `ConfirmarBorradoModal`
- `AnimalPesoModal` + eliminar `AnimalPesoModal.css`
- `MoverAnimalesModal` + eliminar `MoverAnimalesModal.css`
- `EventoSanitarioModal` + eliminar `EventoSanitarioModal.css`
- `PesosTab` + eliminar `PesosTab.css`
- `SanidadTab` + eliminar `SanidadTab.css`

Todos los modales usan shadcn `Dialog` en desktop. En mobile (≤640px) se usa el componente `Drawer` de shadcn (basado en vaul) como bottom-sheet, para mantener el comportamiento táctil actual. El componente `Drawer` se instala por separado con `npx shadcn@latest add drawer`.

### Paso 5 — Limpieza final
- Reducir `src/index.css` a solo: reset básico, import de fuente Inter, variables que aún necesite `react-pdf`
- Verificar que no queden archivos `.css` huérfanos
- Revisar responsive en mobile (375px) y tablet (768px)
- Verificar que los Toasts (Sonner) reemplacen cualquier `alert()` residual
- Smoke test: login → crear finca → crear lote → agregar animal → registrar peso → vender

---

## Lo que NO cambia en este PR

- Lógica de negocio: hooks, services, contexts, utils — ninguno se toca
- Firebase: sin cambios
- react-pdf y exportExcel: sin cambios
- Tests Playwright existentes: deben seguir pasando
- Tipos TypeScript: sin cambios

---

## Criterio de éxito

1. Login, Dashboard y LoteDetalle tienen look visual consistente con paleta Campo Claro
2. Todos los modales usan shadcn Dialog (bottom-sheet en mobile)
3. No hay archivos `.css` individuales de páginas/componentes (solo `index.css` reducido)
4. La app funciona 100% offline (sin CDN requests para shadcn/Tailwind)
5. Los tests Playwright existentes siguen pasando
