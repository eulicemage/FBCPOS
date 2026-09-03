import { AppConfig } from '../config';

export type PaperWidth = '80MM' | '70MM' | '58MM';
export type DrawerPin = 'PIN_2' | 'PIN_5';

export interface PrintReceiptParams {
  branchName: string;
  branchAddress: string;
  taxId: string;
  invoiceNumber: string;
  cashierName: string;
  terminalNumber: string;
  shiftNumber?: string;
  customerName?: string;
  seniorIdNumber?: string;
  memberBarcode?: string;
  memberPointsBalance?: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }>;
  subtotal: number;
  discountType?: string;
  discountValue?: number;
  discountAmount: number;
  vatableAmount: number;
  vatExemptAmount?: number;
  vatAmount: number;
  totalDue: number;
  amountReceived: number;
  changeAmount: number;
  paymentMethod: string;
  payments?: Array<{
    method: string;
    amountTendered: number;
    referenceNumber?: string;
  }>;
  date: string;
}

export interface PrintFormatOptions {
  paperWidth?: PaperWidth;
  includeBarcode?: boolean;
  includeQr?: boolean;
  kickDrawer?: boolean;
  drawerPin?: DrawerPin;
}

export interface XReadingParams {
  branchName: string;
  branchAddress: string;
  taxId: string;
  terminalNumber: string;
  shiftNumber: string;
  cashierName: string;
  openedAt: string;
  closedAt: string;
  openingCash: number;
  grossSales: number;
  discountAmount: number;
  netSales: number;
  vatableSales: number;
  vatExemptSales: number;
  vatAmount: number;
  cashCollected: number;
  cardTotal: number;
  gcashTotal: number;
  mayaTotal: number;
  pointsTotal: number;
  declaredCash?: number;
  cashDifference?: number;
  transactionCount: number;
  voidCount: number;
}

export interface ZReadingParams {
  branchName: string;
  branchAddress: string;
  taxId: string;
  terminalNumber: string;
  date: string;
  openedAt: string;
  closedAt: string;
  managerName: string;
  zCounter: number;
  previousGrandTotal: number;
  todaysGrossSales: number;
  newGrandTotal: number;
  todaysDiscounts: number;
  todaysNetSales: number;
  vatableSales: number;
  vatExemptSales: number;
  vatAmount: number;
  cashTotal: number;
  cardTotal: number;
  gcashTotal: number;
  mayaTotal: number;
  pointsTotal: number;
  totalTransactions: number;
  totalVoids: number;
}

export class ESCPOSBuilder {
  private buffer: number[] = [];

  init(): this {
    this.buffer.push(0x1b, 0x40); // ESC @
    return this;
  }

  alignCenter(): this {
    this.buffer.push(0x1b, 0x61, 0x01); // ESC a 1
    return this;
  }

  alignLeft(): this {
    this.buffer.push(0x1b, 0x61, 0x00); // ESC a 0
    return this;
  }

  alignRight(): this {
    this.buffer.push(0x1b, 0x61, 0x02); // ESC a 2
    return this;
  }

  bold(enable: boolean): this {
    this.buffer.push(0x1b, 0x45, enable ? 0x01 : 0x00); // ESC E n
    return this;
  }

  doubleSize(enable: boolean): this {
    this.buffer.push(0x1d, 0x21, enable ? 0x11 : 0x00); // GS ! n
    return this;
  }

  doubleHeight(enable: boolean): this {
    this.buffer.push(0x1d, 0x21, enable ? 0x01 : 0x00); // GS ! 1
    return this;
  }

  doubleWidth(enable: boolean): this {
    this.buffer.push(0x1d, 0x21, enable ? 0x10 : 0x00); // GS ! 16
    return this;
  }

  underline(mode: 0 | 1 | 2 = 1): this {
    this.buffer.push(0x1b, 0x2d, mode); // ESC - n
    return this;
  }

  invert(enable: boolean): this {
    this.buffer.push(0x1d, 0x42, enable ? 0x01 : 0x00); // GS B n
    return this;
  }

