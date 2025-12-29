// Payment Module Associations
// Centralized to avoid circular dependencies

const Payment = require('./Payment');
const PaymentAllocation = require('./PaymentAllocation');
const Invoice = require('./Invoice');

// Payment -> Invoice (Many-to-One)
Payment.belongsTo(Invoice, {
  foreignKey: 'invoiceId',
  as: 'invoice'
});
Invoice.hasMany(Payment, {
  foreignKey: 'invoiceId',
  as: 'payments'
});

// Payment -> Payment Allocations (One-to-Many)
Payment.hasMany(PaymentAllocation, {
  foreignKey: 'paymentId',
  as: 'allocations'
});
PaymentAllocation.belongsTo(Payment, {
  foreignKey: 'paymentId',
  as: 'payment'
});

// Payment Allocation -> Invoice (Many-to-One)
PaymentAllocation.belongsTo(Invoice, {
  foreignKey: 'invoiceId',
  as: 'invoice'
});
Invoice.hasMany(PaymentAllocation, {
  foreignKey: 'invoiceId',
  as: 'paymentAllocations'
});

module.exports = {
  Payment,
  PaymentAllocation
};

