import { useEffect, useRef } from 'react';

interface UseBarcodeScannerProps {
  onScan: (barcode: string) => void;
  enabled?: boolean;
}

export function useBarcodeScanner({ onScan, enabled = true }: UseBarcodeScannerProps) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  const handleKeyPress = (char: string) => {
    if (!enabled) return;

    const now = Date.now();
    const timeDiff = now - lastKeyTimeRef.current;
    lastKeyTimeRef.current = now;

    // Standard barcode scanners emulate keyboard typing with < 40ms interval between keys
    if (timeDiff > 100 && bufferRef.current.length > 0) {
      // If delay was too long, reset buffer (user was manually typing elsewhere)
      bufferRef.current = '';
    }

    if (char === 'Enter' || char === '\r' || char === '\n') {
      if (bufferRef.current.trim().length >= 4) {
        onScan(bufferRef.current.trim());
      }
      bufferRef.current = '';
    } else if (char.length === 1) {
      bufferRef.current += char;
    }
  };

  return {
    handleKeyPress,
  };
}

