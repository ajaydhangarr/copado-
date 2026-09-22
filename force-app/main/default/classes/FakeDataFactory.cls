public with sharing class FakeDataFactory {

    // Counter to ensure generated Fake IDs are always unique
    private static Integer fakeIdCount = 1;

    /**
     * Generates a single SObject in-memory with a structurally valid fake Salesforce ID.
     * This completely bypasses validation rules because no DML (insert) happens.
     */
    public static SObject createFakeRecord(Schema.SObjectType sobjectType, Map<String, Object> fieldValues) {
        // Instantiate the object dynamically
        SObject record = sobjectType.newSObject();
        
        // Inject a unique, fake Salesforce ID
        String keyPrefix = sobjectType.getDescribe().getKeyPrefix();
        String suffix = String.valueOf(fakeIdCount++).leftPad(12, '0');
        record.put('Id', Id.valueOf(keyPrefix + suffix));
        
        // Populate the rest of the fields passed in the map
        if (fieldValues != null) {
            for (String fieldName : fieldValues.keySet()) {
                record.put(fieldName, fieldValues.get(fieldName));
            }
        }
        
        return record;
    }

    /**
     * Generates and actually INSERTS an Account to the database.
     * To prevent validation errors, it populates standard required fields with safe dummy data.
     */
    public static Account insertFakeAccount() {
        Account acc = new Account(
            Name = 'Fake Dynamic Account ' + DateTime.now().getTime(),
            Phone = '555-0199',
            BillingStreet = '123 Fake St',
            BillingCity = 'Springfield',
            BillingState = 'IL',
            BillingPostalCode = '62701',
            BillingCountry = 'USA'
        );
        
        // Using Database.insert allows you to handle errors gracefully if a rule still hits
        Database.SaveResult sr = Database.insert(acc, false);
        if (!sr.isSuccess()) {
            System.debug('Validation or DB Error: ' + sr.getErrors()[0].getMessage());
        }
        
        return acc;
    }
}