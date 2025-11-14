#!/usr/bin/env node
/**
 * Simple script to create a customer token directly in the database
 * Usage: node server/create-customer.js <email>
 * Example: node server/create-customer.js student@example.com
 */

import customers from './customers.js';

const email = process.argv[2];

if (!email) {
  console.error('Usage: node server/create-customer.js <email>');
  console.error('Example: node server/create-customer.js student@example.com');
  process.exit(1);
}

try {
  const customer = customers.createCustomer({ email });
  console.log('\n========================================');
  console.log('CUSTOMER CREATED');
  console.log('========================================');
  console.log(`Email: ${customer.email}`);
  console.log(`Customer ID: ${customer.id}`);
  console.log('--------');
  console.log('STUDENT TOKEN:');
  console.log(customer.token);
  console.log('--------');
  console.log('\nShare this token with the student. They can use it to log in.');
  console.log('========================================\n');
} catch (err) {
  console.error('Error creating customer:', err.message);
  process.exit(1);
}
