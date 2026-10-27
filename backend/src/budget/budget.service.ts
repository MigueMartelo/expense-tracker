import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { CreateBudgetItemDto } from './dto/create-budget-item.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { UpdateBudgetItemDto } from './dto/update-budget-item.dto';

const budgetWithItems = {
  items: {
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.BudgetInclude;

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, archived = false) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId, archivedAt: archived ? { not: null } : null },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const totals = await this.prisma.budgetItem.groupBy({
      by: ['budgetId'],
      where: { budgetId: { in: budgets.map((budget) => budget.id) } },
      _sum: { amount: true },
    });
    const totalByBudget = new Map(
      totals.map((total) => [total.budgetId, total._sum.amount]),
    );

    return budgets.map(({ _count, ...budget }) => ({
      ...budget,
      itemCount: _count.items,
      total: totalByBudget.get(budget.id)?.toNumber() ?? 0,
    }));
  }

  async findOne(id: string, userId: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      include: budgetWithItems,
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    if (budget.userId !== userId) {
      throw new ForbiddenException('You do not have access to this budget');
    }

    return budget;
  }

  create(userId: string, createBudgetDto: CreateBudgetDto) {
    return this.prisma.budget.create({
      data: { userId, name: createBudgetDto.name },
      include: budgetWithItems,
    });
  }

  async update(id: string, userId: string, updateBudgetDto: UpdateBudgetDto) {
    await this.findOne(id, userId);

    const updateData: Prisma.BudgetUpdateInput = {};

    if (updateBudgetDto.name !== undefined) {
      updateData.name = updateBudgetDto.name;
    }

    if (updateBudgetDto.archived !== undefined) {
      updateData.archivedAt = updateBudgetDto.archived ? new Date() : null;
    }

    return this.prisma.budget.update({
      where: { id },
      data: updateData,
      include: budgetWithItems,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.budget.delete({
      where: { id },
    });
  }

  async createItemInBudget(
    budgetId: string,
    userId: string,
    createBudgetItemDto: CreateBudgetItemDto,
  ) {
    const budget = await this.findOne(budgetId, userId);
    this.assertNotArchived(budget);

    if (createBudgetItemDto.categoryId) {
      await this.assertCategoryOwned(createBudgetItemDto.categoryId, userId);
    }

    return this.prisma.budgetItem.create({
      data: {
        budgetId: budget.id,
        item: createBudgetItemDto.item,
        amount: createBudgetItemDto.amount,
        categoryId: createBudgetItemDto.categoryId ?? null,
      },
      include: { category: true },
    });
  }

  private assertNotArchived(budget: { archivedAt: Date | null }) {
    if (budget.archivedAt) {
      throw new ConflictException('Archived budgets cannot be modified');
    }
  }

  private async assertCategoryOwned(categoryId: string, userId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }
  }

  private async findItem(id: string, userId: string) {
    const item = await this.prisma.budgetItem.findUnique({
      where: { id },
      include: { budget: true },
    });

    if (!item) {
      throw new NotFoundException(`Budget item with ID ${id} not found`);
    }

    if (item.budget.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this budget item',
      );
    }

    return item;
  }

  async updateItem(
    id: string,
    userId: string,
    updateBudgetItemDto: UpdateBudgetItemDto,
  ) {
    const item = await this.findItem(id, userId);
    this.assertNotArchived(item.budget);

    const updateData: Prisma.BudgetItemUpdateInput = {};

    if (updateBudgetItemDto.item !== undefined) {
      updateData.item = updateBudgetItemDto.item;
    }

    if (updateBudgetItemDto.amount !== undefined) {
      updateData.amount = updateBudgetItemDto.amount;
    }

    if (updateBudgetItemDto.categoryId !== undefined) {
      if (updateBudgetItemDto.categoryId) {
        await this.assertCategoryOwned(updateBudgetItemDto.categoryId, userId);
        updateData.category = {
          connect: { id: updateBudgetItemDto.categoryId },
        };
      } else {
        updateData.category = { disconnect: true };
      }
    }

    return this.prisma.budgetItem.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });
  }

  async removeItem(id: string, userId: string) {
    const item = await this.findItem(id, userId);
    this.assertNotArchived(item.budget);

    return this.prisma.budgetItem.delete({
      where: { id },
    });
  }
}
