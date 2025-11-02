
import { CONFIG } from 'src/global-config';

import { EnterClassCodeView } from 'src/sections/realtime-class/enter-classid';

// ----------------------------------------------------------------------

export const metadata = { title: `Class Room - ${CONFIG.appName}` };

export default function Page() {
  return (
    <EnterClassCodeView />
  );
}
