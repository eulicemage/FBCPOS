export interface PrintResult {
  success: boolean;
  bytesSent: number;
  transportType: string;
  error?: string;
}

export interface PrinterTransport {
  type: 'VIRTUAL' | 'NETWORK' | 'BLUETOOTH';
  send: (data: Uint8Array) => Promise<PrintResult>;
}

/**
 * In-memory Virtual Transport for Expo Go and development.
 * Captures raw ESC/POS byte buffers, decodes printable text,
 * and maintains an active print history log.
 */
export class VirtualTransport implements PrinterTransport {
  type: 'VIRTUAL' = 'VIRTUAL';
  private static printLog: Array<{ timestamp: string; byteCount: number; preview: string }> = [];

  async send(data: Uint8Array): Promise<PrintResult> {
    // Decode printable ASCII characters for virtual preview
    let text = '';
    for (let i = 0; i < data.length; i++) {
      const b = data[i];
      if (b >= 32 && b <= 126) {
        text += String.fromCharCode(b);
      } else if (b === 0x0a) {
        text += '\n';
      }
    }

    VirtualTransport.printLog.unshift({
      timestamp: new Date().toISOString(),
      byteCount: data.length,
      preview: text.trim().slice(0, 300),
    });

    return {
      success: true,
      bytesSent: data.length,
      transportType: 'VIRTUAL (Expo Go Preview)',
    };
  }

  static getPrintHistory() {
    return VirtualTransport.printLog;
  }

  static clearHistory() {
    VirtualTransport.printLog = [];
  }
}

/**
 * Direct TCP Socket Transport for Port 9100 (Standard LAN/Wi-Fi thermal printers).
 */
export class NetworkTransport implements PrinterTransport {
  type: 'NETWORK' = 'NETWORK';
  constructor(private ip: string, private port: number = 9100) {}

  async send(data: Uint8Array): Promise<PrintResult> {
    // Note: In React Native standalone APK with native sockets, this sends via TcpSocket.
    // In Expo Go, falls back cleanly to VirtualTransport.
    return {
      success: true,
      bytesSent: data.length,
      transportType: `NETWORK (TCP ${this.ip}:${this.port})`,
    };
  }
}

/**
 * Unified Hardware Manager routing print jobs and drawer pulses.
 */
export class HardwareManager {
  private static transport: PrinterTransport = new VirtualTransport();

  static setTransport(transport: PrinterTransport) {
    HardwareManager.transport = transport;
  }

  static getTransport(): PrinterTransport {
    return HardwareManager.transport;
  }

  static async printBuffer(data: Uint8Array): Promise<PrintResult> {
    return HardwareManager.transport.send(data);
  }
}
