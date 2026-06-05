import LegalPageLayout from '@/components/LegalPageLayout';
import contenido from '@/content/legal/privacidad.md?raw';

export default function Privacidad() {
  return <LegalPageLayout content={contenido} />;
}
