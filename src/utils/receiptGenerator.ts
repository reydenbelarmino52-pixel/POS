import { jsPDF } from 'jspdf';

export interface Order {
  id: string;
  cashierName: string;
  total: number;
  paymentMethod: string;
  timestamp: string;
  started_at: string;
  tax: number;
  discount: number;
  items?: any[];
  amountReceived?: number;
  changeAmount?: number;
}

/**
 * Generates and downloads a standardized POS Receipt PDF
 * tailored for 58mm or 80mm thermal receipt printers.
 * 
 * It forces correct page dimensions based on content volume,
 * preventing excess blank feed and ensuring a clean print job.
 */
export const exportReceiptPDF = (order: Order, paperWidth: 58 | 80 = 80) => {
  const items = order.items || (order as any).sale_items || [];
  const lineSpacing = 4.2; // vertical spacing in mm
  
  // Dynamic Height Calculation:
  // - Top margins: ~6mm
  // - Header (Store title, metadata, borders): ~35mm
  // - Metadata rows (Order info, cashier, timestamp): ~20mm
  // - Item rows: items.length * lineSpacing * factor (with potential description wrapping)
  // - Totals block (Subtotal, tax, discount, grand total): ~28mm
  // - Payment breakdown (Paid, Change): ~18mm
  // - Footer (Thank you greeting): ~20mm
  const itemHeightFactor = paperWidth === 58 ? 7.5 : 5.5; 
  const approxHeight = 6 + 35 + 20 + (items.length * itemHeightFactor) + 28 + 18 + 20;
  
  // Set minimum height to fit nicely
  const paperHeight = Math.max(approxHeight, 110);

  // Instantiating jsPDF with actual mm dimensions
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [paperWidth, paperHeight]
  });

  // Basic setup
  doc.setFont('courier', 'normal');
  doc.setCharSpace(0.08);

  let y = 6; // current y coordinate cursor in mm

  // Helper: Print a center-aligned text row
  const printCentered = (text: string, style: 'normal' | 'bold' | 'italic' = 'normal', size = 8) => {
    doc.setFont('courier', style);
    doc.setFontSize(size);
    doc.text(text, paperWidth / 2, y, { align: 'center' });
    y += lineSpacing;
  };

  // Helper: Print a two-column row (e.g. key/value pairing)
  const printRow = (leftText: string, rightText: string, style: 'normal' | 'bold' = 'normal', size = 7) => {
    doc.setFont('courier', style);
    doc.setFontSize(size);
    doc.text(leftText, 4, y);
    doc.text(rightText, paperWidth - 4, y, { align: 'right' });
    y += lineSpacing;
  };

  // Helper: Print standard dash-filled divider line
  const printDivider = (char = '-') => {
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    // Standard char counts for perfect borders
    const cols = paperWidth === 58 ? 32 : 46;
    doc.text(char.repeat(cols), paperWidth / 2, y, { align: 'center' });
    y += lineSpacing;
  };

  // --- RECEIPT RENDER ---

  // 1. Header Section
  printCentered('CATH TEA & COFFEE', 'bold', 12);
  printCentered('OPERATIONAL HUB', 'normal', 7.5);
  printCentered('SYSTEM ACTIVE • CONNECTION SECURED', 'italic', 5.5);
  y += 1.5;
  printDivider('=');

  // Metadata block
  const formattedDate = order.timestamp 
    ? new Date(order.timestamp).toLocaleString('en-US', { hour12: true }) 
    : 'N/A';

  printRow('DATE & TIME:', formattedDate, 'normal', 6.5);
  printRow('CASHIER:', (order.cashierName || (order as any).cashier_name || 'SYSTEMADMIN').toUpperCase(), 'normal', 6.5);
  printRow('ORDER ID:', `#${order.id || 'N/A'}`, 'normal', 6);
  printDivider('-');

  // 2. Items List Header
  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.text('ITEM DESCRIPTION', 4, y);
  doc.text('QTY', paperWidth - 19, y, { align: 'right' });
  doc.text('AMT', paperWidth - 4, y, { align: 'right' });
  y += lineSpacing;
  printDivider('-');

  // 3. Render Order Items
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  
  items.forEach((item: any) => {
    // Highly robust fallback list to make sure name is always captured
    const rawProd = item.products || item.product;
    const productName = Array.isArray(rawProd) ? rawProd[0]?.name : rawProd?.name;
    const name = (item.name || productName || 'Unknown Product').toUpperCase();
    
    const qty = String(item.quantity || item.qty || 1);
    const price = Number(item.priceAtSale) || Number(item.price_at_sale) || Number(item.price) || 0;
    const itemTotal = `P${(price * Number(qty)).toFixed(2)}`;
    
    // Line wrapping configuration for long item names
    const maxTextWidth = paperWidth - 26; // dynamic margin
    const itemLabel = `${qty}x ${name}`;
    const splitLines = doc.splitTextToSize(itemLabel, maxTextWidth);

    splitLines.forEach((line: string, idx: number) => {
      if (idx === 0) {
        doc.text(line, 4, y);
        // Print qty and total side-by-side with the first description line
        doc.setFont('courier', 'bold');
        doc.text(qty, paperWidth - 19, y, { align: 'right' });
        doc.text(itemTotal, paperWidth - 4, y, { align: 'right' });
        doc.setFont('courier', 'normal');
      } else {
        doc.text(line, 6, y); // indent wrapped lines
      }
      y += lineSpacing;
    });
  });

  printDivider('-');

  // 4. Calculations / Totals Section
  const subtotal = (Number(order.total) || 0) + (Number(order.discount) || 0);
  printRow('SUBTOTAL:', `P${subtotal.toFixed(2)}`, 'normal', 7);
  
  if (Number(order.discount) > 0) {
    printRow('DISCOUNT:', `-P${(Number(order.discount) || 0).toFixed(2)}`, 'normal', 7);
  }
  
  printDivider('-');
  printRow('TOTAL COMPLETED:', `P${(Number(order.total) || 0).toFixed(2)}`, 'bold', 8.5);
  printDivider('-');

  // 5. Cash Received & Change Amount
  const paid = Number(order.amountReceived) || Number((order as any).amount_received) || Number(order.total) || 0;
  const change = Number(order.changeAmount) || Number((order as any).change_amount) || 0;
  const method = String(order.paymentMethod || (order as any).payment_method || 'cash').toUpperCase();
  printRow('METHOD:', method, 'bold', 7);
  printRow('PAID:', `P${paid.toFixed(2)}`, 'normal', 7);
  printRow('CHANGE:', `P${change.toFixed(2)}`, 'normal', 7);
  printDivider('=');

  // 6. Thermal Footer Message
  y += 2.5;
  printCentered('THANK YOU FOR YOUR PATRONAGE!', 'bold', 7);
  printCentered('PLEASE VISIT CATH TEA & COFFEE AGAIN', 'normal', 6.5);
  printCentered('--- END OF RECEIPT ---', 'italic', 5.5);

  // Trigger automatic download
  const safeId = order.id ? order.id.slice(0, 8).toUpperCase() : 'POS';
  doc.save(`cath_receipt_${safeId}.pdf`);
};
