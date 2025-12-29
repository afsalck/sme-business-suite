const {
  computeInvoiceVat,
  bankersRound,
  VAT_RATE
} = require('../services/vatService');

describe('VAT Service', () => {
  describe('bankersRound', () => {
    test('should round 2.5 to 2 (round to even)', () => {
      expect(bankersRound(2.5)).toBe(2);
    });

    test('should round 3.5 to 4 (round to even)', () => {
      expect(bankersRound(3.5)).toBe(4);
    });

    test('should round 2.4 to 2.4', () => {
      expect(bankersRound(2.4)).toBe(2.4);
    });

    test('should round 2.6 to 2.6', () => {
      expect(bankersRound(2.6)).toBe(2.6);
    });

    test('should round to 2 decimals', () => {
      expect(bankersRound(10.125)).toBe(10.12);
      expect(bankersRound(10.135)).toBe(10.14);
    });
  });

  describe('computeInvoiceVat - Standard VAT', () => {
    test('should calculate VAT for standard items', async () => {
      const invoice = {
        vatType: 'standard',
        supplierTRN: '100000000000003',
        items: [
          { description: 'Item 1', quantity: 2, unitPrice: 100, discount: 0 },
          { description: 'Item 2', quantity: 1, unitPrice: 50, discount: 0 }
        ],
        totalDiscount: 0
      };

      const result = await computeInvoiceVat(invoice);
      
      expect(result.taxableSubtotal).toBe(250);
      expect(result.vatAmount).toBe(12.5); // 250 * 0.05
      expect(result.totalWithVAT).toBe(262.5);
      expect(result.items[0].vatAmount).toBe(10); // 200 * 0.05
      expect(result.items[1].vatAmount).toBe(2.5); // 50 * 0.05
    });

    test('should apply discount before VAT calculation', async () => {
      const invoice = {
        vatType: 'standard',
        supplierTRN: '100000000000003',
        items: [
          { description: 'Item 1', quantity: 1, unitPrice: 100, discount: 0 }
        ],
        totalDiscount: 10
      };

      const result = await computeInvoiceVat(invoice);
      
      expect(result.taxableSubtotal).toBe(100);
      expect(result.discountTotal).toBe(10);
      expect(result.vatAmount).toBe(4.5); // (100 - 10) * 0.05 = 4.5
      expect(result.totalWithVAT).toBe(94.5); // 100 - 10 + 4.5
    });

    test('should handle line-item discounts', async () => {
      const invoice = {
        vatType: 'standard',
        supplierTRN: '100000000000003',
        items: [
          { description: 'Item 1', quantity: 1, unitPrice: 100, discount: 5 }
        ],
        totalDiscount: 0
      };

      const result = await computeInvoiceVat(invoice);
      
      expect(result.taxableSubtotal).toBe(95); // 100 - 5
      expect(result.vatAmount).toBe(4.75); // 95 * 0.05
      expect(result.totalWithVAT).toBe(99.75);
    });
  });

  describe('computeInvoiceVat - Zero-rated', () => {
    test('should not charge VAT on zero-rated items', async () => {
      const invoice = {
        vatType: 'zero',
        items: [
          { description: 'Item 1', quantity: 1, unitPrice: 100, discount: 0 }
        ],
        totalDiscount: 0
      };

      const result = await computeInvoiceVat(invoice);
      
      expect(result.taxableSubtotal).toBe(0);
      expect(result.zeroRatedSubtotal).toBe(100);
      expect(result.vatAmount).toBe(0);
      expect(result.totalWithVAT).toBe(100);
    });
  });

  describe('computeInvoiceVat - Exempt', () => {
    test('should not charge VAT on exempt items', async () => {
      const invoice = {
        vatType: 'exempt',
        items: [
          { description: 'Item 1', quantity: 1, unitPrice: 100, discount: 0 }
        ],
        totalDiscount: 0
      };

      const result = await computeInvoiceVat(invoice);
      
      expect(result.taxableSubtotal).toBe(0);
      expect(result.exemptSubtotal).toBe(100);
      expect(result.vatAmount).toBe(0);
      expect(result.totalWithVAT).toBe(100);
    });
  });

  describe('computeInvoiceVat - Mixed VAT types', () => {
    test('should handle mixed standard and zero-rated items', async () => {
      const invoice = {
        vatType: 'standard',
        supplierTRN: '100000000000003',
        items: [
          { description: 'Standard Item', quantity: 1, unitPrice: 100, discount: 0, vatType: 'standard' },
          { description: 'Zero Item', quantity: 1, unitPrice: 50, discount: 0, vatType: 'zero' }
        ],
        totalDiscount: 0
      };

      const result = await computeInvoiceVat(invoice);
      
      expect(result.taxableSubtotal).toBe(100);
      expect(result.zeroRatedSubtotal).toBe(50);
      expect(result.vatAmount).toBe(5); // Only on standard item
      expect(result.totalWithVAT).toBe(155); // 100 + 50 + 5
    });
  });

  describe('computeInvoiceVat - Validation', () => {
    test('should require supplierTRN for standard VAT when VAT is enabled', async () => {
      const invoice = {
        vatType: 'standard',
        supplierTRN: '', // Missing TRN
        items: [
          { description: 'Item 1', quantity: 1, unitPrice: 100, discount: 0 }
        ],
        totalDiscount: 0
      };

      // Mock settings with VAT enabled
      const settings = { vatEnabled: true, trn: '100000000000003' };
      
      await expect(computeInvoiceVat(invoice, settings)).rejects.toThrow(
        'Supplier TRN is required for standard-rated invoices when VAT is enabled.'
      );
    });

    test('should allow standard VAT without TRN when VAT is disabled', async () => {
      const invoice = {
        vatType: 'standard',
        supplierTRN: '',
        items: [
          { description: 'Item 1', quantity: 1, unitPrice: 100, discount: 0 }
        ],
        totalDiscount: 0
      };

      // Mock settings with VAT disabled
      const settings = { vatEnabled: false };
      
      const result = await computeInvoiceVat(invoice, settings);
      expect(result.vatAmount).toBe(5);
    });
  });

  describe('computeInvoiceVat - Rounding', () => {
    test('should use bankers rounding for VAT amounts', async () => {
      const invoice = {
        vatType: 'standard',
        supplierTRN: '100000000000003',
        items: [
          // This will result in 2.5 after discount, which should round to 2 (even)
          { description: 'Item 1', quantity: 1, unitPrice: 50, discount: 0 }
        ],
        totalDiscount: 0
      };

      const result = await computeInvoiceVat(invoice);
      
      // 50 * 0.05 = 2.5, should round to 2 (bankers rounding)
      expect(result.vatAmount).toBe(2);
    });
  });
});