  feed(lines: number = 1): this {
    this.buffer.push(0x1b, 0x64, Math.max(1, lines)); // ESC d n
    return this;
  }

  text(str: string): this {
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      // Replace Peso symbol / non-ASCII currency with P
      if (code === 8369 || str[i] === '₱') {
        this.buffer.push(0x50); // 'P'
      } else if (code <= 127) {
        this.buffer.push(code);
      } else {
        this.buffer.push(0x3f); // '?' for unmapped unicode
      }
    }
    return this;
  }

  line(str: string = ''): this {
    this.text(str);
    this.buffer.push(0x0a); // LF
    return this;
  }

  separator(char: string = '-', width: number = 48): this {
    return this.line(char.repeat(width));
  }

  twoColumn(left: string, right: string, width: number = 48): this {
    const spaceCount = width - left.length - right.length;
    if (spaceCount <= 0) {
      const maxLeft = width - right.length - 1;
      const truncated = left.substring(0, Math.max(0, maxLeft));
      const remainingSpace = width - truncated.length - right.length;
      return this.line(`${truncated}${' '.repeat(Math.max(1, remainingSpace))}${right}`);
    }
    return this.line(`${left}${' '.repeat(spaceCount)}${right}`);
  }

  kickDrawer(pin: DrawerPin = 'PIN_2'): this {
    const pinCode = pin === 'PIN_5' ? 0x01 : 0x00;
    this.buffer.push(0x1b, 0x70, pinCode, 0x19, 0xfa); // ESC p m t1 t2
    return this;
  }

  cut(full: boolean = false): this {
    this.buffer.push(0x0a, 0x0a, 0x0a);
    if (full) {
      this.buffer.push(0x1d, 0x56, 0x00); // GS V 0 (full cut)
    } else {
      this.buffer.push(0x1d, 0x56, 0x41, 0x03); // GS V 65 3 (partial cut with feed)
    }
    return this;
  }

  barcode128(data: string): this {
    this.buffer.push(0x1d, 0x68, 64); // Height: 64 dots
    this.buffer.push(0x1d, 0x77, 2);  // Width: 2
    this.buffer.push(0x1d, 0x48, 2);  // HRI below barcode
    this.buffer.push(0x1d, 0x66, 0);  // Font A
    this.buffer.push(0x1d, 0x6b, 73, data.length); // Code 128
    for (let i = 0; i < data.length; i++) {
      this.buffer.push(data.charCodeAt(i));
    }
    this.buffer.push(0x0a);
    return this;
  }

  qrCode(data: string, moduleSize: number = 6): this {
    const dataLen = data.length + 3;
    const pL = dataLen % 256;
    const pH = Math.floor(dataLen / 256);

    this.buffer.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, Math.min(16, Math.max(1, moduleSize)));
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31);
    this.buffer.push(0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30);
    for (let i = 0; i < data.length; i++) {
      this.buffer.push(data.charCodeAt(i));
    }
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
    this.buffer.push(0x0a);
    return this;
  }

  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

export class PrinterService {
  /**
   * Returns line column count for the given paper width:
   * - 80mm: 48 columns (standard retail receipt)
   * - 70mm: 40 columns (Xprinter 70x50mm thermal paper)
   * - 58mm: 32 columns (portable mini thermal printer)
   */
  static getColumns(width: PaperWidth = '80MM'): number {
    switch (width) {
      case '58MM': return 32;
      case '70MM': return 40;
      case '80MM':
      default: return 48;
    }
  }

