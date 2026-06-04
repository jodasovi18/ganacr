import { createElement, ReactElement } from 'react';
import type { DocumentProps } from '@react-pdf/renderer';
import type { ReporteLotePDFProps } from '@/components/pdf/ReporteLotePDF';
import type { ReporteSocioPDFProps } from '@/components/pdf/ReporteSocioPDF';

function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportarLotePDF(props: ReporteLotePDFProps): Promise<void> {
  // Carga diferida: @react-pdf/renderer es pesado y solo se necesita al generar el PDF.
  const [{ pdf }, { default: ReporteLotePDF }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/pdf/ReporteLotePDF'),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = createElement(ReporteLotePDF, props) as unknown as ReactElement<DocumentProps, any>;
  const blob = await pdf(el).toBlob();
  const safeName = props.lote.nombreLote.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
  descargarBlob(blob, `GanaCR_${safeName}_${props.fechaGenerado}.pdf`);
}

export async function exportarSocioPDF(props: ReporteSocioPDFProps): Promise<void> {
  const [{ pdf }, { default: ReporteSocioPDF }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/pdf/ReporteSocioPDF'),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = createElement(ReporteSocioPDF, props) as unknown as ReactElement<DocumentProps, any>;
  const blob = await pdf(el).toBlob();
  const safeLote = props.lote.nombreLote.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const safeSocio = props.lote.socio!.nombre.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
  descargarBlob(blob, `GanaCR_Socio_${safeSocio}_${safeLote}_${props.fechaGenerado}.pdf`);
}
