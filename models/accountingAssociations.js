// Set up associations for accounting models
// This file should be required after all models are loaded

const ChartOfAccount = require('./ChartOfAccount');
const JournalEntry = require('./JournalEntry');
const JournalEntryLine = require('./JournalEntryLine');
const GeneralLedger = require('./GeneralLedger');

// Journal Entry associations
JournalEntry.hasMany(JournalEntryLine, {
  as: 'lines',
  foreignKey: 'journalEntryId'
});

// Journal Entry Line associations
JournalEntryLine.belongsTo(ChartOfAccount, {
  as: 'account',
  foreignKey: 'accountId'
});

JournalEntryLine.belongsTo(JournalEntry, {
  as: 'journalEntry',
  foreignKey: 'journalEntryId'
});

// General Ledger associations
GeneralLedger.belongsTo(ChartOfAccount, {
  as: 'account',
  foreignKey: 'accountId'
});

GeneralLedger.belongsTo(JournalEntry, {
  as: 'journalEntry',
  foreignKey: 'journalEntryId'
});

GeneralLedger.belongsTo(JournalEntryLine, {
  as: 'journalEntryLine',
  foreignKey: 'journalEntryLineId'
});

module.exports = {
  ChartOfAccount,
  JournalEntry,
  JournalEntryLine,
  GeneralLedger
};

