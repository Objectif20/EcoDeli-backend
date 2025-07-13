import * as PDFDocument from 'pdfkit';
import type { BillingData, InvoiceDetails, ShipmentDetails } from './type';

export class PdfService {
  private readonly colors = {
    primary: '#059669',
    primaryLight: '#10B981',
    primaryDark: '#047857',
    secondary: '#F0FDF4',
    accent: '#34D399',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    foreground: '#111827',
    muted: '#F3F4F6',
    mutedForeground: '#6B7280',
    border: '#E5E7EB',
    success: '#059669',
    warning: '#F59E0B',
    error: '#DC2626',
    info: '#3B82F6',
    gradient: {
      start: '#059669',
      end: '#065F46',
    },
  };

  private addGradientBackground(doc: PDFDocument.PDFDocument): void {
    doc.rect(0, 0, doc.page.width, doc.page.height).fillColor('#FAFAFA').fill();

    for (let i = 0; i < 100; i++) {
      const opacity = 0.02 - i * 0.0002;
      doc.rect(0, i, doc.page.width, 1).fillColor(this.colors.primary).opacity(opacity).fill();
    }
    doc.opacity(1);
  }

  private addModernHeader(doc: PDFDocument.PDFDocument, title: string, subtitle?: string): void {
    doc.rect(0, 0, doc.page.width, 140).fillColor(this.colors.gradient.start).fill();

    doc.rect(0, 0, doc.page.width, 140).fillColor(this.colors.gradient.end).opacity(0.1).fill();

    doc.opacity(1);

    doc.fontSize(32).font('Helvetica-Bold').fillColor('#FFFFFF').text('EcoDeli', 50, 30);

    doc
      .fontSize(13)
      .font('Helvetica')
      .fillColor('#FFFFFF')
      .opacity(0.9)
      .text('Transport éco-responsable • Livraison durable', 50, 75);

    doc
      .fontSize(10)
      .opacity(0.8)
      .text('242 Rue du Faubourg Saint-Antoine, 75012 Paris', 50, 95)
      .text('contact.ecodeli@gmail.com • (+33) 12 34 56 78 90', 50, 110);

    doc.opacity(1);

    doc
      .fontSize(28)
      .font('Helvetica-Bold')
      .fillColor('#FFFFFF')
      .text(title, 0, 35, {
        align: 'right',
        width: doc.page.width - 50,
      });

    doc.opacity(1);
  }

  private addModernFooter(doc: PDFDocument.PDFDocument): void {
    const pageHeight = doc.page.height;

    doc
      .rect(50, pageHeight - 120, doc.page.width - 100, 2)
      .fillColor(this.colors.primary)
      .fill();

    doc
      .rect(0, pageHeight - 100, doc.page.width, 100)
      .fillColor(this.colors.secondary)
      .fill();

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(this.colors.primary)
      .text('Merci pour votre confiance !', 50, pageHeight - 80);
  }

  private createModernCard(
    doc: PDFDocument.PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    color: string = this.colors.primary,
  ): void {
    doc
      .rect(x + 3, y + 3, width, height)
      .fillColor('#ffffff')
      .opacity(1)
      .fill();

    doc.rect(x, y, width, height).fillColor(this.colors.surface).fill();

    doc.rect(x, y, width, height).strokeColor(this.colors.border).lineWidth(0.5).stroke();

    doc.rect(x, y, width, 40).fillColor(color).fill();

    doc.rect(x, y, width, 4).fillColor(this.colors.accent).fill();

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text(title, x + 20, y + 14);

    doc.opacity(1);
  }

  private addDecorationLine(
    doc: PDFDocument.PDFDocument,
    x: number,
    y: number,
    width: number,
  ): void {
    doc.rect(x, y, width, 2).fillColor(this.colors.primary).fill();

    doc
      .rect(x, y + 2, width, 1)
      .fillColor(this.colors.accent)
      .opacity(0.3)
      .fill();

    doc.opacity(1);
  }

  private addHeader(doc: PDFDocument): number {
    const headerHeight = 80;

    doc.rect(0, 0, doc.page.width, headerHeight).fillColor(this.colors.primary).fill();

    doc.fontSize(28).font('Helvetica-Bold').fillColor('#FFFFFF').text('EcoDeli', 30, 20);

    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#FFFFFF')
      .text('BORDEREAU DE LIVRAISON', 0, 25, {
        align: 'right',
        width: doc.page.width - 30,
      });

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#FFFFFF')
      .opacity(0.9)
      .text('Transport éco-responsable', 0, 45, {
        align: 'right',
        width: doc.page.width - 30,
      });

    doc.opacity(1);
    return headerHeight;
  }

