import React from 'react';
import { CadPanicDistressCard as CoreCadPanicDistressCard, usePanicSosAlert, PanicSosEvent } from '../guard/GuardPanicButton';

export { usePanicSosAlert };
export type { PanicSosEvent };

export const CadPanicDistressCard: React.FC<{
  onAcknowledge?: (alert: PanicSosEvent) => void;
  onDispatchBackup?: (alert: PanicSosEvent) => void;
}> = (props) => {
  return <CoreCadPanicDistressCard {...props} />;
};

export default CadPanicDistressCard;