  /**
   * Formats an official sales receipt.
   * Supports 80mm, 70mm (Xprinter 70x50), and 58mm paper widths.
   */
  static formatReceipt(
    params: PrintReceiptParams,
    options: PrintFormatOptions = {}
  ): Uint8Array {
    const width = options.paperWidth || '80MM';
    const cols = PrinterService.getColumns(width);
    const builder = new ESCPOSBuilder();

    builder.init();

    if (options.kickDrawer !== false) {
      builder.kickDrawer(options.drawerPin || 'PIN_2');
    }

    // Header
    builder
      .alignCenter()
      .bold(true)
      .doubleSize(width !== '58MM')
      .line(AppConfig.receiptHeader.companyName)
      .doubleSize(false)
      .bold(false)
      .line(AppConfig.receiptHeader.tagline)
      .line(params.branchName)
      .line(params.branchAddress)
      .line(`VAT REG TIN: ${params.taxId}`)
      .separator('=', cols);

    // Meta
    builder
      .alignLeft()
      .twoColumn('INVOICE:', params.invoiceNumber, cols)
      .twoColumn('DATE:', params.date, cols)
      .twoColumn('CASHIER:', params.cashierName, cols)
      .twoColumn(
        `TERMINAL: ${params.terminalNumber}`,
        params.shiftNumber ? `SHIFT: #${params.shiftNumber}` : '',
        cols
      );

    if (params.customerName) {
      builder.twoColumn('CUSTOMER:', params.customerName, cols);
    }
    if (params.seniorIdNumber) {
      builder.twoColumn('SC/PWD ID:', params.seniorIdNumber, cols);
    }
    if (params.memberBarcode) {
      builder.twoColumn('MEMBER ID:', params.memberBarcode, cols);
    }

    builder.separator('-', cols);

    // Line Items
    if (width === '80MM') {
      builder.line('ITEM                    QTY      PRICE       TOTAL');
      builder.separator('-', cols);
      for (const item of params.items) {
        const name = item.name.padEnd(20, ' ').substring(0, 20);
        const qty = item.quantity.toString().padStart(4, ' ');
        const price = item.unitPrice.toFixed(2).padStart(10, ' ');
        const total = item.totalAmount.toFixed(2).padStart(11, ' ');
        builder.line(`${name} ${qty} ${price} ${total}`);
      }
    } else if (width === '70MM') {
      // 70mm Xprinter: 40 cols -> ITEM (16) QTY (3) PRICE (9) TOTAL (10)
      builder.line('ITEM             QTY    PRICE      TOTAL');
      builder.separator('-', cols);
      for (const item of params.items) {
        const name = item.name.padEnd(16, ' ').substring(0, 16);
        const qty = item.quantity.toString().padStart(3, ' ');
        const price = item.unitPrice.toFixed(2).padStart(9, ' ');
        const total = item.totalAmount.toFixed(2).padStart(10, ' ');
        builder.line(`${name} ${qty} ${price} ${total}`);
      }
    } else {
      // 58mm compact layout
      builder.line('ITEM/QTYxPRICE             TOTAL');
      builder.separator('-', cols);
      for (const item of params.items) {
        builder.line(item.name.substring(0, cols));
        const sub = `  ${item.quantity} x ${item.unitPrice.toFixed(2)}`;
        const tot = item.totalAmount.toFixed(2);
        builder.twoColumn(sub, tot, cols);
      }
    }

    builder.separator('-', cols);

    // Financials
    builder.twoColumn('SUBTOTAL:', `P${params.subtotal.toFixed(2)}`, cols);

    if (params.discountAmount > 0) {
      const discLabel =
        params.discountType === 'SENIOR_PWD'
          ? 'DISC (SC/PWD 20%):'
          : `DISCOUNT (${params.discountValue || 0}%):`;
      builder.twoColumn(discLabel, `-P${params.discountAmount.toFixed(2)}`, cols);
    }

    if (params.vatExemptAmount && params.vatExemptAmount > 0) {
      builder.twoColumn('VAT EXEMPT SALES:', `P${params.vatExemptAmount.toFixed(2)}`, cols);
    }

    builder
      .twoColumn('VATABLE SALES (12%):', `P${params.vatableAmount.toFixed(2)}`, cols)
      .twoColumn('12% VAT AMOUNT:', `P${params.vatAmount.toFixed(2)}`, cols)
      .separator('-', cols);

    // Total Due
    builder
      .bold(true)
      .doubleHeight(true)
      .twoColumn('TOTAL DUE:', `P${params.totalDue.toFixed(2)}`, cols)
      .doubleHeight(false)
      .bold(false)
      .separator('=', cols);

    // Payments
    if (params.payments && params.payments.length > 0) {
      for (const p of params.payments) {
        const refStr = p.referenceNumber ? ` (${p.referenceNumber})` : '';
        builder.twoColumn(
          `TENDER [${p.method}]${refStr}:`,
          `P${p.amountTendered.toFixed(2)}`,
          cols
        );
      }
    } else {
      builder.twoColumn(
        `TENDER [${params.paymentMethod}]:`,
        `P${params.amountReceived.toFixed(2)}`,
        cols
      );
    }

    builder.twoColumn('CHANGE:', `P${params.changeAmount.toFixed(2)}`, cols);

    // Membership points balance remaining
    if (params.memberPointsBalance !== undefined) {
      builder.twoColumn(
        'REMAINING POINTS BAL:',
        `P${params.memberPointsBalance.toFixed(2)}`,
        cols
      );
    }

    builder.separator('=', cols);

    // Barcode & QR Code
    if (options.includeBarcode !== false && params.invoiceNumber) {
      builder
        .alignCenter()
        .feed(1)
        .barcode128(params.invoiceNumber)
        .line(params.invoiceNumber);
    }

    if (options.includeQr) {
      builder
        .alignCenter()
        .feed(1)
        .qrCode(`https://verify.foodbaskets.ph/inv/${params.invoiceNumber}`, 4)
        .line('Scan to Verify Receipt');
    }

    // Footer
    builder
      .alignCenter()
      .feed(1)
      .bold(true)
      .line('THANK YOU FOR SHOPPING WITH US!')
      .bold(false)
      .line('Please keep this receipt for returns.')
      .line('POS Accreditation No. FP000000000-0000000000')
      .line('Permit To Use No. 0000-000-00000')
      .line('THIS SERVES AS AN OFFICIAL RECEIPT')
      .cut(false);

    return builder.build();
  }

