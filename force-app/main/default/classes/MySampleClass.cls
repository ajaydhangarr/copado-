public with sharing class MySampleClass {
    @AuraEnabled(cacheable=true)
    public static List<Account> getAccounts() {
        return [
            SELECT Id, Name, Industry
            FROM Account
            ORDER BY Name
            LIMIT 10
        ];
    }

    @AuraEnabled(cacheable=true)
    public static String getGreeting() {
        return 'Hello from MySampleClass!';
    }
}
// test