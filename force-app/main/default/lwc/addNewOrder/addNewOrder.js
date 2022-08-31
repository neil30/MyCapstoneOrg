import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import searchProduct from '@salesforce/apex/NewOrderController.searchProducts';
import placeNewOrder from '@salesforce/apex/NewOrderController.placeNewOrder';
import LightningConfirm from 'lightning/confirm';

import ORDER_NUMBER from '@salesforce/schema/Order.OrderNumber';
import EFFECTIVE_DATE from '@salesforce/schema/Order.EffectiveDate';
const fields = [ORDER_NUMBER, EFFECTIVE_DATE];

export default class NewOrder extends NavigationMixin(LightningElement) {
    newOrder = false;
    displayList = false;
    orderedModal = false;
    productItem;
    productList;

    @api recordId;
    orderId;

    /*
    * Get Order Object Records
    * Use to get the necessary records
    */
    @wire(getRecord, { recordId: '$orderId', fields })
    order;

    get orderNumber() {
        return getFieldValue(this.order.data, ORDER_NUMBER);
    }

    get effectiveDate() {
        return getFieldValue(this.order.data, EFFECTIVE_DATE);
    }

    /*
    * Step Controller
    * Use to navigate through the steps
    */
    orderProgress = '1';
    contentOne = true;
    contentTwo = false;
    contentThree = false;
    contentFour = false;
    nextButton(event) {
        if (this.orderProgress === '1') {
            this.orderProgress = '2';

            this.contentOne = false;
            this.contentTwo = true;
        }
        else if (this.orderProgress === '2') {
            this.orderProgress = '3';

            this.contentTwo = false;
            this.contentThree = true;
        }
    }

    previousButton(event) {
        if (this.orderProgress === '4') {
            this.orderProgress = '3';
        }
        else if (this.orderProgress === '3') {
            this.orderProgress = '2';

            this.contentThree = false;
            this.contentTwo = true;
        }
        else if (this.orderProgress === '2') {
            this.orderProgress = '1';

            this.contentTwo = false;
            this.contentOne = true;
        }
    }

    /*
    * Control the Modal for the list of Selected Items
    * Hide/Show
    */
    showOrderPane(event) {
        this.newOrder = true;
    }

    hideOrderPane(event) {
        eval("$A.get('e.force:refreshView').fire();");
        this.newOrder = false;
    }

    /*
    * Use to set the values for Search Category
    * Default is Name
    */
    @track categoryValue = 'Name';
    get searchOptions() {
        return [
            { label: 'Product Name', value: 'Name' },
            { label: 'Product Brand', value: 'Brand' },
            { label: 'Product Code', value: 'ProductCode' }
        ];
    }

    searchChange(event) {
        this.categoryValue = event.detail.value;
    }

    /*
    * Use to set the values for Sort By
    * Default is null
    */
    sortDisable = true;
    @track sortValue = '';
    get sortOptions() {
        return [
            { label: 'Name: A - Z', value: 'nameAZ' },
            { label: 'Name: Z - A', value: 'nameZA' },
            { label: 'Price: Low - High', value: 'priceLow' },
            { label: 'Price: High - Low', value: 'priceHigh' }
        ];
    }

    sortChange(event) {
        this.sortValue = event.detail.value;

        if (this.sortValue === 'nameAZ') {
            this.productItem.sort((a, b) => a.Name.localeCompare(b.Name));
        }
        if (this.sortValue === 'nameZA') {
            this.productItem.sort((a, b) => b.Name.localeCompare(a.Name));
        }
        if (this.sortValue === 'priceLow') {
            this.productItem.sort((a, b) => parseFloat(a.ListPrice) - parseFloat(b.ListPrice));
        }
        if (this.sortValue === 'priceHigh') {
            this.productItem.sort((a, b) => parseFloat(b.ListPrice) - parseFloat(a.ListPrice));
        }
    }

    /*
    * Use to set the values for Price Range
    * Default is null
    */
    rangeDisable = true;
    @track priceValue = '';
    get priceOptions() {
        return [
            { label: '-- Reset --', value: 'reset' },
            { label: '10,000 Below', value: 'priceOne' },
            { label: '10,000 - 50,000', value: 'priceTwo' },
            { label: '50,000 - 100,000', value: 'priceThree' },
            { label: '100,000 Above', value: 'priceFour' }
        ];
    }

    rangeChange(event) {
        this.priceValue = event.detail.value;

        if (this.priceValue === 'reset') {
            this.priceValue = '';
            this.productItem = this.productList.filter(item => item.ListPrice > 0);
        }
        if (this.priceValue === 'priceOne') {
            this.productItem = this.productList.filter(item => item.ListPrice < 10000);
        }
        if (this.priceValue === 'priceTwo') {
            this.productItem = this.productList.filter(item => item.ListPrice >= 10000 && item.ListPrice < 50000);
        }
        if (this.priceValue === 'priceThree') {
            this.productItem = this.productList.filter(item => item.ListPrice >= 50000 && item.ListPrice < 100000);
        }
        if (this.priceValue === 'priceFour') {
            this.productItem = this.productList.filter(item => item.ListPrice > 100000);
        }
    }

