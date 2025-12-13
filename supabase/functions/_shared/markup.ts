/**
 * Markup Engine
 *
 * Applies markup to base costs based on customer configuration
 */

export interface MarkupConfig {
  type: 'percentage' | 'fixed';
  value: number;
}

export interface PricingResult {
  baseCost: number;
  markupAmount: number;
  totalCost: number;
}

export class MarkupEngine {
  /**
   * Apply markup to base cost
   */
  static applyMarkup(baseCost: number, config: MarkupConfig): PricingResult {
    let markupAmount = 0;

    if (config.type === 'percentage') {
      markupAmount = baseCost * (config.value / 100);
    } else if (config.type === 'fixed') {
      markupAmount = config.value;
    }

    const totalCost = baseCost + markupAmount;

    return {
      baseCost: Math.round(baseCost * 100) / 100,
      markupAmount: Math.round(markupAmount * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
    };
  }
}
