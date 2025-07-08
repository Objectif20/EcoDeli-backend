import * as PDFDocument from 'pdfkit';
import type { BillingData, InvoiceDetails, ShipmentDetails } from './type';

export class PdfService {
  private readonly colors = {
    primary: '#4a7c59',
    secondary: '#e8f5e8',
    accent: '#b8d4c1',
    background: '#f7f5f0',
    foreground: '#2d1f1a',
    muted: '#e8e3d8',
    mutedForeground: '#5a4a3a',
    border: '#d4c4b0',
    success: '#4a7c59',
    warning: '#f59e0b',
    error: '#dc2626',
  };

  private addModernHeader(doc: PDFDocument.PDFDocument, title: string, subtitle?: string): void {
    doc.rect(0, 0, doc.page.width, 120).fillColor(this.colors.primary).fill();

    doc.fontSize(28).font('Helvetica-Bold').fillColor('white').text('EcoDeli', 50, 35);

    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('white')
      .text('Transport éco-responsable', 50, 70)
      .opacity(0.9);

    doc
      .fontSize(9)
      .fillColor('white')
      .text('242 Rue du Faubourg Saint-Antoine, 75012 Paris', 50, 90)
      .text('contact.ecodeli@gmail.com • (+33) 12 34 56 78 90', 50, 105)
      .opacity(1);

    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('white')
      .text(title, 0, 40, {
        align: 'right',
        width: doc.page.width - 50,
      });

    if (subtitle) {
      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('white')
        .text(subtitle, 0, 70, {
          align: 'right',
          width: doc.page.width - 50,
        });
    }
  }

  private addModernFooter(doc: PDFDocument.PDFDocument): void {
    const pageHeight = doc.page.height;

    doc
      .rect(50, pageHeight - 100, doc.page.width - 100, 1)
      .fillColor(this.colors.border)
      .fill();

    doc
      .rect(0, pageHeight - 80, doc.page.width, 80)
      .fillColor(this.colors.background)
      .fill();

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(this.colors.primary)
      .text('Merci pour votre confiance !', 50, pageHeight - 65);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(this.colors.mutedForeground)
      .text('Cette facture a été générée automatiquement par EcoDeli.', 50, pageHeight - 20)
      .text('Pour toute question, contactez-nous à contact.ecodeli@gmail.com', 50, pageHeight - 25);
  }

  private createInfoCard(
    doc: PDFDocument.PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
  ): void {
    doc
      .rect(x + 2, y + 2, width, height)
      .fillColor('#00000010')
      .fill();

    doc
      .rect(x, y, width, height)
      .fillColor('white')
      .fill()
      .rect(x, y, width, height)
      .strokeColor(this.colors.border)
      .lineWidth(1)
      .stroke();

    doc.rect(x, y, width, 30).fillColor(this.colors.secondary).fill();

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(this.colors.primary)
      .text(title, x + 15, y + 10);
  }

