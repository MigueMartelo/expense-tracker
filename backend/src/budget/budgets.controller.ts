import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { type User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BudgetService } from './budget.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { CreateBudgetItemDto } from './dto/create-budget-item.dto';
import { ListBudgetsQueryDto } from './dto/list-budgets-query.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { UpdateBudgetItemDto } from './dto/update-budget-item.dto';

@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
  constructor(private readonly budgetService: BudgetService) {}

  @Get()
  list(@CurrentUser() user: User, @Query() query: ListBudgetsQueryDto) {
    return this.budgetService.list(user.id, query.archived);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() createBudgetDto: CreateBudgetDto) {
    return this.budgetService.create(user.id, createBudgetDto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.budgetService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateBudgetDto: UpdateBudgetDto,
  ) {
    return this.budgetService.update(id, user.id, updateBudgetDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.budgetService.remove(id, user.id);
  }

  @Post(':id/items')
  createItem(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() createBudgetItemDto: CreateBudgetItemDto,
  ) {
    return this.budgetService.createItemInBudget(
      id,
      user.id,
      createBudgetItemDto,
    );
  }

  @Patch('items/:itemId')
  updateItem(
    @CurrentUser() user: User,
    @Param('itemId') itemId: string,
    @Body() updateBudgetItemDto: UpdateBudgetItemDto,
  ) {
    return this.budgetService.updateItem(itemId, user.id, updateBudgetItemDto);
  }

  @Delete('items/:itemId')
  removeItem(@CurrentUser() user: User, @Param('itemId') itemId: string) {
    return this.budgetService.removeItem(itemId, user.id);
  }
}