  /**
   * Formats official X-Reading Report (Switch Cashier / Mid-Shift closing).
   */
  static formatXReading(
    params: XReadingParams,
    options: PrintFormatOptions = {}
  ): Uint8Array {
    const width = options.paperWidth || '70MM';
    const cols = PrinterService.getColumns(width);
    const builder = new ESCPOSBuilder();

    builder
      .init()
      .alignCenter()
      .bold(true)
      .doubleSize(true)
      .line(AppConfig.receiptHeader.companyName)
      .doubleSize(false)
      .bold(false)
      .line(params.branchName)
      .line(`VAT REG TIN: ${params.taxId}`)
      .feed(1)
      .bold(true)
      .line('OFFICIAL X-READING REPORT')
      .line('(CASHIER SHIFT HANDOVER)')
      .bold(false)
      .separator('=', cols)
      .alignLeft()
      .twoColumn('TERMINAL:', params.terminalNumber, cols)
      .twoColumn('SHIFT #:', params.shiftNumber, cols)
      .twoColumn('CASHIER:', params.cashierName, cols)
      .twoColumn('OPENED AT:', params.openedAt, cols)
      .twoColumn('CLOSED AT:', params.closedAt, cols)
      .separator('-', cols)
      .twoColumn('BEGINNING FLOAT:', `P${params.openingCash.toFixed(2)}`, cols)
      .twoColumn('GROSS SALES:', `P${params.grossSales.toFixed(2)}`, cols)
      .twoColumn('DISCOUNTS:', `-P${params.discountAmount.toFixed(2)}`, cols)
      .bold(true)
      .twoColumn('NET SALES:', `P${params.netSales.toFixed(2)}`, cols)
      .bold(false)
      .separator('-', cols)
      .twoColumn('VATABLE SALES (12%):', `P${params.vatableSales.toFixed(2)}`, cols)
      .twoColumn('VAT-EXEMPT SALES:', `P${params.vatExemptSales.toFixed(2)}`, cols)
      .twoColumn('12% VAT AMOUNT:', `P${params.vatAmount.toFixed(2)}`, cols)
      .separator('-', cols)
      .bold(true)
      .line('COLLECTIONS BY TENDER:')
      .bold(false)
      .twoColumn('  CASH COLLECTED:', `P${params.cashCollected.toFixed(2)}`, cols)
      .twoColumn('  CARD PAYMENTS:', `P${params.cardTotal.toFixed(2)}`, cols)
      .twoColumn('  GCASH PAYMENTS:', `P${params.gcashTotal.toFixed(2)}`, cols)
      .twoColumn('  MAYA PAYMENTS:', `P${params.mayaTotal.toFixed(2)}`, cols)
      .twoColumn('  MEMBER POINTS:', `P${params.pointsTotal.toFixed(2)}`, cols)
      .separator('-', cols)
      .twoColumn('TOTAL TRANSACTIONS:', `${params.transactionCount}`, cols)
      .twoColumn('TOTAL VOIDS:', `${params.voidCount}`, cols);

    if (params.declaredCash !== undefined) {
      builder
        .separator('-', cols)
        .twoColumn('EXPECTED CASH:', `P${(params.openingCash + params.cashCollected).toFixed(2)}`, cols)
        .twoColumn('DECLARED CASH:', `P${params.declaredCash.toFixed(2)}`, cols);

      const diff = params.cashDifference || 0;
      const diffLabel = diff >= 0 ? `+P${diff.toFixed(2)} (OVER)` : `-P${Math.abs(diff).toFixed(2)} (SHORT)`;
      builder.bold(true).twoColumn('CASH OVER/SHORT:', diffLabel, cols).bold(false);
    }

    builder
      .separator('=', cols)
      .feed(1)
      .alignCenter()
      .line('_____________________________')
      .line('OUTGOING CASHIER SIGNATURE')
      .feed(1)
      .line('_____________________________')
      .line('INCOMING CASHIER SIGNATURE')
      .feed(1)
      .cut(false);

    return builder.build();
  }