  async generateBordereauPdf(data: ShipmentDetails): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A5',
        layout: 'landscape',
        margin: 20,
      });

      const buffers: Uint8Array[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      doc.rect(0, 0, doc.page.width, doc.page.height).fillColor(this.colors.background).fill();

      doc.rect(0, 0, doc.page.width, 80).fillColor(this.colors.primary).fill();

      doc.fontSize(18).font('Helvetica-Bold').fillColor('white').text('EcoDeli', 30, 25);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('white')
        .text('BORDEREAU DE LIVRAISON', 0, 30, {
          align: 'right',
          width: doc.page.width - 30,
        });

      const mainY = 100;

      this.createInfoCard(doc, 30, mainY, 250, 120, 'INFORMATIONS LIVRAISON');

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text('Code Livraison:', 45, mainY + 45)
        .font('Helvetica')
        .fillColor(this.colors.primary)
        .text(`#${data.deliveryCode}`, 45, mainY + 60);

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text('Trajet:', 150, mainY + 45)
        .font('Helvetica')
        .text(`${data.departureCity} → ${data.arrivalCity}`, 150, mainY + 60);

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text('Poids:', 150, mainY + 80)
        .font('Helvetica')
        .text(`${data.totalWeight} kg`, 150, mainY + 95);

      this.createInfoCard(doc, 300, mainY, 150, 120, 'SCAN LIVREUR');

      if (data.qrCodeBase64) {
        doc.image(data.qrCodeBase64, 320, mainY + 45, {
          width: 110,
          height: 60,
        });
      }

      const instructY = mainY + 140;
      doc
        .rect(30, instructY, 420, 60)
        .fillColor('white')
        .fill()
        .strokeColor(this.colors.border)
        .stroke();

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(this.colors.primary)
        .text('INSTRUCTIONS DE LIVRAISON', 45, instructY + 15);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.mutedForeground)
        .text("Merci de suivre les instructions indiquées par l'expéditeur.", 45, instructY + 35)
        .text('Contactez EcoDeli en cas de problème lors de la livraison.', 45, instructY + 50);

      doc.end();
    });
  }

  async generateInvoicePdf(data: InvoiceDetails): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Uint8Array[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      this.addModernHeader(doc, 'FACTURE', `N° ${data.invoiceNumber}`);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('white')
        .text(`Date: ${data.invoiceDate}`, 0, 85, {
          align: 'right',
          width: doc.page.width - 50,
        })
        .text(`Livraison: ${data.deliveryId}`, 0, 100, {
          align: 'right',
          width: doc.page.width - 50,
        });

      let currentY = 150;

      this.createInfoCard(doc, 50, currentY, 240, 100, 'INFORMATIONS CLIENT');

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text(data.customerName, 70, currentY + 45);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.mutedForeground)
        .text(data.customerEmail, 70, currentY + 65);

      this.createInfoCard(doc, 310, currentY, 240, 100, 'DÉTAILS LIVRAISON');

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.foreground)
        .text(`Description: ${data.shipmentDescription}`, 330, currentY + 45, { width: 200 })
        .text(`${data.departureCity} → ${data.arrivalCity}`, 330, currentY + 65)
        .text(`Date prévue: ${data.deliveryDate}`, 330, currentY + 80);

      currentY += 120;

      this.createInfoCard(doc, 50, currentY, 240, 80, 'LIVREUR ASSIGNÉ');

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text(data.deliveryPersonName, 70, currentY + 45);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.mutedForeground)
        .text(`Tél: ${data.deliveryPersonPhone}`, 70, currentY + 65);

      currentY += 100;

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(this.colors.primary)
        .text('DÉTAIL FINANCIER', 50, currentY);

      currentY += 30;

      doc.rect(50, currentY, 500, 35).fillColor(this.colors.primary).fill();

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('white')
        .text('Description', 70, currentY + 12)
        .text('Montant', 450, currentY + 12, { align: 'right' });

      currentY += 35;

      data.lineItems.forEach((item, index) => {
        const bgColor = index % 2 === 0 ? 'white' : this.colors.background;

        doc.rect(50, currentY, 500, 30).fillColor(bgColor).fill();

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(this.colors.foreground)
          .text(item.label, 70, currentY + 10)
          .text(item.value, 450, currentY + 10, { align: 'right' });

        currentY += 30;
      });

      doc
        .rect(50, currentY + 10, 500, 40)
        .fillColor(this.colors.success)
        .fill();

      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('white')
        .text('TOTAL À PAYER', 70, currentY + 22)
        .text(`${data.totalAmount.toFixed(2)} €`, 450, currentY + 22, { align: 'right' });

      if (!data.isMainStep) {
        currentY += 70;
        doc
          .rect(50, currentY, 500, 50)
          .fillColor('#fff3cd')
          .fill()
          .strokeColor(this.colors.warning)
          .stroke();

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor(this.colors.warning)
          .text('⚠ ÉTAPE INTERMÉDIAIRE', 70, currentY + 15);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(this.colors.foreground)
          .text(
            'Cette livraison correspond à une étape intermédiaire. Seuls les frais de base sont appliqués.',
            70,
            currentY + 35,
            { width: 460 },
          );
      }

      this.addModernFooter(doc);
      doc.end();
    });
  }

  async generateTransferInvoicePdf(data: {
    transferId: string;
    transferDate: string;
    amount: number;
    recipientName: string;
    recipientFirstName: string;
    description: string;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Uint8Array[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      this.addModernHeader(doc, 'FACTURE DE VIREMENT', `N° ${data.transferId}`);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('white')
        .text(`Date: ${data.transferDate}`, 0, 85, {
          align: 'right',
          width: doc.page.width - 50,
        });

      let currentY = 150;

      this.createInfoCard(doc, 50, currentY, 500, 120, 'INFORMATIONS DE VIREMENT');

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text('Montant du virement:', 70, currentY + 45);

      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .fillColor(this.colors.success)
        .text(`${this.formatPrice(data.amount)} €`, 70, currentY + 70);

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text('Bénéficiaire:', 350, currentY + 45);

      doc
        .fontSize(14)
        .font('Helvetica')
        .fillColor(this.colors.primary)
        .text(`${data.recipientFirstName} ${data.recipientName}`, 350, currentY + 70);

      currentY += 140;

      this.createInfoCard(doc, 50, currentY, 500, 100, 'DESCRIPTION');

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor(this.colors.foreground)
        .text(data.description, 70, currentY + 45, {
          width: 460,
          align: 'justify',
          lineGap: 5,
        });

      currentY += 120;

      doc.rect(50, currentY, 500, 60).fillColor(this.colors.success).fill();

      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('white')
        .text('MONTANT TOTAL VIRÉ', 70, currentY + 20)
        .text(`${this.formatPrice(data.amount)} €`, 450, currentY + 20, { align: 'right' });

      this.addModernFooter(doc);
      doc.end();
    });
  }

  async generateAppointmentInvoicePdf(data: {
    appointmentId: string;
    appointmentDate: string;
    appointmentTime: string;
    amount: number;
    serviceName: string;
    serviceDescription: string;
    providerName: string;
    providerEmail: string;
    clientName: string;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Uint8Array[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      this.addModernHeader(doc, 'FACTURE DE PRESTATION', `N° ${data.appointmentId}`);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('white')
        .text(`${data.appointmentDate} à ${data.appointmentTime}`, 0, 85, {
          align: 'right',
          width: doc.page.width - 50,
        });

      let currentY = 150;

      this.createInfoCard(doc, 50, currentY, 500, 80, 'DÉTAILS DU RENDEZ-VOUS');

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text('Date et heure:', 70, currentY + 45);

      doc
        .fontSize(14)
        .font('Helvetica')
        .fillColor(this.colors.primary)
        .text(`${data.appointmentDate} à ${data.appointmentTime}`, 70, currentY + 65);

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text('Montant:', 350, currentY + 45);

      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor(this.colors.success)
        .text(`${this.formatPrice(data.amount)} €`, 350, currentY + 65);

      currentY += 100;

      this.createInfoCard(doc, 50, currentY, 500, 100, 'SERVICE');

      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor(this.colors.primary)
        .text(data.serviceName, 70, currentY + 45);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.mutedForeground)
        .text(data.serviceDescription, 70, currentY + 70, { width: 460, lineGap: 3 });

      currentY += 120;

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(this.colors.primary)
        .text('INTERVENANTS', 50, currentY);

      currentY += 30;

      this.createInfoCard(doc, 50, currentY, 240, 80, 'PRESTATAIRE');

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text(data.providerName, 70, currentY + 45);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.mutedForeground)
        .text(data.providerEmail, 70, currentY + 65);

      this.createInfoCard(doc, 310, currentY, 240, 80, 'CLIENT');

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text(data.clientName, 330, currentY + 45);

      currentY += 100;

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(this.colors.primary)
        .text('RÉCAPITULATIF FINANCIER', 50, currentY);

      currentY += 30;

      const totalTTC = Number.parseFloat(data.amount.toString());
      const baseHT = totalTTC / 1.2;
      const tvaAmount = totalTTC - baseHT;

      doc.rect(50, currentY, 500, 25).fillColor(this.colors.secondary).fill();

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.foreground)
        .text('Base HT:', 70, currentY + 8)
        .text(`${this.formatPrice(baseHT)} €`, 450, currentY + 8, { align: 'right' });

      currentY += 25;

      doc.rect(50, currentY, 500, 25).fillColor('white').fill();

      doc
        .text('TVA (20%):', 70, currentY + 8)
        .text(`${this.formatPrice(tvaAmount)} €`, 450, currentY + 8, { align: 'right' });

      currentY += 25;

      doc.rect(50, currentY, 500, 35).fillColor(this.colors.success).fill();

      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('white')
        .text('TOTAL TTC', 70, currentY + 10)
        .text(`${this.formatPrice(totalTTC)} €`, 450, currentY + 10, { align: 'right' });

      this.addModernFooter(doc);
      doc.end();
    });
  }

  async generateBilling(invoiceData: BillingData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        this.addModernHeader(doc, 'FACTURE', `N° ${invoiceData.invoiceNumber}`);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('white')
          .text(`Date: ${invoiceData.invoiceDate.toLocaleDateString('fr-FR')}`, 0, 85, {
            align: 'right',
            width: doc.page.width - 50,
          });

        let currentY = 150;

        this.createInfoCard(doc, 50, currentY, 240, 100, 'FACTURÉ À');

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor(this.colors.foreground)
          .text(invoiceData.customer.name, 70, currentY + 45);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(this.colors.mutedForeground)
          .text(invoiceData.customer.email, 70, currentY + 65)
          .text(invoiceData.customer.address, 70, currentY + 80);

        this.createInfoCard(doc, 310, currentY, 240, 100, 'DÉTAILS ABONNEMENT');

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(this.colors.foreground)
          .text(`Période: ${invoiceData.periodLabel}`, 330, currentY + 45)
          .text(`Plan: ${invoiceData.plan.name}`, 330, currentY + 65)
          .text(`ID: ${invoiceData.subscription.id.slice(-8)}`, 330, currentY + 80);

        currentY += 120;

        // Tableau des services
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text('DÉTAIL DES SERVICES', 50, currentY);

        currentY += 30;

        // En-tête tableau
        doc.rect(50, currentY, 500, 30).fillColor(this.colors.primary).fill();

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('white')
          .text('Description', 70, currentY + 10)
          .text('Période', 250, currentY + 10)
          .text('Prix', 450, currentY + 10, { align: 'right' });

        currentY += 30;

        // Ligne service
        doc.rect(50, currentY, 500, 30).fillColor('white').fill();

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(this.colors.foreground)
          .text(invoiceData.plan.description, 70, currentY + 10)
          .text(invoiceData.periodLabel, 250, currentY + 10)
          .text(`${this.formatPrice(invoiceData.plan.price)} €`, 450, currentY + 10, {
            align: 'right',
          });

        currentY += 50;

        // Calculs financiers
        const totalTTC = this.ensureNumericPrice(invoiceData.plan.price);
        const baseHT = totalTTC / 1.2;
        const tvaAmount = totalTTC - baseHT;

        // Sous-totaux
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(this.colors.foreground)
          .text('Prix HT:', 400, currentY)
          .text(`${this.formatPrice(baseHT)} €`, 480, currentY, { align: 'right' });

        doc
          .text('TVA (20%):', 400, currentY + 20)
          .text(`${this.formatPrice(tvaAmount)} €`, 480, currentY + 20, { align: 'right' });

        currentY += 50;

        doc.rect(400, currentY, 150, 35).fillColor(this.colors.success).fill();

        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor('white')
          .text('Total TTC:', 420, currentY + 10)
          .text(`${this.formatPrice(totalTTC)} €`, 530, currentY + 10, { align: 'right' });

        this.addModernFooter(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private ensureNumericPrice(price: any): number {
    const numericPrice = Number.parseFloat(price);
    return isNaN(numericPrice) ? 0 : numericPrice;
  }

  private formatPrice(price: any): string {
    const numericPrice = this.ensureNumericPrice(price);
    return numericPrice.toFixed(2);
  }
}
