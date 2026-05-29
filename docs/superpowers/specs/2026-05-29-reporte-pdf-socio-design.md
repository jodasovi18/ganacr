# Reporte PDF para Socio — Design Spec

**Date:** 2026-05-29
**Feature:** Reporte PDF descargable dirigido al socio de un lote a medias

---

## Goal

Generar un PDF descargable desde LoteDetalle para lotes con `tipoPropiedad === 'medias'`, dirigido al socio. El reporte tiene el mismo contenido que el PDF del dueño pero con el enfoque en la utilidad y porcentaje del socio. Se descarga manualmente y el ganadero lo comparte por WhatsApp.

---

## Architecture

### Componentes nuevos
- `src/components/pdf/ReporteSocioPDF.tsx` — componente `@react-pdf/renderer` con diseño para el socio
- `src/utils/exportPDF.ts` — agregar función `exportarSocioPDF(props: ReporteSocioPDFProps)`

### Modificaciones
- `src/pages/LoteDetalle.tsx` — botón `📄 PDF Socio` solo visible cuando `lote.tipoPropiedad === 'medias' && lote.socio`
- `src/components/pdf/ReporteLotePDF.tsx` — fix fuente ₡ (Roboto)
- `src/components/pdf/ReporteSocioPDF.tsx` — usa misma fuente Roboto

### Fuente unicode
Registrar **Roboto** (Google Fonts CDN) en ambos componentes PDF para soporte del glifo `₡` (U+20A1). Helvetica built-in no lo incluye.

```typescript
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf' },
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmEU9fBBc-.ttf', fontWeight: 'bold' },
  ],
});
```

---

## ReporteSocioPDF — Estructura del documento

### Header (fondo verde oscuro `#1b4332`)
- "GanaCR" (brand)
- "Reporte para socio" (subtítulo)
- Nombre del socio en grande
- Finca · Lote
- Fecha de generación

### Hero card (fondo `#2d6a4f`)
- Ícono 🤝
- "Tu utilidad acumulada" + monto en grande
- Subtítulo: "Sobre ₡X de utilidad bruta total"
- Círculo verde con porcentaje del socio

### Info del lote
- Fecha de compra
- Socio propietario: `[nombre dueño] (X%) · [nombre socio] (Y%)`  
  *Nota: `lote.socio.nombre` es el socio; el nombre del dueño viene de `userData.nombre` pasado como prop*
- Animales activos

### Resumen financiero
- Cards: Total invertido / Total gastos / Total ventas / Utilidad bruta
- Card destacada (fondo `#1b4332`): "Tu utilidad (X%)"

### Inventario actual
- Mismas columnas que PDF del dueño: Arete, Raza, Peso act., Ganancia, Estado

### Historial de ventas
- Columnas: Fecha, Animales, Total venta, Utilidad bruta, **Tu utilidad (X%)**

### Gastos detallados
- Mismas columnas: Fecha, Concepto, Tipo, Monto

### Footer (fijo)
- "GanaCR — Reporte generado para [nombre socio]"
- Número de página

---

## Props

```typescript
export interface ReporteSocioPDFProps {
  lote: Lote;           // debe tener tipoPropiedad === 'medias' && socio
  animales: Animal[];
  ventas: Venta[];
  gastos: Gasto[];
  nombreFinca: string;
  nombreDueno: string;  // para mostrar en info del lote
  fechaGenerado: string; // ISO date YYYY-MM-DD
}
```

---

## exportarSocioPDF

```typescript
export async function exportarSocioPDF(props: ReporteSocioPDFProps): Promise<void>
```

- Genera blob con `pdf(...)` 
- Descarga como `GanaCR_Socio_[NombreSocio]_[Lote]_[Fecha].pdf`
- Misma técnica de cast `unknown` que `exportarLotePDF`

---

## LoteDetalle — UI

Agregar después del botón `📄 PDF` existente:

```tsx
{animales.length > 0 && lote.tipoPropiedad === 'medias' && lote.socio && (
  <button className="btn btn-secondary btn-sm" onClick={handleGenerarPDFSocio}>
    🤝 PDF Socio
  </button>
)}
```

Handler `handleGenerarPDFSocio` usa datos ya en memoria (igual que `handleGenerarPDF`).

---

## Fix fuente en ReporteLotePDF

- Reemplazar `fontFamily: 'Helvetica'` y `'Helvetica-Bold'` por `'Roboto'` y weight `bold`
- Registrar fuente Roboto con `Font.register` al top del archivo
- Misma fuente en `ReporteSocioPDF`

---

## Archivos

| Archivo | Acción |
|---|---|
| `src/components/pdf/ReporteSocioPDF.tsx` | Crear |
| `src/utils/exportPDF.ts` | Modificar — agregar `exportarSocioPDF` |
| `src/pages/LoteDetalle.tsx` | Modificar — botón PDF Socio + handler |
| `src/components/pdf/ReporteLotePDF.tsx` | Modificar — fix fuente Roboto |

---

## Out of scope

- Compartir directo a WhatsApp (no viable técnicamente sin errores)
- Botón PDF Socio en Dashboard (el Dashboard no tiene acceso a `lote.socio` sin query adicional)
- Firma digital o confirmación de recibido
