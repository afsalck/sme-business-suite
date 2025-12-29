/**
 * VAT Filing Model Associations
 * Centralizes associations to avoid circular dependencies
 */

const VatFiling = require('./VatFiling');
const VatFilingItem = require('./VatFilingItem');
const Invoice = require('./Invoice');

// VatFiling has many VatFilingItems
VatFiling.hasMany(VatFilingItem, {
  foreignKey: 'vatFilingId',
  as: 'items',
  onDelete: 'CASCADE'
});

// VatFilingItem belongs to VatFiling
VatFilingItem.belongsTo(VatFiling, {
  foreignKey: 'vatFilingId',
  as: 'filing'
});

// VatFilingItem can reference an Invoice (optional)
VatFilingItem.belongsTo(Invoice, {
  foreignKey: 'invoiceId',
  as: 'invoice'
});

module.exports = {
  VatFiling,
  VatFilingItem
};

