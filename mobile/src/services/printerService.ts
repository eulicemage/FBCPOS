import { AppConfig } from '../config';

export interface PrintReceiptParams {
  branchName: string;
  branchAddress: string;
  taxId: string;
  invoiceNumber: string;
  cashierName: string;
  terminalNumber: string;
  shiftNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }>;
  subtotal: number;
  discountAmount: number;
  vatableAmount: number;
  vatAmount: number;
  totalDue: number;
  amountReceived: number;
  changeAmount: number;
  paymentMethod: string;
  date: string;
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
    this.buffer.push(0x1b, 0x45, enable ? 0x01 : 0x00);
    return this;
  }

  doubleSize(enable: boolean): this {
    this.buffer.push(0x1d, 0x21, enable ? 0x11 : 0x00);
    return this;
  }

  text(str: string): this {
    for (let i = 0; i < str.length; i++) {
      this.buffer.push(str.charCodeAt(i));
    }
    return this;
  }

  line(str: string = ''): this {
    this.text(str);
    this.buffer.push(0x0a); // LF
    return this;
  }

  kickDrawer(): this {
    this.buffer.push(0x1b, 0x70, 0x00, 0x19, 0xfa); // ESC p 0 25 250 (Pin 2 50ms pulse)
    return this;
  }

  cut(): this {
    this.buffer.push(0x0a, 0x0a, 0x0a);
    this.buffer.push(0x1d, 0x56, 0x41, 0x03); // GS V 65 3
    return this;
  }

  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

export class PrinterService {
  static formatReceipt(params: PrintReceiptParams): Uint8Array {
    const builder = new ESCPOSBuilder();

    builder
      .init()
      .kickDrawer()
      .alignCenter()
      .bold(true)
      .doubleSize(true)
      .line(AppConfig.receiptHeader.companyName)
      .doubleSize(false)
      .line(params.branchName)
      .bold(false)
      .line(params.branchAddress)
      .line(`VAT REG TIN: ${params.taxId}`)
      .line('================================================')
      .alignLeft()
      .line(`INVOICE:  ${params.invoiceNumber}`)
      .line(`DATE:     ${params.date}`)
      .line(`CASHIER:  ${params.cashierName}`)
      .line(`TERMINAL: ${params.terminalNumber}  SHIFT: ${params.shiftNumber}`)
      .line('------------------------------------------------')
      .line('ITEM                    QTY    PRICE    TOTAL')
      .line('------------------------------------------------');

    for (const item of params.items) {
      const name = item.name.padEnd(20, ' ').substring(0, 20);
      const qty = item.quantity.toString().padStart(4, ' ');
      const price = item.unitPrice.toFixed(2).padStart(8, ' ');
      const total = item.totalAmount.toFixed(2).padStart(10, ' ');
      builder.line(`${name} ${qty} ${price} ${total}`);
    }

    builder
      .line('------------------------------------------------')
      .alignRight()
      .line(`SUBTOTAL:     ${params.subtotal.toFixed(2).padStart(10, ' ')}`)
      .line(`DISCOUNT:    -${params.discountAmount.toFixed(2).padStart(10, ' ')}`)
      .line(`VATABLE (12%): ${params.vatableAmount.toFixed(2).padStart(10, ' ')}`)
      .line(`12% VAT:       ${params.vatAmount.toFixed(2).padStart(10, ' ')}`)
      .bold(true)
      .doubleSize(true)
      .line(`TOTAL DUE:   P${params.totalDue.toFixed(2)}`)
      .doubleSize(false)
      .bold(false)
      .line('================================================')
      .line(`TENDER (${params.paymentMethod}):  ${params.amountReceived.toFixed(2).padStart(10, ' ')}`)
      .line(`CHANGE:         ${params.changeAmount.toFixed(2).padStart(10, ' ')}`)
      .line('================================================')
      .alignCenter()
      .line('THANK YOU FOR SHOPPING WITH US!')
      .line('Please keep this receipt for returns.')
      .cut();

    return builder.build();
  }
}
