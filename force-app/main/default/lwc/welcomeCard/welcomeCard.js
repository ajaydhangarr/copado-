import { LightningElement } from 'lwc';

export default class WelcomeCard extends LightningElement {
    message = 'This component is ready to use.';

    handleClick() {
        this.message = 'Button clicked!';
    }
}