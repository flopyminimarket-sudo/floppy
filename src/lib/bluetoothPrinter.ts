/**
 * Utility for Printing (ESC/POS)
 * Handles connection, ESC/POS formatting, QR codes, via Bluetooth or USB.
 */

export class ESCPOSPrinter {
  device: any = null;
  characteristic: any = null;
  usbEndpoint: any = null;
  connectionType: 'bluetooth' | 'usb' | null = null;

  async connectBluetooth() {
    const nav = navigator as any;
    if (!nav.bluetooth) {
      throw new Error('Web Bluetooth no está soportado en este navegador.');
    }

    try {
      this.device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Standard BLE Printer Service
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Alternative Printer Service
          '0000fee7-0000-1000-8000-00805f9b34fb'  // Another common service
        ]
      });

      const server = await this.device.gatt.connect();
      const services = await server.getPrimaryServices();
      
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            this.characteristic = char;
            this.connectionType = 'bluetooth';
            
            this.device.addEventListener('gattserverdisconnected', () => {
              this.disconnect();
            });
            
            return true;
          }
        }
      }
      throw new Error('No se encontró una característica de escritura en la impresora Bluetooth.');
    } catch (error) {
      this.disconnect();
      throw error;
    }
  }

  async connectUSB() {
    const nav = navigator as any;
    if (!nav.usb) {
      throw new Error('Web USB no está soportado en este navegador. Utiliza Chrome o Edge.');
    }

    try {
      // Prompt user to select ANY USB device (or filter by classCode 7 for printers)
      this.device = await nav.usb.requestDevice({ filters: [] });
      
      await this.device.open();
      
      // Select configuration if needed
      if (this.device.configuration === null) {
        await this.device.selectConfiguration(1);
      }
      
      // Find printer interface and out endpoint
      let interfaceNumber = null;
      let endpoint = null;
      
      for (const iface of this.device.configuration.interfaces) {
        const alt = iface.alternate;
        const outEndpoint = alt.endpoints.find((e: any) => e.direction === 'out');
        if (outEndpoint) {
          interfaceNumber = iface.interfaceNumber;
          endpoint = outEndpoint;
          break; // Use the first writable endpoint found
        }
      }

      if (interfaceNumber === null || !endpoint) {
        throw new Error('No se encontraron puertos de escritura en este dispositivo USB.');
      }

      // Claim the interface
      try {
        await this.device.claimInterface(interfaceNumber);
      } catch (err: any) {
        throw new Error('No se pudo acceder a la impresora. Si estás en Windows, puede que necesites instalar el driver WinUSB (Zadig) o cerrar otras aplicaciones que la estén usando.');
      }

      this.usbEndpoint = endpoint;
      this.connectionType = 'usb';
      return true;

    } catch (error) {
      this.disconnect();
      throw error;
    }
  }

  disconnect() {
    if (this.connectionType === 'bluetooth' && this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    } else if (this.connectionType === 'usb' && this.device?.opened) {
      this.device.close();
    }
    this.device = null;
    this.characteristic = null;
    this.usbEndpoint = null;
    this.connectionType = null;
  }

  isConnected() {
    return this.connectionType !== null && this.device !== null;
  }

  async print(sale: any, businessInfo: any) {
    if (!this.isConnected()) {
      throw new Error('Impresora no conectada');
    }

    const buffer: number[] = [];
    const encoder = new TextEncoder();

    const addText = (text: string) => {
      // Normalize to remove accents as basic thermal printers often struggle with UTF-8 out of the box
      const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      buffer.push(...Array.from(encoder.encode(normalized)));
    };

    const addCmd = (cmd: number[]) => buffer.push(...cmd);

    // --- ESC/POS Formatting ---
    
    // Initialize printer
    addCmd([0x1B, 0x40]);
    // Set charset PC437
    addCmd([0x1B, 0x74, 0x00]);

    // Header (Center, Bold)
    addCmd([0x1B, 0x61, 0x01]); // Align Center
    addCmd([0x1B, 0x45, 0x01]); // Bold On
    addCmd([0x1D, 0x21, 0x11]); // Double height & width for title
    addText(`${businessInfo.name}\n`);
    addCmd([0x1D, 0x21, 0x00]); // Normal size
    addCmd([0x1B, 0x45, 0x00]); // Bold Off
    addText(`${businessInfo.address}\n`);
    addText(`Tel: ${businessInfo.phone}\n`);
    addText('------------------------------------------\n');
    
    // Sale Info (Left)
    addCmd([0x1B, 0x61, 0x00]); // Align Left
    addText(`Fecha: ${new Date(sale.date).toLocaleString('es-CL')}\n`);
    addText(`Ticket: ${sale.id}\n`);
    addText(`Cajero: ${sale.cashierName?.toUpperCase() || sale.cashierId}\n`);
    addText(`Pago: ${sale.paymentMethod.toUpperCase()}\n`);
    addText('------------------------------------------\n');
    
    // Items
    let subtotal = 0;
    addCmd([0x1B, 0x45, 0x01]); // Bold On
    addText(`CANT  DESCRIPCION          TOTAL\n`);
    addCmd([0x1B, 0x45, 0x00]); // Bold Off
    addText('------------------------------------------\n');

    sale.items.forEach((item: any) => {
      const originalPrice = item.price;
      const currentPrice = item.offerPrice || item.price;
      const discount = originalPrice - currentPrice;
      
      subtotal += originalPrice * item.quantity;

      // Item Name
      addText(`${item.name.substring(0, 42)}\n`);
      
      // Item Notes (if any)
      if (item.notes) {
        addText(`  >> NOTA: ${item.notes}\n`);
      }
      
      // Details: Qty x Price
      const qtyStr = item.saleType === 'weight' ? item.quantity.toFixed(3) : item.quantity.toString();
      const priceStr = new Intl.NumberFormat('es-CL').format(originalPrice);
      const lineTotal = new Intl.NumberFormat('es-CL').format(Math.round(originalPrice * item.quantity));
      
      addText(`${qtyStr.padEnd(5)}x $${priceStr.padEnd(8)}              $${lineTotal.padStart(8)}\n`);
      
      // Discount if any
      if (discount > 0) {
        const discTotal = new Intl.NumberFormat('es-CL').format(Math.round(discount * item.quantity));
        addText(`      Ahorro: -$${new Intl.NumberFormat('es-CL').format(Math.round(discount))} (-$${discTotal})\n`);
      }
    });
    
    addText('------------------------------------------\n');
    
    // Subtotal and Total
    addCmd([0x1B, 0x61, 0x02]); // Align Right
    addText(`SUBTOTAL: $${new Intl.NumberFormat('es-CL').format(Math.round(subtotal))}\n`);
    
    // Total (Center, Double Size)
    addCmd([0x1B, 0x61, 0x01]); // Align Center
    addCmd([0x1B, 0x45, 0x01]); // Bold On
    addCmd([0x1D, 0x21, 0x11]); // Double height & width
    addText(`TOTAL: $${new Intl.NumberFormat('es-CL').format(Math.round(sale.total))}\n`);
    addCmd([0x1D, 0x21, 0x00]); // Normal size
    addCmd([0x1B, 0x45, 0x00]); // Bold Off
    addText('------------------------------------------\n');
    
    // Customer Name (if present)
    if (sale.customerName) {
      addCmd([0x1B, 0x61, 0x01]); // Align Center
      addCmd([0x1B, 0x45, 0x01]); // Bold On
      addCmd([0x1D, 0x21, 0x11]); // Double height & width
      addText(`CLIENTE: ${sale.customerName.toUpperCase()}\n`);
      addCmd([0x1D, 0x21, 0x00]); // Normal size
      addCmd([0x1B, 0x45, 0x00]); // Bold Off
      addText('------------------------------------------\n');
    }

    
    // QR Code Generation
    const qrData = `Ticket:${sale.id}|Total:${sale.total}|Fecha:${sale.date}`;
    const qrBytes = Array.from(encoder.encode(qrData));
    const pL = (qrBytes.length + 3) % 256;
    const pH = Math.floor((qrBytes.length + 3) / 256);

    addCmd([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]); // Select model 2
    addCmd([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06]);       // Set size to 6
    addCmd([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30]);       // Error correction L
    addCmd([0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30, ...qrBytes]); // Store data
    addCmd([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]);       // Print QR

    addText('\nGracias por su compra!\n\n\n\n\n');
    
    // Cut paper (Partial cut: 1D 56 42 00, Full cut: 1D 56 41 03)
    addCmd([0x1D, 0x56, 0x42, 0x00]);

    // Send payload based on connection type
    if (this.connectionType === 'usb') {
      const data = new Uint8Array(buffer);
      await this.device.transferOut(this.usbEndpoint.endpointNumber, data);
    } else if (this.connectionType === 'bluetooth') {
      const CHUNK_SIZE = 64; 
      for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
        const chunk = new Uint8Array(buffer.slice(i, i + CHUNK_SIZE));
        if (this.characteristic.properties.writeWithoutResponse) {
          await this.characteristic.writeValueWithoutResponse(chunk);
        } else {
          await this.characteristic.writeValue(chunk);
        }
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }
    
    return true;
  }
}

export const printer = new ESCPOSPrinter();
