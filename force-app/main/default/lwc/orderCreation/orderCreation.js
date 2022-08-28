import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import searchProduct from '@salesforce/apex/NewOrderController.searchProducts';

export default class OrderCreation extends LightningElement {

    displayList = false;
    productItem;
    productList;

    @api recordId;

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
        // Cart Badge
        this.productCount = this.selectedProductsList.length;
        if (this.productCount !== 0) {
            this.buttonDisable = false;
            this.showBadge = true;
        }
        this.selectedItems = true;
    }
}