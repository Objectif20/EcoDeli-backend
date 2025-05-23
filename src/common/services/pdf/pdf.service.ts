import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { ShipmentDetails } from './type';


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
}
