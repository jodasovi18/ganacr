import { pdf, DocumentProps } from '@react-pdf/renderer';
import { createElement, ReactElement } from 'react';
import ReporteLotePDF, { ReporteLotePDFProps } from '@/components/pdf/ReporteLotePDF';
import ReporteSocioPDF, { ReporteSocioPDFProps } from '@/components/pdf/ReporteSocioPDF';

export async function exportarLotePDF(props: ReporteLotePDFProps): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = createElement(ReporteLotePDF, props) as unknown as ReactElement<DocumentProps, any>;
  const blob = await pdf(el).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = props.lote.nombreLote.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
  a.href = url;
  a.download = `GanaCR_${safeName}_${props.fechaGenerado}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportarSocioPDF(props: ReporteSocioPDFProps): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = createElement(ReporteSocioPDF, props) as unknown as ReactElement<DocumentProps, any>;
  const blob = await pdf(el).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeLote = props.lote.nombreLote.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const safeSocio = props.lote.socio!.nombre.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
  a.href = url;
  a.download = `GanaCR_Socio_${safeSocio}_${safeLote}_${props.fechaGenerado}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
