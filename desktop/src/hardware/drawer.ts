import { DesktopPrinterTransport } from "./printer";

export class DesktopCashDrawer {
  /**
   * Generates the standard ESC/POS pulse command for RJ11 drawer kick:
   * ESC p m t1 t2
   * pin 2: m = 0
   * pin 5: m = 1
   * pulse ON: 25 * 2ms = 50ms
   * pulse OFF: 250 * 2ms = 500ms
   */
  static getKickCommand(pin: "PIN_2" | "PIN_5" = "PIN_2"): Buffer {
    const m = pin === "PIN_5" ? 0x01 : 0x00;
    return Buffer.from([0x1b, 0x70, m, 0x19, 0xfa]);
  }

  /**
   * Kicks the RJ11 cash drawer via the printer network socket
   */
  static async kickViaNetworkPrinter(host: string, port: number, pin: "PIN_2" | "PIN_5" = "PIN_2") {
    const kickBytes = this.getKickCommand(pin);
    return DesktopPrinterTransport.sendRawToNetworkPrinter({
      host,
      port,
      data: kickBytes,
      timeoutMs: 3000,
    });
  }
}
