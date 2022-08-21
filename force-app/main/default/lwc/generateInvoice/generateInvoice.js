import { LightningElement, api, track } from 'lwc';
import { loadScript } from "lightning/platformResourceLoader";
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import pdflib from '@salesforce/resourceUrl/pdflib';
import cartLogo from '@salesforce/resourceUrl/OrgLogo';
import getOrder from '@salesforce/apex/GenerateInvoice.getOrderDetails';
import getItems from '@salesforce/apex/OrderController.getProdDetails';

export default class GenerateInvoice extends LightningElement {

    @api recordId;
    @track orderInfo;
    @track orderItems;
    viewInvoice = false;
    cartImage = cartLogo;

    accName = '';
    accPhone = '';
    ordNumber = '';
    ordDate;
    ordSub = 0;
    ordDiscount = 0;
    ordTotal = 0;

    ordStage = '';

    showInvoice(event) {
        getOrder({ recordId: this.recordId })
            .then(result => {
                console.log(result);
                this.orderInfo = result;
            })
            .catch(error => {
                console.log(error);
            });

        getItems({ recordId: this.recordId })
            .then(result => {
                console.log(result);
                this.orderItems = result;
            })
            .catch((error) => {
                console.log(error);
            });

        for (var product of this.orderInfo) {
            this.ordStage = product.Stage__c;
        }

        if (this.ordStage === 'Invoice Generated' || this.ordStage === 'Payment Received' || this.ordStage === 'Delivery in Plan' || this.ordStage === 'Delivered') {
            this.viewInvoice = true;
        } else if (this.ordStage === 'Cancelled') {
            event = new ShowToastEvent({
                title: 'This order was cancelled.',
                variant: 'Error',
                mode: 'dismissable'
            });
            this.dispatchEvent(event);
        } else {
            event = new ShowToastEvent({
                title: 'Invoice is not yet available.',
                variant: 'Error',
                mode: 'dismissable'
            });
            this.dispatchEvent(event);
        }
    }

    hideInvoice(event) {
        this.viewInvoice = false;
    }

    renderedCallback() {
        loadScript(this, pdflib).then(() => { });
    }

    async createPdf() {
        const pngImageBytes = await fetch(cartLogo).then((res) => res.arrayBuffer())

        const pdfDoc = await PDFLib.PDFDocument.create()
        const timesRomanFont = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRoman)
        const timesRomanFontBold = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanBold)

        const pngImage = await pdfDoc.embedPng(pngImageBytes);
        const pngDims = pngImage.scale(0.5)

        const page = pdfDoc.addPage()
        page.drawImage(pngImage, {
            x: 50,
            y: page.getHeight() - 150,
            width: 258,
            height: 70,
        })

        for (var product of this.orderInfo) {
            this.accName = product.Account.Name;
            this.accPhone = product.Account.Phone;
            this.ordNumber = product.OrderNumber;
            this.ordDate = product.EffectiveDate;
            this.ordSub = product.SubTotal__c;
            this.ordDiscount = product.Discount_Amount__c;
            this.ordTotal = product.TotalAmount;
        }

        const { width, height } = page.getSize()
        const fontSize = 12

        page.drawText('Account Name: ' + this.accName, {
            x: 60,
            y: page.getHeight() - 200,
            size: fontSize,
            font: timesRomanFontBold,
        })

        page.drawText('Phone: ' + this.accPhone, {
            x: 60,
            y: page.getHeight() - 215,
            size: fontSize,
            font: timesRomanFont,
        })

        page.drawText('Order Number: ' + this.ordNumber, {
            x: 380,
            y: page.getHeight() - 200,
            size: fontSize,
            font: timesRomanFontBold,
        })

        page.drawText('Start Date: ' + this.ordDate, {
            x: 380,
            y: page.getHeight() - 215,
            size: fontSize,
            font: timesRomanFont,
        })

        //Table Header
        page.drawText('Product Code', {
            x: 80,
            y: page.getHeight() - 280,
            size: fontSize,
            font: timesRomanFontBold,
        })

        page.drawText('Product Name', {
            x: 180,
            y: page.getHeight() - 280,
            size: fontSize,
            font: timesRomanFontBold,
        })

        page.drawText('Brand', {
            x: 370,
            y: page.getHeight() - 280,
            size: fontSize,
            font: timesRomanFontBold,
        })

        page.drawText('Quantity', {
            x: 470,
            y: page.getHeight() - 280,
            size: fontSize,
            font: timesRomanFontBold,
        })

        var spacing = 18;
        var index = -1;
        for (var product of this.orderItems) {
            index++;
            spacing = spacing + 18;

            page.drawText(product.Product2.ProductCode, {
                x: 80,
                y: page.getHeight() - (270 + spacing),
                size: fontSize,
                font: timesRomanFont,
            })

            page.drawText(product.Product2.Name, {
                x: 180,
                y: page.getHeight() - (270 + spacing),
                size: fontSize,
                font: timesRomanFont,
            })

            page.drawText(product.Product2.Brand__c, {
                x: 370,
                y: page.getHeight() - (270 + spacing),
                size: fontSize,
                font: timesRomanFont,
            })

            page.drawText(product.Quantity.toString(), {
                x: 470,
                y: page.getHeight() - (270 + spacing),
                size: fontSize,
                font: timesRomanFont,
            })
        }

        page.drawText('Subtotal: ' + this.ordSub.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","), {
            x: 380,
            y: page.getHeight() - 480,
            size: fontSize,
            font: timesRomanFont,
        })

        page.drawText('Discount: - ' + this.ordDiscount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","), {
            x: 380,
            y: page.getHeight() - 500,
            size: fontSize,
            font: timesRomanFont,
        })

        page.drawText('Total Amount: ' + this.ordTotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","), {
            x: 380,
            y: page.getHeight() - 520,
            size: fontSize,
            font: timesRomanFontBold,
        })

        const pdfBytes = await pdfDoc.save();
        this.saveByteArray("INV - " + this.ordNumber, pdfBytes);
    }

    saveByteArray(pdfName, byte) {
        var blob = new Blob([byte], { type: "application/pdf" });
        var link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        var fileName = pdfName;
        link.download = fileName;
        link.click();
    }
}