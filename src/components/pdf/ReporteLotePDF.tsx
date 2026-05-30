import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { Animal, Gasto, Lote, Venta } from '@/types';

// ─── Tema ────────────────────────────────────────────────────────────────────
const C = {
  primary:     '#1b4332',
  primaryMid:  '#2d6a4f',
  primaryLight:'#f0f9f0',
  accent:      '#40b87a',
  border:      '#b8dfc6',
  text:        '#1b2e22',
  muted:       '#4a6a55',
  white:       '#ffffff',
  altRow:      '#f7fcf8',
};

const s = StyleSheet.create({
  page:             { fontFamily: 'Helvetica', fontSize: 9, color: C.text, paddingHorizontal: 30, paddingVertical: 28 },
  // Header
  header:           { backgroundColor: C.primary, padding: 14, marginBottom: 16, borderRadius: 4 },
  headerBrand:      { fontSize: 15, color: C.white, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  headerFinca:      { fontSize: 9, color: C.accent, marginBottom: 1 },
  headerLote:       { fontSize: 11, color: C.white, fontFamily: 'Helvetica-Bold', marginBottom: 1 },
  headerFecha:      { fontSize: 8, color: '#a7d4bc' },
  // Sección
  section:          { marginBottom: 14 },
  sectionBar:       { backgroundColor: C.primaryMid, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 0 },
  sectionTitle:     { fontSize: 9, color: C.white, fontFamily: 'Helvetica-Bold' },
  // Info
  infoBlock:        { paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: C.border, marginBottom: 8 },
  infoRow:          { flexDirection: 'row', marginBottom: 3 },
  infoLabel:        { width: 110, fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.muted },
  infoValue:        { flex: 1, fontSize: 8, color: C.text },
  // Resumen financiero
  summaryRow:       { flexDirection: 'row', marginTop: 6, marginBottom: 2 },
  summaryCard:      { flex: 1, marginRight: 5, backgroundColor: C.primaryLight, borderWidth: 0.5, borderColor: C.border, borderRadius: 3, padding: 7 },
  summaryCardLast:  { flex: 1, marginRight: 0, backgroundColor: C.primaryLight, borderWidth: 0.5, borderColor: C.border, borderRadius: 3, padding: 7 },
  summaryCardHl:    { flex: 1, marginRight: 0, backgroundColor: C.primary, borderRadius: 3, padding: 7 },
  summaryLabel:     { fontSize: 7, color: C.muted, marginBottom: 3 },
  summaryLabelHl:   { fontSize: 7, color: '#a7d4bc', marginBottom: 3 },
  summaryValue:     { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.primary },
  summaryValueHl:   { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.white },
  // Tabla
  tableHeader:      { flexDirection: 'row', backgroundColor: C.primaryMid, paddingVertical: 5, paddingHorizontal: 4 },
  tableRow:         { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 0.3, borderBottomColor: C.border },
  tableRowAlt:      { backgroundColor: C.altRow },
  cellH:            { fontSize: 7, color: C.white, fontFamily: 'Helvetica-Bold' },
  cell:             { fontSize: 7, color: C.text },
  emptyRow:         { paddingVertical: 6, paddingHorizontal: 4 },
  emptyText:        { fontSize: 8, color: C.muted, fontStyle: 'italic' },
  // Footer
  footer:           { position: 'absolute', bottom: 18, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 5 },
  footerText:       { fontSize: 7, color: C.muted },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso || typeof iso !== 'string') return '—';
  const p = iso.substring(0, 10).split('-');
  if (p.length !== 3) return iso;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function fmtCRC(n: number): string {
  const safe = Number.isFinite(n) ? n : 0;
  return '₡' + Math.round(safe).toLocaleString('es-CR');
}

function fmtKg(n: number): string {
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toFixed(1) + ' kg';
}

const TIPO_LABEL: Record<string, string> = {
  alimento:    'Alimento',
  veterinario: 'Veterinario',
  mano_de_obra:'Mano de obra',
  transporte:  'Transporte',
  otro:        'Otro',
};

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ReporteLotePDFProps {
  lote: Lote;
  animales: Animal[];
  ventas: Venta[];
  gastos: Gasto[];
  nombreFinca: string;
  fechaGenerado: string; // ISO date
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function ReporteLotePDF({
  lote, animales, ventas, gastos, nombreFinca, fechaGenerado,
}: ReporteLotePDFProps) {
  const esMedias = lote.tipoPropiedad === 'medias';
  const activos  = animales.filter(a => a.estado === 'activo');
  const gastosOrdenados = [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <Document title={`GanaCR - ${lote.nombreLote}`} author="GanaCR">
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerBrand}>GanaCR</Text>
          <Text style={s.headerFinca}>{nombreFinca}</Text>
          <Text style={s.headerLote}>{lote.nombreLote}</Text>
          <Text style={s.headerFecha}>Generado el {fmtDate(fechaGenerado)}</Text>
        </View>

        {/* Info del lote */}
        <View style={s.infoBlock}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Fecha de compra:</Text>
            <Text style={s.infoValue}>{fmtDate(lote.fechaCompra)}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Tipo de propiedad:</Text>
            <Text style={s.infoValue}>
              {esMedias && lote.socio
                ? `A medias — ${lote.socio.nombre} (${lote.socio.porcentaje}% / ${100 - lote.socio.porcentaje}%)`
                : 'Propio'}
            </Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Animales activos:</Text>
            <Text style={s.infoValue}>{activos.length}</Text>
          </View>
        </View>

        {/* Resumen financiero */}
        <View style={s.section}>
          <View style={s.sectionBar}><Text style={s.sectionTitle}>RESUMEN FINANCIERO</Text></View>
          <View style={s.summaryRow}>
            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>Total invertido</Text>
              <Text style={s.summaryValue}>{fmtCRC(lote.totalInvertido)}</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>Total gastos</Text>
              <Text style={s.summaryValue}>{fmtCRC(lote.totalGastos)}</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>Total ventas</Text>
              <Text style={s.summaryValue}>{fmtCRC(lote.totalVentas)}</Text>
            </View>
            <View style={esMedias ? s.summaryCard : s.summaryCardLast}>
              <Text style={s.summaryLabel}>Utilidad bruta</Text>
              <Text style={s.summaryValue}>{fmtCRC(lote.utilidadTotal)}</Text>
            </View>
            {esMedias && lote.socio && (
              <View style={s.summaryCardHl}>
                <Text style={s.summaryLabelHl}>Utilidad socio ({lote.socio.porcentaje}%)</Text>
                <Text style={s.summaryValueHl}>{fmtCRC(lote.utilidadTotal * lote.socio.porcentaje / 100)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Inventario actual */}
        <View style={s.section}>
          <View style={s.sectionBar}><Text style={s.sectionTitle}>INVENTARIO ACTUAL ({activos.length} animales activos)</Text></View>
          <View style={s.tableHeader}>
            <Text style={[s.cellH, { flex: 1.2 }]}>Arete</Text>
            <Text style={[s.cellH, { flex: 1.5 }]}>Raza</Text>
            <Text style={[s.cellH, { flex: 1 }]}>Peso act.</Text>
            <Text style={[s.cellH, { flex: 1 }]}>Ganancia</Text>
            <Text style={[s.cellH, { flex: 0.8 }]}>Estado</Text>
          </View>
          {activos.length === 0 ? (
            <View style={s.emptyRow}><Text style={s.emptyText}>Sin animales activos</Text></View>
          ) : activos.map((a, i) => (
            <View key={a.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={[s.cell, { flex: 1.2 }]}>{a.numeroArete}</Text>
              <Text style={[s.cell, { flex: 1.5 }]}>{a.raza}</Text>
              <Text style={[s.cell, { flex: 1 }]}>{fmtKg(a.pesoActual)}</Text>
              <Text style={[s.cell, { flex: 1 }]}>{a.pesoActual - a.pesoInicial >= 0 ? '+' : ''}{fmtKg(a.pesoActual - a.pesoInicial)}</Text>
              <Text style={[s.cell, { flex: 0.8 }]}>{a.estado}</Text>
            </View>
          ))}
        </View>

        {/* Ventas */}
        <View style={s.section}>
          <View style={s.sectionBar}><Text style={s.sectionTitle}>HISTORIAL DE VENTAS ({ventas.length})</Text></View>
          <View style={s.tableHeader}>
            <Text style={[s.cellH, { flex: 1 }]}>Fecha</Text>
            <Text style={[s.cellH, { flex: 0.7 }]}>Animales</Text>
            <Text style={[s.cellH, { flex: 1.2 }]}>Total venta</Text>
            <Text style={[s.cellH, { flex: 1.2 }]}>Utilidad bruta</Text>
            {esMedias && <Text style={[s.cellH, { flex: 1.2 }]}>Utilidad socio</Text>}
          </View>
          {ventas.length === 0 ? (
            <View style={s.emptyRow}><Text style={s.emptyText}>Sin ventas registradas</Text></View>
          ) : ventas.map((v, i) => (
            <View key={v.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={[s.cell, { flex: 1 }]}>{fmtDate(v.fecha)}</Text>
              <Text style={[s.cell, { flex: 0.7 }]}>{v.cantidadAnimales}</Text>
              <Text style={[s.cell, { flex: 1.2 }]}>{fmtCRC(v.totalVenta)}</Text>
              <Text style={[s.cell, { flex: 1.2 }]}>{fmtCRC(v.utilidadBruta)}</Text>
              {esMedias && <Text style={[s.cell, { flex: 1.2 }]}>{fmtCRC(v.utilidadSocio ?? 0)}</Text>}
            </View>
          ))}
        </View>

        {/* Gastos detallados */}
        <View style={s.section}>
          <View style={s.sectionBar}><Text style={s.sectionTitle}>GASTOS DETALLADOS ({gastosOrdenados.length})</Text></View>
          <View style={s.tableHeader}>
            <Text style={[s.cellH, { flex: 1 }]}>Fecha</Text>
            <Text style={[s.cellH, { flex: 2 }]}>Concepto</Text>
            <Text style={[s.cellH, { flex: 1.2 }]}>Tipo</Text>
            <Text style={[s.cellH, { flex: 1.2 }]}>Monto</Text>
          </View>
          {gastosOrdenados.length === 0 ? (
            <View style={s.emptyRow}><Text style={s.emptyText}>Sin gastos registrados</Text></View>
          ) : gastosOrdenados.map((g, i) => (
            <View key={g.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={[s.cell, { flex: 1 }]}>{fmtDate(g.fecha)}</Text>
              <Text style={[s.cell, { flex: 2 }]}>{g.concepto}</Text>
              <Text style={[s.cell, { flex: 1.2 }]}>{TIPO_LABEL[g.tipo] ?? g.tipo}</Text>
              <Text style={[s.cell, { flex: 1.2 }]}>{fmtCRC(g.monto)}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>GanaCR — Sistema de Gestion Ganadera</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
