public with sharing class SampleUtility {
    public static String getWelcomeMessage() {
        return 'Hello from a standalone Apex class!';
    }

    public static String getWelcomeMessage(String name) {
        return 'Hello ' + name + '! Welcome to Salesforce.';
    }
}