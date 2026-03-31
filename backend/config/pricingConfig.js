/**
 * Global Pricing & Margin Configuration
 * Used to ensure all transactions follow profitability and tax standards.
 */
module.exports = {
    // Margin Controls
    MIN_MARGIN_PERCENT: 0.10,          // 10% min margin from total cost
    MIN_MARGIN_FIXED_PER_DOMAIN: 15000, // Rp 15.000 min margin per domain
    LOW_MARGIN_WARNING_THRESHOLD: 0.05, // 5% warning flag
    
    // Discount Capping
    MAX_TOTAL_DISCOUNT_PERCENT: 0.40,   // Max 40% discount from subtotal
    MAX_TOTAL_DISCOUNT_AMOUNT: 200000,  // Max Rp 200.000 absolute discount
    
    // Tax Standards
    PPN_PERCENT: 0.11, // 11% PPN
    
    // Safety Switch
    ENFORCE_PROFIT_FLOOR: true,
    
    // Tax Display Mode
    TAX_INCLUSIVE: true
};
