// tests/e2e/global-setup.ts — resiembra el emulador antes de cada corrida.
import { seedEmulator } from '../../scripts/seed-emulator';

export default async function globalSetup() {
  await seedEmulator();
}
