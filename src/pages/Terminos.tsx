import LegalPageLayout from '@/components/LegalPageLayout';
import contenido from '@/content/legal/terminos.md?raw';

export default function Terminos() {
  return <LegalPageLayout content={contenido} />;
}
