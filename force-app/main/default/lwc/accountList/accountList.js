import { LightningElement, wire } from 'lwc';
import getAccounts from '@salesforce/apex/MySampleClass.getAccounts';

export default class AccountList extends LightningElement {
    @wire(getAccounts)
    accounts;

    get errorMessage() {
        if (this.accounts && this.accounts.error) {
            return this.accounts.error.body && this.accounts.error.body.message
                ? this.accounts.error.body.message
                : 'Something went wrong while loading accounts.';
        }
        return '';
    }
}