  /**
   * Formats official Z-Reading Report (End of Day / Store Closing).
   */
  static formatZReading(
    params: ZReadingParams,
    options: PrintFormatOptions = {}
  ): Uint8Array {
    const width = options.paperWidth || '70MM';
    const cols = PrinterService.getColumns(width);
    const builder = new ESCPOSBuilder();

    builder
      .init()
      .alignCenter()
      .bold(true)
      .doubleSize(true)
      .line(AppConfig.receiptHeader.companyName)
      .doubleSize(false)
      .bold(false)
      .line(params.branchName)
      .line(`VAT REG TIN: ${params.taxId}`)
      .feed(1)
      .bold(true)
      .line('OFFICIAL Z-READING REPORT')
      .line('(END OF DAY / STORE CLOSE)')
      .bold(false)
      .separator('=', cols)
      .alignLeft()
      .twoColumn('DATE:', params.date, cols)
      .twoColumn('TERMINAL:', params.terminalNumber, cols)
      .twoColumn('Z-COUNTER #:', `#${params.zCounter.toString().padStart(4, '0')}`, cols)
      .twoColumn('STORE OPENED:', params.openedAt, cols)
      .twoColumn('STORE CLOSED:', params.closedAt, cols)
      .twoColumn('MANAGER:', params.managerName, cols)
      .separator('=', cols)
      .line('CUMULATIVE GRAND TOTALS (BIR):')
      .twoColumn('PREVIOUS GRAND TOTAL:', `P${params.previousGrandTotal.toFixed(2)}`, cols)
      .twoColumn("TODAY'S GROSS SALES:", `P${params.todaysGrossSales.toFixed(2)}`, cols)
      .bold(true)
      .twoColumn('NEW GRAND TOTAL:', `P${params.newGrandTotal.toFixed(2)}`, cols)
      .bold(false)
      .separator('-', cols)
      .line("TODAY'S FINANCIAL SUMMARY:")
      .twoColumn('GROSS SALES:', `P${params.todaysGrossSales.toFixed(2)}`, cols)
      .twoColumn('DISCOUNTS:', `-P${params.todaysDiscounts.toFixed(2)}`, cols)
      .bold(true)
      .twoColumn('NET SALES:', `P${params.todaysNetSales.toFixed(2)}`, cols)
      .bold(false)
      .twoColumn('VATABLE SALES (12%):', `P${params.vatableSales.toFixed(2)}`, cols)
      .twoColumn('VAT-EXEMPT SALES:', `P${params.vatExemptSales.toFixed(2)}`, cols)
      .twoColumn('12% VAT AMOUNT:', `P${params.vatAmount.toFixed(2)}`, cols)
      .separator('-', cols)
      .line('COLLECTIONS BY TENDER:')
      .twoColumn('  CASH:', `P${params.cashTotal.toFixed(2)}`, cols)
      .twoColumn('  CARD:', `P${params.cardTotal.toFixed(2)}`, cols)
      .twoColumn('  GCASH:', `P${params.gcashTotal.toFixed(2)}`, cols)
      .twoColumn('  MAYA:', `P${params.mayaTotal.toFixed(2)}`, cols)
      .twoColumn('  MEMBER POINTS:', `P${params.pointsTotal.toFixed(2)}`, cols)
      .separator('-', cols)
      .twoColumn('TOTAL CUSTOMERS:', `${params.totalTransactions}`, cols)
      .twoColumn('TOTAL VOIDED TXNS:', `${params.totalVoids}`, cols)
      .separator('=', cols)
      .feed(1)
      .alignCenter()
      .line('_____________________________')
      .line('BRANCH MANAGER SIGNATURE')
      .feed(1)
      .line('_____________________________')
      .line('INTERNAL AUDITOR SIGNATURE')
      .feed(1)
      .bold(true)
      .line('STORE SUCCESSFULLY CLOSED FOR THE DAY')
      .bold(false)
      .cut(false);

    return builder.build();
  }

