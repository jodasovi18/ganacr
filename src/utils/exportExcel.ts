import * as XLSX from 'xlsx';
import { Animal, Lote, Venta } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitizarNombreHoja(nombre: string): string {
  // Excel sheet names: max 31 chars, no / \ ? * [ ]
  return nombre.replace(/[/\\?*[\]]/g, '_').substring(0, 31);
}

function fechaExcel(isoDate: string): string {
  // Convert YYYY-MM-DD to DD/MM/YYYY
  const parts = isoDate.substring(0, 10).split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// ─── Exportación principal ────────────────────────────────────────────────────

export function exportarLotesExcel(
  lotes: Lote[],
  animalesPorLote: Map<string, Animal[]>,
  ventasPorLote: Map<string, Venta[]>,
  nombreFinca: string
): void {
  const wb = XLSX.utils.book_new();

  for (const lote of lotes) {
    const animales = animalesPorLote.get(lote.id) ?? [];
    const ventas = ventasPorLote.get(lote.id) ?? [];
    const rows: (string | number)[][] = [];

    // ── Cabecera ──────────────────────────────────────────────────────────
    rows.push(['Lote:', lote.nombreLote]);
    rows.push(['Fecha de compra:', fechaExcel(lote.fechaCompra)]);
    if (lote.tipoPropiedad === 'medias' && lote.socio) {
      rows.push([
        'Sociedad:',
        `A medias con ${lote.socio.nombre} (${lote.socio.porcentaje}% / ${100 - lote.socio.porcentaje}%)`,
      ]);
    } else {
      rows.push(['Propiedad:', 'Propio']);
    }
    rows.push([]); // blank row

    // ── Inventario de animales ─────────────────────────────────────────────
    rows.push(['INVENTARIO DE ANIMALES']);
    rows.push([
      'Arete', 'Raza', 'Peso inicial (kg)', 'Peso actual (kg)',
      'Ganancia (kg)', 'Precio compra (₡)', 'Fecha ingreso', 'Estado',
    ]);

    if (animales.length === 0) {
      rows.push(['Sin animales registrados']);
    } else {
      for (const a of animales) {
        rows.push([
          a.numeroArete,
          a.raza,
          a.pesoInicial,
          a.pesoActual,
          a.pesoActual - a.pesoInicial,
          a.precioCompra,
          fechaExcel(a.fechaIngreso),
          a.estado,
        ]);
      }
    }

    rows.push([]); // blank row

    // ── Ventas ─────────────────────────────────────────────────────────────
    rows.push(['VENTAS']);
    const esMedias = lote.tipoPropiedad === 'medias';
    const headerVentas: string[] = [
      'Fecha', 'Cantidad animales', 'Total venta (₡)',
      'Total inversión (₡)', 'Gastos proporción (₡)', 'Utilidad bruta (₡)',
    ];
    if (esMedias) {
      headerVentas.push('Utilidad propietario (₡)', 'Utilidad socio (₡)');
    }
    rows.push(headerVentas);

    if (ventas.length === 0) {
      rows.push(['Sin ventas registradas']);
    } else {
      for (const v of ventas) {
        const row: (string | number)[] = [
          fechaExcel(v.fecha),
          v.cantidadAnimales,
          v.totalVenta,
          v.totalInversion,
          v.gastosProporcion,
          v.utilidadBruta,
        ];
        if (esMedias) {
          row.push(v.utilidadPropietario ?? 0, v.utilidadSocio ?? 0);
        }
        rows.push(row);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sanitizarNombreHoja(lote.nombreLote));
  }

  const fecha = new Date().toISOString().substring(0, 10);
  const safeFinca = nombreFinca.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `GanaCR_${safeFinca}_${fecha}.xlsx`);
}
