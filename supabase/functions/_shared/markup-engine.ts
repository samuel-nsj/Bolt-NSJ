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

  static calculateWithDefaultMarkup(baseCost: number, defaultPercentage: number = 15): PricingResult {
    return this.applyMarkup(baseCost, {
      type: 'percentage',
      value: defaultPercentage,
    });
  }
}
