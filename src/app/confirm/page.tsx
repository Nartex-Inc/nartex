// src/app/confirm/page.tsx

export const dynamic = "force-dynamic";   // skip all static pre-rendering

import ConfirmClient from "./ConfirmClient";

export default function ConfirmPage() {
  return <ConfirmClient />;
}