  private createCard(
    doc: PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    color: string = this.colors.primary,
  ): void {
    doc
      .rect(x + 2, y + 2, width, height)
      .fillColor('#ffffff')
      .opacity(1)
      .fill();

    doc.rect(x, y, width, height).fillColor(this.colors.surface).fill();

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text(title, x + 15, y + 12);

    doc.opacity(1);
  }

  private addFooter(doc: PDFDocument): void {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 80;

    doc
      .rect(30, footerY - 10, doc.page.width - 60, 2)
      .fillColor(this.colors.primary)
      .fill();

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(this.colors.primary)
      .text('Merci pour votre confiance !', 0, footerY + 10, {
        align: 'center',
        width: doc.page.width,
      });

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(this.colors.mutedForeground)
      .text(
        '242 Rue du Faubourg Saint-Antoine, 75012 Paris • contact.ecodeli@gmail.com • (+33) 12 34 56 78 90',
        0,
        footerY + 30,
        {
          align: 'center',
          width: doc.page.width,
        },
      );
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

      this.addGradientBackground(doc);

      const headerHeight = this.addHeader(doc);
      let currentY = headerHeight + 20;

      const cardMargin = 20;
      const availableWidth = doc.page.width - cardMargin * 2;
      const leftCardWidth = availableWidth * 0.6;
      const rightCardWidth = availableWidth * 0.35;
      const cardHeight = 100;

      this.createCard(doc, cardMargin, currentY, leftCardWidth, cardHeight, 'Détails de Livraison');

      const contentStartY = currentY + 45;
      const leftColumnX = cardMargin + 15;
      const rightColumnX = cardMargin + leftCardWidth * 0.5;

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text('Code Livraison:', leftColumnX, contentStartY);

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(this.colors.primary)
        .text(`#${data.deliveryCode}`, leftColumnX, contentStartY + 15);

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text('Trajet:', leftColumnX, contentStartY + 40);

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor(this.colors.primary)
        .text(`${data.departureCity} -> ${data.arrivalCity}`, leftColumnX, contentStartY + 55);

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text('Poids:', rightColumnX, contentStartY);

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(this.colors.success)
        .text(`${data.totalWeight} kg`, rightColumnX, contentStartY + 15);

      const qrCardX = cardMargin + leftCardWidth + 15;
      this.createCard(
        doc,
        qrCardX,
        currentY,
        rightCardWidth,
        cardHeight,
        'QR CODE',
        this.colors.foreground,
      );

      if (data.qrCodeBase64) {
        const qrSize = 60;
        const qrX = qrCardX + (rightCardWidth - qrSize) / 2;
        const qrY = currentY + 45;

        try {
          doc.image(data.qrCodeBase64, qrX, qrY, {
            width: qrSize,
            height: qrSize,
          });
        } catch (error) {
          doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor(this.colors.mutedForeground)
            .text('QR Code\nindisponible', qrX, qrY + 20, {
              align: 'center',
              width: qrSize,
            });
        }
      }

      currentY += cardHeight + 20;

      const instructionCardHeight = 70;
      this.createCard(
        doc,
        cardMargin,
        currentY,
        availableWidth,
        instructionCardHeight,
        'Instructions de Livraison',
        this.colors.foreground,
      );

      const instructionY = currentY + 45;
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.foreground)
        .text(
          "• Merci de suivre attentivement les consignes transmises par l'expéditeur.",
          cardMargin + 15,
          instructionY,
        );

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.foreground)
        .text(
          '• Contactez EcoDeli en cas de problème pendant le transport.',
          cardMargin + 15,
          instructionY + 15,
        );

      this.addFooter(doc);

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

      this.addGradientBackground(doc);
      this.addModernHeader(doc, 'FACTURE', `N° ${data.invoiceNumber}`);

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#FFFFFF')
        .text(`Date: ${data.invoiceDate}`, 0, 85, {
          align: 'right',
          width: doc.page.width - 50,
        })
        .text(`Livraison: ${data.deliveryId}`, 0, 100, {
          align: 'right',
          width: doc.page.width - 50,
        });

      let currentY = 170;

      this.createModernCard(doc, 50, currentY, 240, 110, 'INFORMATIONS CLIENT');

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text(data.customerName, 70, currentY + 55);

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor(this.colors.mutedForeground)
        .text(`📧 ${data.customerEmail}`, 70, currentY + 75);

      this.createModernCard(doc, 310, currentY, 240, 110, '📦 DÉTAILS LIVRAISON');

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.foreground)
        .text(`Description: ${data.shipmentDescription}`, 330, currentY + 55, { width: 200 })
        .text(`🗺️ ${data.departureCity} → ${data.arrivalCity}`, 330, currentY + 75)
        .text(`📅 Date prévue: ${data.deliveryDate}`, 330, currentY + 90);

      currentY += 130;

      // Carte livreur
      this.createModernCard(doc, 50, currentY, 240, 90, '🚚 LIVREUR ASSIGNÉ');

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text(data.deliveryPersonName, 70, currentY + 55);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.mutedForeground)
        .text(`📞 ${data.deliveryPersonPhone}`, 70, currentY + 75);

      currentY += 110;

      // Section financière moderne
      this.addDecorationLine(doc, 50, currentY, 500);

      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor(this.colors.primary)
        .text('💰 DÉTAIL FINANCIER', 50, currentY + 10);

      currentY += 40;

      // Header tableau avec gradient
      doc.rect(50, currentY, 500, 40).fillColor(this.colors.primary).fill();

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#FFFFFF')
        .text('Description', 70, currentY + 15)
        .text('Montant', 450, currentY + 15, { align: 'right' });

      currentY += 40;

      // Lignes du tableau avec alternance de couleurs
      data.lineItems.forEach((item, index) => {
        const bgColor = index % 2 === 0 ? this.colors.surface : this.colors.muted;

        doc.rect(50, currentY, 500, 35).fillColor(bgColor).fill();

        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor(this.colors.foreground)
          .text(item.label, 70, currentY + 12)
          .text(item.value, 450, currentY + 12, { align: 'right' });

        currentY += 35;
      });

      doc
        .rect(50, currentY + 15, 500, 45)
        .fillColor(this.colors.success)
        .fill();

      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#FFFFFF')
        .text('TOTAL À PAYER', 70, currentY + 28)
        .text(`${data.totalAmount.toFixed(2)} €`, 450, currentY + 28, { align: 'right' });

      if (!data.isMainStep) {
        currentY += 80;

        doc.rect(50, currentY, 500, 60).fillColor('#FEF3C7').fill();

        doc.rect(50, currentY, 500, 60).strokeColor(this.colors.warning).lineWidth(1).stroke();

        doc
          .fontSize(13)
          .font('Helvetica-Bold')
          .fillColor(this.colors.warning)
          .text('ÉTAPE INTERMÉDIAIRE', 70, currentY + 15);

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

      this.addGradientBackground(doc);
      this.addModernHeader(doc, 'FACTURE DE VIREMENT', `N° ${data.transferId}`);

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#FFFFFF')
        .text(`Date: ${data.transferDate}`, 0, 85, {
          align: 'right',
          width: doc.page.width - 50,
        });

      let currentY = 170;

      this.createModernCard(doc, 50, currentY, 500, 140, '💸 INFORMATIONS DE VIREMENT');

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text('Montant du virement:', 70, currentY + 55);

      doc
        .fontSize(32)
        .font('Helvetica-Bold')
        .fillColor(this.colors.success)
        .text(`${this.formatPrice(data.amount)} €`, 70, currentY + 80);

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text('Bénéficiaire:', 350, currentY + 55);

      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor(this.colors.primary)
        .text(`${data.recipientFirstName} ${data.recipientName}`, 350, currentY + 80);

      currentY += 160;

      this.createModernCard(doc, 50, currentY, 500, 110, 'DESCRIPTION');

      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor(this.colors.foreground)
        .text(data.description, 70, currentY + 55, {
          width: 460,
          align: 'justify',
          lineGap: 5,
        });

      currentY += 130;

      doc.rect(50, currentY, 500, 60).fillColor(this.colors.success).fill();

      doc.rect(50, currentY, 500, 3).fillColor('#FFFFFF').opacity(0.3).fill();

      doc.opacity(1);

      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#FFFFFF')
        .text('MONTANT TOTAL VIRÉ', 70, currentY + 22)
        .text(`${this.formatPrice(data.amount)} €`, 450, currentY + 22, { align: 'right' });

      this.addModernFooter(doc);
      doc.end();
    });
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

    doc.rect(x, y, width, height).fillColor('white').fill().rect(x, y, width, height).lineWidth(1);

    doc.rect(x, y, width, 30).fillColor(this.colors.secondary).fill();

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(this.colors.primary)
      .text(title, x + 15, y + 10);
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

      this.addGradientBackground(doc);
      this.addModernHeader(doc, 'FACTURE DE PRESTATION', `N° ${data.appointmentId}`);

      const formattedDate = new Date(data.appointmentDate).toLocaleDateString('fr-FR');
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#FFFFFF')
        .text(`${formattedDate} à ${data.appointmentTime}`, 0, 85, {
          align: 'right',
          width: doc.page.width - 50,
        });

      let currentY = 170;

      this.createModernCard(doc, 50, currentY, 500, 90, 'DÉTAILS DU RENDEZ-VOUS');

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text('Date et heure:', 70, currentY + 55);

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(this.colors.primary)
        .text(`${formattedDate} à ${data.appointmentTime}`, 70, currentY + 70);

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text('Montant:', 350, currentY + 55);

      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor(this.colors.success)
        .text(`${this.formatPrice(data.amount)} €`, 350, currentY + 70);

      currentY += 110;

      this.createModernCard(doc, 50, currentY, 500, 110, 'SERVICE');

      doc
        .fontSize(15)
        .font('Helvetica-Bold')
        .fillColor(this.colors.primary)
        .text(data.serviceName, 70, currentY + 55);

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor(this.colors.mutedForeground)
        .text(data.serviceDescription, 70, currentY + 75, { width: 460, lineGap: 3 });

      currentY += 130;

      this.addDecorationLine(doc, 50, currentY, 500);

      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor(this.colors.primary)
        .text('INTERVENANTS', 50, currentY + 10);

      currentY += 40;

      this.createModernCard(doc, 50, currentY, 240, 90, 'PRESTATAIRE');

      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text(data.providerName, 70, currentY + 55);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.mutedForeground)
        .text(`${data.providerEmail}`, 70, currentY + 75);

      this.createModernCard(doc, 310, currentY, 240, 90, 'CLIENT');

      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor(this.colors.foreground)
        .text(data.clientName, 330, currentY + 55);

      currentY += 110;

      this.addDecorationLine(doc, 50, currentY, 500);

      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor(this.colors.primary)
        .text('RÉCAPITULATIF FINANCIER', 50, currentY + 10);

      currentY += 40;

      const totalTTC = Number.parseFloat(data.amount.toString());
      const baseHT = totalTTC / 1.2;
      const tvaAmount = totalTTC - baseHT;

      doc.rect(50, currentY, 500, 30).fillColor(this.colors.secondary).fill();

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor(this.colors.foreground)
        .text('Base HT:', 70, currentY + 10)
        .text(`${this.formatPrice(baseHT)} €`, 450, currentY + 10, { align: 'right' });

      currentY += 30;

      doc.rect(50, currentY, 500, 30).fillColor(this.colors.surface).fill();

      doc
        .text('TVA (20%):', 70, currentY + 10)
        .text(`${this.formatPrice(tvaAmount)} €`, 450, currentY + 10, { align: 'right' });

      currentY += 30;

      doc.rect(50, currentY, 500, 40).fillColor(this.colors.success).fill();

      doc.rect(50, currentY, 500, 3).fillColor('#FFFFFF').opacity(0.3).fill();

      doc.opacity(1);

      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#FFFFFF')
        .text('TOTAL TTC', 70, currentY + 12)
        .text(`${this.formatPrice(totalTTC)} €`, 450, currentY + 12, { align: 'right' });

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

        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text('DÉTAIL DES SERVICES', 50, currentY);

        currentY += 30;

        doc.rect(50, currentY, 500, 30).fillColor(this.colors.primary).fill();

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('white')
          .text('Description', 70, currentY + 10)
          .text('Période', 250, currentY + 10)
          .text('Prix', 450, currentY + 10, { align: 'right' });

        currentY += 30;

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

        const totalTTC = this.ensureNumericPrice(invoiceData.plan.price);
        const baseHT = totalTTC / 1.2;
        const tvaAmount = totalTTC - baseHT;

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
