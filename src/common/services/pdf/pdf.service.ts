import * as PDFDocument from 'pdfkit';
import { InvoiceDetails, ShipmentDetails } from './type';


export class PdfService {
    async generateBordereauPdf(data: ShipmentDetails): Promise<Buffer> {
        return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ 
            size: 'A5', 
            layout: 'landscape',
            margin: 0
        });
        
        const buffers: Uint8Array[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            resolve(pdfBuffer);
        });

        doc.on('error', reject);

        doc.rect(10, 10, doc.page.width - 20, doc.page.height - 20).stroke();
        
        doc.moveTo(doc.page.width / 3, 10)
            .lineTo(doc.page.width / 3, doc.page.height - 10)
            .stroke();
        
        doc.moveTo(doc.page.width / 3, doc.page.height / 2)
            .lineTo(doc.page.width - 10, doc.page.height / 2)
            .stroke();
        
        const leftX = 20;
        const leftY = 100;
        
        // Logo placeholder (you'll need to add your logo)
        // doc.image('path/to/logo.png', leftX, 30, { width: 100 });
        
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Le transport de ce colis est assuré', leftX, leftY, {
            width: (doc.page.width / 3) - 30,
            align: 'center'
        });
        
        doc.text('par un livreur confirmé de la', leftX, leftY + 15, {
            width: (doc.page.width / 3) - 30,
            align: 'center'
        });
        
        doc.text('plateforme EcoDeli.', leftX, leftY + 30, {
            width: (doc.page.width / 3) - 30,
            align: 'center'
        });
        
        const topRightX = doc.page.width / 3 + 20;
        const topRightY = 30;
        
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Identifiant de la livraison:', topRightX, topRightY);
        doc.fontSize(10).font('Helvetica');
        doc.text(`#${data.deliveryCode}`, topRightX + 140, topRightY);
        
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Identifiant du colis:', topRightX, topRightY + 20);
        doc.fontSize(10).font('Helvetica');
        doc.text(`#${data.deliveryCode}`, topRightX + 140, topRightY + 20);
        
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Ville de départ:', topRightX, topRightY + 60);
        doc.fontSize(10).font('Helvetica');
        doc.text(data.departureCity, topRightX + 100, topRightY + 60);
        
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Ville d\'arrivée:', topRightX, topRightY + 80);
        doc.fontSize(10).font('Helvetica');
        doc.text(data.arrivalCity, topRightX + 100, topRightY + 80);
        
        const rightColumnX = doc.page.width - 150;
        
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Format du colis:', rightColumnX, topRightY + 60);
        doc.fontSize(10).font('Helvetica');
        doc.text('M', rightColumnX + 100, topRightY + 60);
        
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Poids:', rightColumnX, topRightY + 80);
        doc.fontSize(10).font('Helvetica');
        doc.text(`${data.totalWeight} kg`, rightColumnX + 100, topRightY + 80);
        
        const bottomLeftX = 20;
        const bottomLeftY = doc.page.height / 2 + 20;
        
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Instructions de livraison de \n l\'expéditeur:', bottomLeftX, bottomLeftY);
        
        doc.fontSize(9).font('Helvetica');
        doc.text('Informations complémentaires pour la livraison. \n Merci de suivre les instructions indiquées.', 
            bottomLeftX, 
            bottomLeftY + 20, 
            {
            width: (doc.page.width / 3) * 2 - 40,
            height: doc.page.height / 2 - 40,
            align: 'left'
            }
        );
        
        const bottomRightX = doc.page.width / 3 * 2 + 20;
        const bottomRightY = doc.page.height / 2 + 20;
        
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('À scanner par le livreur', bottomRightX, bottomRightY, {
            width: doc.page.width / 3 - 40,
            align: 'center'
        });
        
        if (data.qrCodeBase64) {
            doc.image(data.qrCodeBase64, 
            bottomRightX + 20, 
            bottomRightY + 30, 
            { 
                width: doc.page.width / 3 - 80,
                height: doc.page.height / 2 - 80
            }
            );
        }
        
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

        doc.fontSize(24)
            .font('Helvetica-Bold')
            .fillColor('#2c3e50')
            .text('FACTURE DE LIVRAISON', { align: 'center' });
        
        doc.moveDown();

        doc.fontSize(12)
            .font('Helvetica-Bold')
            .text('INFORMATIONS FACTURE')
            .fontSize(10)
            .font('Helvetica')
            .text(`N° Facture: ${data.invoiceNumber}`)
            .text(`Date: ${data.invoiceDate}`)
            .text(`N° Livraison: ${data.deliveryId}`)
            .text(`Code: ${data.deliveryCode}`)
            .moveDown();

        doc.fontSize(12)
            .font('Helvetica-Bold')
            .text('CLIENT')
            .fontSize(10)
            .font('Helvetica')
            .text(`Nom: ${data.customerName}`)
            .text(`Email: ${data.customerEmail}`)
            .moveDown();

        doc.fontSize(12)
            .font('Helvetica-Bold')
            .text('DÉTAILS LIVRAISON')
            .fontSize(10)
            .font('Helvetica')
            .text(`Description: ${data.shipmentDescription}`)
            .text(`Départ: ${data.departureCity}`)
            .text(`Arrivée: ${data.arrivalCity}`)
            .text(`Date prévue: ${data.deliveryDate}`)
            .moveDown();

        doc.fontSize(12)
            .font('Helvetica-Bold')
            .text('LIVREUR')
            .fontSize(10)
            .font('Helvetica')
            .text(`${data.deliveryPersonName}`)
            .text(`Tél: ${data.deliveryPersonPhone}`)
            .moveDown();

        doc.fontSize(12)
            .font('Helvetica-Bold')
            .text('DÉTAIL FINANCIER')
            .moveDown(0.5);

        let yPosition = doc.y;
        data.lineItems.forEach((item, index) => {
            doc.fontSize(10)
            .font('Helvetica')
            .text(`${item.label}:`, 70, yPosition)
            .text(item.value, 400, yPosition, { align: 'right' });
            yPosition += 15;
        });

        doc.moveTo(70, yPosition + 5)
            .lineTo(545, yPosition + 5)
            .stroke('#2c3e50');

        doc.fontSize(14)
            .font('Helvetica-Bold')
            .fillColor('#2c3e50')
            .text('TOTAL À PAYER:', 70, yPosition + 15)
            .text(`${data.totalAmount.toFixed(2)} €`, 400, yPosition + 15, { align: 'right' });

        if (!data.isMainStep) {
            doc.moveDown(2);
            doc.fontSize(9)
            .font('Helvetica-Oblique')
            .fillColor('#e74c3c')
            .text('⚠ Cette livraison correspond à une étape intermédiaire. Seuls les frais de base sont appliqués.');
        }

        const pageHeight = doc.page.height;
        doc.fontSize(8)
            .font('Helvetica')
            .fillColor('#95a5a6')
            .text('Facture générée automatiquement', 
                50, pageHeight - 50, { align: 'center' });

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

        doc.fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#2c3e50')
        .text('FACTURE DE VIREMENT', { align: 'center' })
        .moveDown();

        doc.fontSize(12)
        .font('Helvetica-Bold')
        .text('INFORMATIONS DE VIREMENT')
        .font('Helvetica')
        .fontSize(10)
        .text(`N° Virement : ${data.transferId}`)
        .text(`Date : ${data.transferDate}`)
        .text(`Montant : ${data.amount} €`)
        .moveDown();

        doc.fontSize(12)
        .font('Helvetica-Bold')
        .text('BÉNÉFICIAIRE')
        .font('Helvetica')
        .fontSize(10)
        .text(`Nom : ${data.recipientName}`)
        .text(`Prénom : ${data.recipientFirstName}`)
        .moveDown();

        doc.fontSize(12)
        .font('Helvetica-Bold')
        .text('DESCRIPTION')
        .font('Helvetica')
        .fontSize(10)
        .text(data.description)
        .moveDown();

        const pageHeight = doc.page.height;
        doc.fontSize(8)
        .font('Helvetica')
        .fillColor('#95a5a6')
        .text('Facture générée automatiquement',
            50, pageHeight - 50, { align: 'center' });

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

            doc
            .fontSize(24)
            .font('Helvetica-Bold')
            .fillColor('#2c3e50')
            .text('FACTURE DE PRESTATION', { align: 'center' })
            .moveDown(1.5);

            doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('RENDEZ-VOUS')
            .font('Helvetica')
            .fontSize(10)
            .text(`N° Rendez-vous : ${data.appointmentId}`)
            .text(`Date : ${data.appointmentDate}`)
            .text(`Heure : ${data.appointmentTime}`)
            .text(`Montant total : ${data.amount.toFixed(2)} €`)
            .moveDown();

            doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('SERVICE')
            .font('Helvetica')
            .fontSize(10)
            .text(`Nom : ${data.serviceName}`)
            .text(`Description : ${data.serviceDescription}`)
            .moveDown();

            doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('PRESTATAIRE')
            .font('Helvetica')
            .fontSize(10)
            .text(`Nom : ${data.providerName}`)
            .text(`Email : ${data.providerEmail}`)
            .moveDown();

            doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('CLIENT')
            .font('Helvetica')
            .fontSize(10)
            .text(`Nom : ${data.clientName}`)
            .moveDown();

            const pageHeight = doc.page.height;
            doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor('#95a5a6')
            .text('Facture générée automatiquement', 50, pageHeight - 50, { align: 'center' });

            doc.end();
        });
    }
}
