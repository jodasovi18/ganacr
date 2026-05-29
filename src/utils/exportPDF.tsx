import { pdf } from '@react-pdf/renderer';
import ReporteLotePDF, { ReporteLotePDFProps } from '@/components/pdf/ReporteLotePDF';

export async function exportarLotePDF(props: ReporteLotePDFProps): Promise<void> {
  const blob = await pdf(<ReporteLotePDF {...props} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = props.lote.nombreLote.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
  a.href = url;
  a.download = `GanaCR_${safeName}_${props.fechaGenerado}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