    /*
    * Search Products
    * Use to get all the list of products
    */
    @track searchThis = '';
    productSearch(event) {
        this.searchThis = event.detail.value;
        if (this.searchThis.length > 0) {
            searchProduct()
                .then(result => {
                    console.log(result);
                    this.productList = JSON.parse(result);
                    console.log(this.productList);

                    if (this.categoryValue === 'Name') {
                        this.productItem = this.productList.filter(item => item.Name.toLowerCase().includes(this.searchThis.toLowerCase()));
                    }
                    if (this.categoryValue === 'Brand') {
                        this.productItem = this.productList.filter(item => item.Brand__c.toLowerCase().includes(this.searchThis.toLowerCase()));
                    }
                    if (this.categoryValue === 'ProductCode') {
                        this.productItem = this.productList.filter(item => item.ProductCode.toLowerCase().includes(this.searchThis.toLowerCase()));
                    }
                    this.displayList = true;
                    this.sortDisable = false;
                    this.rangeDisable = false;
                })
                .catch(error => {
                    this.error = error;
                    console.log(error);
                });
        } else {
            this.displayList = false;
            this.sortDisable = true;
            this.rangeDisable = true;
        }
    }

    /*
    * Add Item Button
    * Mark the item as Selected then push in an Array
    */
    productAmount = 0;
    productQuantity = 0;
    productSub = 0;
    orderAmnt = '0';
    orderTsub = '0';

    showBadge = false;
    @track buttonDisable = true;
    @track productCount = 0;
    selectedProductsList = [];
    selectedItems = true;

    addItem(event) {
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
                selectedProduct.TotalPrice = product.ListPrice;

                this.productAmount = Number.parseInt(this.productAmount) + Number.parseInt(product.ListPrice);
                break;
            }
        }
        this.orderAmnt = this.productAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        this.orderTsub = this.productAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        this.productQuantity = this.selectedProductsList.length + 1;
        if (!this.selectedProductsList.some(prod => prod.Id === selectedProduct.Id)) {
            this.selectedProductsList.push(selectedProduct);
        }

        this.productCount = this.selectedProductsList.length;
        this.selectedItems = true;
    }

    /*
    * Remove Item Button
    * Remove the item from the list by Splicing them from the Array
    */
    async removeItem(event) {
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
                if (id == product.Id) {
                    const index = this.selectedProductsList.indexOf(product);
                    this.selectedProductsList.splice(index, 1)
                }
            }
            this.productCount = this.selectedProductsList.length;
            this.selectedItems = false;
            this.selectedItems = true;

            if (this.productCount === 0) {
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

    /*
    * Get Quantity input field value
    * Compute the results
    */
    updateQuantity(event) {
        var index = -1;
        for (var product of this.selectedProductsList) {
            index++;
            if (event.target.name == product.Id) {
                break;
            }
        }

        this.selectedProductsList[index].Quantity = event.target.value;
        this.selectedProductsList[index].TotalPrice = ((Number.parseInt(this.selectedProductsList[index].ListPrice) - (Number.parseInt(this.selectedProductsList[index].ListPrice) * Number.parseInt(this.selectedProductsList[index].Discount) / 100)) * event.target.value);
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

    /*
    * Get Discount input field value
    * Compute the results
    */
    updateDiscount(event) {
        var index = -1;
        for (var product of this.selectedProductsList) {
            index++;
            if (event.target.name == product.Id) {
                break;
            }
        }
        this.selectedProductsList[index].Discount = event.target.value;
        this.selectedProductsList[index].TotalPrice = ((Number.parseInt(this.selectedProductsList[index].ListPrice) - (Number.parseInt(this.selectedProductsList[index].ListPrice) * event.target.value / 100)) * Number.parseInt(this.selectedProductsList[index].Quantity));
        this.productAmount = 0;
        for (var product of this.selectedProductsList) {
            this.productAmount = Number.parseInt(this.productAmount) + ((product.ListPrice - (product.ListPrice * product.Discount / 100)) * product.Quantity);
            this.orderAmnt = this.productAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
    }

    /*
    * Place Order
    * Create new record for the new order
    */
    async placeOrder(event) {
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
            if (this.selectedProductsList)
                this.selectedItems = false;

            for (var product of this.selectedProductsList) {
                product.UnitPrice = product.ListPrice - (product.ListPrice * product.Discount / 100);
            }

            placeNewOrder({ selectedProducts: JSON.stringify(this.selectedProductsList), accountId: this.recordId })
                .then(result => {
                    this.orderId = result;
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
                this.orderProgress = '4';

                this.contentThree = false;
                this.contentFour = true;
            }
        }
    }

    /*
    * Go to order link
    * Use to navigate to the record detail page of the created order record
    */
    goToOrder(event) {
        eval("$A.get('e.force:refreshView').fire();");
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.orderId,
                objectApiName: 'Order',
                actionName: 'view'
            }
        })
    }
}