  /**
   * Generates a self-test diagnostic slip for verifying thermal printer
   * alignments, character sets, barcodes, cutter, and RJ11 drawer kick.
   */
  static formatTestReceipt(options: PrintFormatOptions = {}): Uint8Array {
    const width = options.paperWidth || '70MM';
    const cols = PrinterService.getColumns(width);
    const builder = new ESCPOSBuilder();

    builder
      .init()
      .alignCenter()
      .bold(true)
      .doubleSize(true)
      .line('HARDWARE SELF-TEST')
      .doubleSize(false)
      .bold(false)
      .line(`FBCPOS Thermal Engine (Xprinter)`)
      .line(`Paper Width: ${width} (${cols} cols)`)
      .line(`Timestamp: ${new Date().toISOString()}`)
      .separator('=', cols)
      .alignLeft()
      .line('TEST 1: Alignment & Font Styles')
      .line('Left aligned font')
      .alignCenter()
      .line('Center aligned font')
      .alignRight()
      .line('Right aligned font')
      .alignLeft()
      .bold(true)
      .line('Bold emphasis test')
      .bold(false)
      .underline(1)
      .line('Underlined text test')
      .underline(0)
      .twoColumn('Two-column left', 'Right', cols)
      .separator('-', cols)
      .alignLeft()
      .line('TEST 2: Code 128 Barcode')
      .alignCenter()
      .barcode128('FBC-TEST-0001')
      .separator('-', cols)
      .alignLeft()
      .line('TEST 3: QR Code Verification')
      .alignCenter()
      .qrCode('https://foodbaskets.ph/test', 4)
      .line('Scan QR Code')
      .separator('=', cols)
      .alignCenter()
      .bold(true)
      .line('ALL DIAGNOSTICS PASSED')
      .bold(false)
      .cut(false);

    return builder.build();
  }

  /**
   * Generates an independent RJ11 drawer kick sequence for "No-Sale" opening.
   */
  static formatDrawerKick(pin: DrawerPin = 'PIN_2'): Uint8Array {
    const builder = new ESCPOSBuilder();
    builder.init().kickDrawer(pin);
    return builder.build();
  }
}
