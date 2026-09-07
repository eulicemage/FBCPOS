import * as net from "net";

export interface PrintJobOptions {
  host: string;
  port: number;
  data: Buffer;
  timeoutMs?: number;
}

export class DesktopPrinterTransport {
  /**
   * Directly sends raw ESC/POS byte buffer to thermal printer over TCP (e.g. 192.168.1.100:9100)
   */
  static async sendRawToNetworkPrinter(options: PrintJobOptions): Promise<{ success: boolean; message: string }> {
    const { host, port, data, timeoutMs = 5000 } = options;

    return new Promise((resolve) => {
      const socket = new net.Socket();
      let isResolved = false;

      const finish = (success: boolean, message: string) => {
        if (isResolved) return;
        isResolved = true;
        socket.destroy();
        resolve({ success, message });
      };

      socket.setTimeout(timeoutMs);

      socket.on("connect", () => {
        socket.write(data, (err) => {
          if (err) {
            finish(false, `Failed writing to printer: ${err.message}`);
          } else {
            // Short delay to allow buffer flush
            setTimeout(() => {
              finish(true, `Printed successfully to ${host}:${port}`);
            }, 300);
          }
        });
      });

      socket.on("timeout", () => {
        finish(false, `Printer connection timed out (${host}:${port})`);
      });

      socket.on("error", (err) => {
        finish(false, `Printer socket error: ${err.message}`);
      });

      try {
        socket.connect(port, host);
      } catch (err: any) {
        finish(false, `Socket connect exception: ${err?.message || String(err)}`);
      }
    });
  }
}
