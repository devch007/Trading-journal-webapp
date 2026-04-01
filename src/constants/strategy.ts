export const STRATEGY_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#84cc16', '#f97316', '#6366f1'
];

export const TIMEFRAME_OPTIONS = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'];

export const DEFAULT_RULES = [
  'Entry must align with trend direction',
  'Stop loss required before entry',
  'Min 1:2 risk-to-reward ratio',
  'No trades during major news events',
];

export interface StrategyFormData {
  name: string;
  description: string;
  color: string;
  timeframes: string[];
  rules: string[];
  tags: string[];
}

export const emptyForm = (): StrategyFormData => ({
  name: '',
  description: '',
  color: STRATEGY_COLORS[0],
  timeframes: ['H1'],
  rules: [],
  tags: [],
});
