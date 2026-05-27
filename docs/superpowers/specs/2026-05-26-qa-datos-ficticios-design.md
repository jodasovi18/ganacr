# QA con Datos Ficticios — GanaCR
**Fecha:** 2026-05-26
**Autor:** José Daniel
**Estado:** Aprobado

---

## Objetivo

Implementar un sistema híbrido de QA para GanaCR que:
1. Pueble Firestore con datos ficticios realistas via script de seeding
2. Ejecute agentes de QA con Playwright que verifiquen flujos funcionales y experiencia de usuario

---

## Arquitectura

### Estructura de archivos nuevos

```
ganacr/
├── scripts/
│   ├── seed.ts          ← inserta todos los datos ficticios en Firestore
│   └── cleanup.ts       ← limpia todos los datos de prueba
├── tests/
│   └── qa/
│       ├── login.spec.ts
│       ├── dashboard.spec.ts
│       ├── lote-detalle.spec.ts
│       ├── formularios.spec.ts
│       └── calculos.spec.ts
├── playwright.config.ts
└── package.json         ← scripts: seed, cleanup, test:qa
```

### Herramientas

| Herramienta | Uso |
|-------------|-----|
| `tsx` | Ejecutar scripts TypeScript sin compilar |
| `firebase-admin` SDK | Acceso directo a Firestore para seeding |
| `Playwright` | Browser automation para pruebas QA |
| `@playwright/test` | Framework de assertions y test runner |

### Comandos npm

```bash
npm run seed       # Poblar Firestore con datos ficticios
npm run cleanup    # Borrar todos los datos de prueba
npm run test:qa    # Correr todos los agentes de QA
```

---

## Datos Ficticios de Seeding

### 5 Lotes (38 animales en total)

| # | Nombre | Tipo | Socio | Estado |
|---|--------|------|-------|--------|
| 1 | Lote Brahman Norte | Propio | — | Activo |
| 2 | Lote Charolais Sur | A medias | Tico Mora (50%) | Activo con ventas parciales |
| 3 | Lote Cebuinos Guanacaste | A medias | Rolando Fallas (40%) | Cerrado (todos vendidos) |
| 4 | Lote Criollo Zona Norte | Propio | — | Activo |
| 5 | Lote Pardo Suizo Turrialba | A medias | Carmen Vargas (60%) | Activo con gastos altos |

### Por cada lote

- **Animales:** arete único, raza, peso inicial 300–550 kg, precio compra ₡250,000–₡450,000
- **Pesajes:** 3 pesajes por animal con ganancia realista (15–25 kg/mes)
- **Gastos:** 4–6 gastos por lote (alimento, veterinario, mano de obra, transporte)
- **Ventas:**
  - Lote 2: venta parcial (3 animales)
  - Lote 3: venta total con valores exactos y conocidos para validar cálculos

### Lote 3 — Valores exactos para validación de cálculos

Lote de referencia con números predefinidos para verificar al centavo:
- 7 animales vendidos en una sola venta
- Split: 60% propietario / 40% Rolando Fallas
- Valores hardcodeados en el script para que los tests de `calculos.spec.ts` sean deterministas

---

## Escenarios de QA (Playwright)

### `login.spec.ts` — Autenticación
- Login con credenciales válidas redirige al Dashboard
- Login con contraseña incorrecta muestra error
- Login con email vacío bloquea el formulario
- Logout limpia la sesión

### `dashboard.spec.ts` — Vista general
- Estadísticas totales coinciden con la suma de los 5 lotes
- Los 5 lotes aparecen en la lista
- Lote 3 (cerrado) muestra estado correcto
- Montos formateados en ₡ correctamente

### `lote-detalle.spec.ts` — Detalle de lote
- Los animales del lote aparecen en la tabla
- Historial de pesajes por animal es correcto
- Gastos del lote se listan con monto y tipo
- Ventas parciales del Lote 2 muestran los 3 animales vendidos

### `formularios.spec.ts` — Validación de formularios
- Crear lote sin nombre muestra error de validación
- Agregar animal con arete duplicado muestra error
- Registrar peso negativo es bloqueado
- Gasto con monto 0 es rechazado
- Modal de venta solo muestra animales activos

### `calculos.spec.ts` — Cálculos financieros
- Utilidad bruta = totalVenta - totalInversión - gastosProporcionales
- Split a medias: porcentajes exactos al centavo
- Contadores del lote (totalAnimales, totalGastos, etc.) son exactos
- Dashboard refleja cambios después de una venta

### Comportamiento en fallos
- Cada prueba fallida genera un screenshot automático en `tests/qa/screenshots/`
- El runner reporta: tests pasados, fallidos, y tiempo de ejecución

---

## Consideraciones técnicas

- El script de seeding usa `firebase-admin` con credenciales de servicio (service account)
- Los datos de prueba se distinguen con un campo `_testData: true` en cada documento para que `cleanup.ts` los identifique y borre sin afectar datos reales
- El `userId` en los documentos de prueba corresponde al usuario registrado en Firebase Auth
- Playwright corre en modo headless por defecto; se puede activar modo visible con `--headed`
- La configuración base URL apunta a `http://localhost:5173`

---

## Criterios de éxito

- Todos los tests de `calculos.spec.ts` pasan (cálculos correctos al centavo)
- Todos los tests de `formularios.spec.ts` pasan (validaciones activas)
- No hay errores en consola del navegador durante los flujos felices
- El script `cleanup.ts` borra exactamente los datos insertados por `seed.ts`
