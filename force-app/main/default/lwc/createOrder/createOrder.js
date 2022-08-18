import { LightningElement, track, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import getRecordId from '@salesforce/apex/OrderController.getRecordId';
import getProducts from '@salesforce/apex/OrderController.getProducts';
import getItems from '@salesforce/apex/OrderController.getProdDetails';
import getOrd from '@salesforce/apex/OrderController.getOrdDetails';
import createOrderProducts from '@salesforce/apex/OrderController.createOrderProducts';

const columns = [
    { label: 'Order Id', fieldname: 'Id', type: 'text' },
    { label: 'Order Amount', field: 'TotalAmount', type: 'currency' },
    { label: 'Total Quantity', field: 'TotalQty__c', type: 'number' },
];

const columns2 = [
    { label: 'Product Name', fieldname: 'Product2.Name', type: 'text' },
    { label: 'Product Code', fieldname: 'Product2.ProductCode', type: 'text' },
    { label: 'Brand', fieldname: 'Product2.Brand__c', type: 'text' },
    { label: 'Stock Quantity', fieldname: 'Product2.Stock_Quantity__c', type: 'number' },
    { label: 'Quantity', fieldname: 'Product2.Quantity', type: 'number' },
];

export default class CreateOrder extends NavigationMixin(LightningElement) {
    recordId = '';
    orderCreated = false;
    displayList = false;
    selectedItems = true;
    showBadge = false;
    summary = false;
    disableCancel = true;
    disBtn = false;
    productList;
    desiredQuantity = 0;
    error;
    selectedProductsList = [];
    @track value = 'Name';
    @api showModal = false;
    @api orderedModal = false;
    @track data;
    @track columns = columns;
    @track columns2 = columns2;
    @track errorO;
    @track errorP;
    @track buttonDisable = true;
    @track productCount = 0;
    myDate = new Date().toISOString().slice(0, 10);

    productAmount = 0;
    productQuantity = 0;
    productSub = 0;
    orderAmnt = '0';
    orderTsub = '0';

    // Reset Button
    reset(event) {
        const inputFields = this.template.querySelectorAll('lightning-input-field');
        if (inputFields) {
            inputFields.forEach((field) => {
                field.reset();
            });
        }
    }

    // Radio Button
    get options() {
        return [
            { label: 'Search Category', value: 'Name' },
            { label: 'Product Name', value: 'Name' },
            { label: 'Product Brand', value: 'Brand__c' },
            { label: 'MRP', value: 'UnitPrice' }
        ];
    }

    radioChange(event) {
        this.value = event.detail.value;
    }

    // On Success Creation of New Order record
    handleSuccess(event) {
        this.orderCreated = true;
        if (this.orderCreated) {
            getRecordId()
                .then(result => {
                    this.recordId = result;
                })
        }

        event = new ShowToastEvent({
            title: 'Order Created Successfully!',
            message: 'Navigate through the windows to add products.',
            variant: 'Success'
        });
        this.dispatchEvent(event);

        this.disableCancel = false;
        this.disBtn = true;
    }

    cancelOrder(event) {
        eval("$A.get('e.force:refreshView').fire();");
    }

    //  Searching Products
    searchProducts(event) {
        var searchValue = event.target.value;
        console.log(this.value);
        if (searchValue.length > 0) {
            getProducts({ searchBy: this.value, searchText: searchValue, pbId: '01s5i0000089CzGAAU' })
                .then(result => {
                    console.log(result);
                    console.log('inside get products success 1');
                    this.productList = JSON.parse(result);
                    console.log('inside get products success 2');
                    this.displayList = true;
                    console.log(this.productList);
                })
                .catch(error => {
                    console.log('inside get products error');
                    this.error = error;
                    console.log(error);
                });
        }
        else {
            this.displayList = false;
        }
    }

    //  Add Product
    addProduct(event) {
        if (this.recordId == null || this.recordId == '') {
            event = new ShowToastEvent({
                title: 'Please, create an Order first!',
                variant: 'Error',
                mode: 'dismissable'
            });
            this.dispatchEvent(event);
        } else if (this.desiredQuantity < 0) {
            alert('Please enter a valid value');
        } else {
            this.selectedItems = false;
            var pId = event.target.value;
            var index = -1;
            var selectedProduct = new Object();
            for (var product of this.productList) {
                index++;
                if (pId == product.Id) {
                    selectedProduct.Id = product.Id;
                    selectedProduct.Name = product.Name;
                    selectedProduct.ProductCode = product.ProductCode;
                    selectedProduct.Brand__c = product.Brand__c;
                    selectedProduct.Stock_Quantity__c = product.Stock_Quantity__c;
                    selectedProduct.Quantity = 0;
                    selectedProduct.UnitPrice = 0;
                    selectedProduct.ListPrice = product.ListPrice;
                    selectedProduct.Discount = 0;
                    selectedProduct.PriceBookEntryId = product.PriceBookEntryId;
                    break;
                }
            }
            if (!this.selectedProductsList.some(prod => prod.Id === selectedProduct.Id)) {
                this.selectedProductsList.push(selectedProduct);
            }
            // Cart Badge
            this.productCount = this.selectedProductsList.length;
            if (this.productCount !== 0) {
                this.buttonDisable = false;
                this.showBadge = true;
            }
            this.selectedItems = true;
        }
    }

    removeProduct(event) {
        var id = event.target.value;
        for (var product of this.selectedProductsList) {
            if (id == product.Id) {
                const index = this.selectedProductsList.indexOf(product);
                this.selectedProductsList.splice(index, 1)
            }
        }
        this.selectedItems = false;
        this.selectedItems = true;

        // Cart Badge
        this.productCount = this.selectedProductsList.length;
        if (this.productCount === 0) {
            this.buttonDisable = true;
            this.showBadge = false;

            this.productQuantity = 0;
            this.orderAmnt = '0';
            this.orderTsub = '0';
        } else {
            this.productAmount = 0;
            this.productQuantity = 0;
            this.productSub = 0;
            for (var product of this.selectedProductsList) {
                this.productAmount = Number.parseInt(this.productAmount) + ((product.ListPrice - (product.ListPrice * product.Discount / 100)) * product.Quantity);
                this.productQuantity = Number.parseInt(this.productQuantity) + Number.parseInt(product.Quantity);
                this.productSub = Number.parseInt(this.productSub) + (product.ListPrice * product.Quantity);

                this.orderAmnt = this.productAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                this.orderTsub = this.productSub.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            }
        }
    }

    updateQuantity(event) {
        var index = -1;
        for (var product of this.selectedProductsList) {
            index++;
            if (event.target.name == product.Id) {
                break;
            }
        }
        this.selectedProductsList[index].Quantity = event.target.value;
        this.productAmount = 0;
        this.productQuantity = 0;
        this.productSub = 0;
        for (var product of this.selectedProductsList) {
            this.productAmount = Number.parseInt(this.productAmount) + ((product.ListPrice - (product.ListPrice * product.Discount / 100)) * product.Quantity);
            this.productQuantity = Number.parseInt(this.productQuantity) + Number.parseInt(product.Quantity);
            this.productSub = Number.parseInt(this.productSub) + (product.ListPrice * product.Quantity);

            this.orderAmnt = this.productAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            this.orderTsub = this.productSub.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
    }

    updateDiscount(event) {
        var index = -1;
        for (var product of this.selectedProductsList) {
            index++;
            if (event.target.name == product.Id) {
                break;
            }
        }
        this.selectedProductsList[index].Discount = event.target.value;
        this.productAmount = 0;
        for (var product of this.selectedProductsList) {
            this.productAmount = Number.parseInt(this.productAmount) + ((product.ListPrice - (product.ListPrice * product.Discount / 100)) * product.Quantity);
            this.orderAmnt = this.productAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
    }

    saveOrderProducts(event) {
        var inputCmp = this.template.querySelector('.inputCmp');
        var value = inputCmp.value;

        if (value > 0) {
            console.log('No Field Error found')
            inputCmp.setCustomValidity('');
            if (this.selectedProductsList)
                this.selectedItems = false;

            for (var product of this.selectedProductsList) {
                product.UnitPrice = product.ListPrice - (product.ListPrice * product.Discount / 100);
            }

            createOrderProducts({ selectedProducts: JSON.stringify(this.selectedProductsList), priceBookId: '01s5i0000089CzGAAU', orderId: this.recordId })
                .then(result => {
                    console.log('Order Id : ' + result);
                })
                .catch(error => {
                    console.log(error);
                });
            this.summary = true;
            //toast
            if (this.result !== 'Error') {
                event = new ShowToastEvent({
                    title: 'Success!',
                    message: 'Product Created',
                    variant: 'Success'
                });
                this.dispatchEvent(event);
                setTimeout(() => {
                    eval("$A.get('e.force:refreshView').fire();");
                    this[NavigationMixin.Navigate]({
                        type: 'standard__recordPage',
                        attributes: {
                            recordId: this.recordId,
                            objectApiName: 'Order',
                            actionName: 'view'
                        }
                    })
                }, 1500);
            }
        } else {
            inputCmp.setCustomValidity('');
        }
        inputCmp.reportValidity();
    }

    @api
    viewSelectedItem(event) {
        this.orderedModal = true;
    }

    @api
    closeSelectedItem(event) {
        this.orderedModal = false;
    }

    @api
    changeModal(event) {
        if (this.recordId) {
            console.log('Generate Summary');
            getOrd({ recordId: this.recordId })
                .then(result => {
                    console.log('Get Order Details');
                    this.data = result;
                    this.errorO = undefined;
                    console.log(this.data);
                })
                .catch((error) => {
                    this.errorO = error;
                });
            getItems({ recordId: this.recordId })
                .then(result => {
                    console.log('Get Product Details');
                    this.data2 = result;
                    this.errorP = undefined;
                    console.log(this.data2);
                })
                .catch((error) => {
                    this.errorP = error;
                });
            this.showModal = true;
        }


    }

    @api
    closeModal(event) {
        this.showModal = false;
    }
}