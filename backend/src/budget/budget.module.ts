import { Module } from '@nestjs/common';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { BudgetsController } from './budgets.controller';

@Module({
  controllers: [BudgetController, BudgetsController],
  providers: [BudgetService],
})
export class BudgetModule {}
