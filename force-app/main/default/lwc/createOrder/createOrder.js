import { LightningElement, track, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import getRecordId from '@salesforce/apex/OrderController.getRecordId';
import searchProduct from '@salesforce/apex/OrderController.searchProducts';
import createOrderProducts from '@salesforce/apex/OrderController.createOrderProducts';
import LightningConfirm from 'lightning/confirm';

export default class CreateOrder extends NavigationMixin(LightningElement) {
    // Necessary Id
    recordId = '';

    // Booleans
    orderCreated = false;
    displayList = false;
    selectedItems = true;
    showBadge = false;
    disableCancel = true;
    disBtn = false;
    showModal = false;
    orderedModal = false;

    // Arrays
    productList;
    selectedProductsList = [];

    error;
    myDate = new Date().toISOString().slice(0, 10);

    @track value = 'Name';
    @track buttonDisable = true;
    @track productCount = 0;

    // For
    productAmount = 0;
    productQuantity = 0;
    productSub = 0;
    orderAmnt = '0';
    orderTsub = '0';

    // Reset Button
    reset(event) {
        eval("$A.get('e.force:refreshView').fire();");
        /*const inputFields = this.template.querySelectorAll('lightning-input-field');
        if (inputFields) {
            inputFields.forEach((field) => {
                field.reset();
            });
        }*/
    }

    // Radio Button
    get options() {
        return [
            { label: 'Search Category', value: 'Name' },
            { label: 'Product Name', value: 'Name' },
            { label: 'Product Brand', value: 'Brand__c' },
            { label: 'Product Code', value: 'ProductCode' }
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

    async cancelOrder(event) {
        const res = await LightningConfirm.open({
            label: 'Confirm Order Cancellation',
            message: 'Would you like to cancel this order?',
            variant: 'header',
            theme: 'error'
        });

        if (res) {
            eval("$A.get('e.force:refreshView').fire();");
            this[NavigationMixin.Navigate]({
                type: 'standard__objectPage',
                attributes: {
                    objectApiName: 'Order',
                    actionName: 'home'
                }
            })
        }
    }

    //  Searching Products
    productSearch(event) {
        var searchValue = event.target.value;
        console.log(this.value);
        if (searchValue.length > 0) {
            searchProduct({ searchBy: this.value, searchText: searchValue})
                .then(result => {
                    console.log(result);
                    this.productList = JSON.parse(result);
                    this.displayList = true;
                    console.log(this.productList);
                })
                .catch(error => {
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
                    selectedProduct.Quantity = 1;
                    selectedProduct.UnitPrice = 0;
                    selectedProduct.ListPrice = product.ListPrice;
                    selectedProduct.Discount = 0;
                    selectedProduct.PriceBookEntryId = product.PriceBookEntryId;

                    this.productAmount = Number.parseInt(this.productAmount) + Number.parseInt(product.ListPrice);
                    break;
                }
            }
            this.orderAmnt = this.productAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            this.orderTsub = this.productAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            this.productQuantity = this.selectedProductsList.length+1;
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

    // Remove Product
    async removeProduct(event) {
        var id = [];
        id.push(event.target.value)
        console.log(id[0]);

        const res = await LightningConfirm.open({
            label: 'Confirm Deletion',
            message: 'Would you like to remove this product?',
            variant: 'header',
            theme: 'error'
        });

        if (res) {
            for (var product of this.selectedProductsList) {
                if (id[0] == product.Id) {
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
                this.orderedModal = false;

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
    }

    // Get Quantity field value
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

    // Get Discount field value
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

    // Save Products to Order
    async saveOrderProducts(event) {
        var id = [];
        id.push(event.target.value)
        console.log(id[0]);

        const res = await LightningConfirm.open({
            label: 'Are you sure?',
            message: 'Would you like to checkout this order?',
            variant: 'header',
            theme: 'success'
        });

        if (res) {
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

                createOrderProducts({ selectedProducts: JSON.stringify(this.selectedProductsList), orderId: this.recordId })
                    .then(result => {
                        console.log('Order Id : ' + result);
                    })
                    .catch(error => {
                        console.log(error);
                    });
                // Show Toast
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
    }

    viewSelectedItem(event) {
        this.orderedModal = true;
    }

    closeSelectedItem(event) {
        this.orderedModal = false;
    }
}