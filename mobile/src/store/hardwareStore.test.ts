import { describe, it, expect, beforeEach } from 'vitest';
import { useHardwareStore } from './hardwareStore';
import { VirtualTransport } from '../services/hardwareTransport';

describe('HardwareStore', () => {
  beforeEach(() => {
    VirtualTransport.clearHistory();
    useHardwareStore.getState().setPrinterConfig({
      printerType: 'VIRTUAL',
      paperWidth: '70MM',
      autoPrintOnCheckout: true,
      autoKickDrawerOnCash: true,
    });
  });

  it('defaults to 70MM paper width for Xprinter', () => {
    expect(useHardwareStore.getState().paperWidth).toBe('70MM');
  });

  it('updates printer configuration', () => {
    useHardwareStore.getState().setPrinterConfig({
      paperWidth: '80MM',
      printerIp: '192.168.1.200',
    });

    expect(useHardwareStore.getState().paperWidth).toBe('80MM');
    expect(useHardwareStore.getState().printerIp).toBe('192.168.1.200');
  });

  it('sends test print and logs virtual receipt', async () => {
    const result = await useHardwareStore.getState().sendTestPrint();
    expect(result.success).toBe(true);
    expect(result.bytesSent).toBeGreaterThan(50);

    const logs = VirtualTransport.getPrintHistory();
    expect(logs.length).toBe(1);
    expect(logs[0].preview).toContain('HARDWARE SELF-TEST');
  });

  it('kicks cash drawer pulse', async () => {
    const result = await useHardwareStore.getState().kickCashDrawer();
    expect(result.success).toBe(true);
    expect(result.bytesSent).toBeGreaterThan(0);
  });
});

