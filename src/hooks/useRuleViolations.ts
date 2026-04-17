import { useMemo } from 'react';
import { Account, TradingRule } from './useAccounts';
import { Trade } from './useTrades';
import { getTradeDate } from '../lib/timeUtils';

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  detail: string;
  severity: 'warning' | 'critical';
  current: number;
  limit: number;
}

/**
 * Checks the current account's trading rules against today's trades.
 * Returns an array of active violations.
 */
export function useRuleViolations(
  account: Account | null,
  trades: Trade[]
): RuleViolation[] {
  return useMemo(() => {
    if (!account || !account.rules || account.rules.length === 0) return [];

    const violations: RuleViolation[] = [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Filter trades for the selected account AND for today
    const accountTrades = trades.filter(t => t.accountId === account.id);
    const todayTrades = accountTrades.filter(t => {
      const tradeDate = getTradeDate(t.date);
      return tradeDate >= todayStart;
    });

    const todayPnl = todayTrades.reduce((sum, t) => sum + t.pnl, 0);

    for (const rule of account.rules) {
      if (!rule.enabled) continue;

      switch (rule.type) {
        case 'max_trades_per_day': {
          const count = todayTrades.length;
          if (count > rule.value) {
            violations.push({
              ruleId: rule.id,
              ruleName: rule.name,
              detail: `${count}/${rule.value} trades taken today`,
              severity: 'critical',
              current: count,
              limit: rule.value,
            });
          } else if (count === rule.value) {
            violations.push({
              ruleId: rule.id,
              ruleName: rule.name,
              detail: `${count}/${rule.value} trades — limit reached`,
              severity: 'warning',
              current: count,
              limit: rule.value,
            });
          }
          break;
        }

        case 'max_loss_per_trade': {
          const worstTrade = todayTrades.reduce((worst, t) =>
            t.pnl < worst ? t.pnl : worst, 0);
          if (Math.abs(worstTrade) > rule.value) {
            violations.push({
              ruleId: rule.id,
              ruleName: rule.name,
              detail: `Worst trade: -$${Math.abs(worstTrade).toFixed(2)} exceeds $${rule.value} limit`,
              severity: 'critical',
              current: Math.abs(worstTrade),
              limit: rule.value,
            });
          }
          break;
        }

        case 'daily_loss_limit': {
          // Check if unit is % or $
          if (rule.unit === '%') {
            const equity = account.currentEquity || account.initialCapital;
            const lossPct = equity > 0 ? (Math.abs(Math.min(0, todayPnl)) / equity) * 100 : 0;
            if (lossPct > rule.value) {
              violations.push({
                ruleId: rule.id,
                ruleName: rule.name,
                detail: `Daily loss: ${lossPct.toFixed(2)}% exceeds ${rule.value}% limit`,
                severity: 'critical',
                current: lossPct,
                limit: rule.value,
              });
            } else if (lossPct >= rule.value * 0.8 && todayPnl < 0) {
              violations.push({
                ruleId: rule.id,
                ruleName: rule.name,
                detail: `Daily loss: ${lossPct.toFixed(2)}% — approaching ${rule.value}% limit`,
                severity: 'warning',
                current: lossPct,
                limit: rule.value,
              });
            }
          } else {
            const lossAbs = Math.abs(Math.min(0, todayPnl));
            if (lossAbs > rule.value) {
              violations.push({
                ruleId: rule.id,
                ruleName: rule.name,
                detail: `Daily loss: $${lossAbs.toFixed(2)} exceeds $${rule.value} limit`,
                severity: 'critical',
                current: lossAbs,
                limit: rule.value,
              });
            }
          }
          break;
        }

        case 'custom': {
          // Custom rules are treated as "max per day" numeric checks
          // The user defines what the number means via the name
          const count = todayTrades.length;
          const totalLoss = Math.abs(Math.min(0, todayPnl));

          // We can't automatically check custom rules without knowing intent,
          // so we use a simple heuristic: if the unit is "trades", check count;
          // if "$", check absolute loss; if "%", check loss percentage
          if (rule.unit === 'trades' && count > rule.value) {
            violations.push({
              ruleId: rule.id,
              ruleName: rule.name,
              detail: `${count}/${rule.value} ${rule.unit}`,
              severity: 'critical',
              current: count,
              limit: rule.value,
            });
          } else if (rule.unit === '$' && totalLoss > rule.value) {
            violations.push({
              ruleId: rule.id,
              ruleName: rule.name,
              detail: `$${totalLoss.toFixed(2)} / $${rule.value} ${rule.name}`,
              severity: 'critical',
              current: totalLoss,
              limit: rule.value,
            });
          } else if (rule.unit === '%') {
            const equity = account.currentEquity || account.initialCapital;
            const pct = equity > 0 ? (totalLoss / equity) * 100 : 0;
            if (pct > rule.value) {
              violations.push({
                ruleId: rule.id,
                ruleName: rule.name,
                detail: `${pct.toFixed(2)}% / ${rule.value}% ${rule.name}`,
                severity: 'critical',
                current: pct,
                limit: rule.value,
              });
            }
          }
          break;
        }
      }
    }

    return violations;
  }, [account, trades]);
}
