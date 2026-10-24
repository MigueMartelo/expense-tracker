import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetItemDto } from './dto/create-budget-item.dto';
import { UpdateBudgetItemDto } from './dto/update-budget-item.dto';

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureBudget(userId: string) {
    return this.prisma.budget.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
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

  async getBudget(userId: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { userId },
      include: {
        items: {
          include: { category: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (budget) {
      return budget;
    }

    return this.prisma.budget.create({
      data: { userId },
      include: {
        items: {
          include: { category: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async createItem(userId: string, createBudgetItemDto: CreateBudgetItemDto) {
    if (createBudgetItemDto.categoryId) {
      await this.assertCategoryOwned(createBudgetItemDto.categoryId, userId);
    }

    const budget = await this.ensureBudget(userId);

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
    await this.findItem(id, userId);

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
    await this.findItem(id, userId);

    return this.prisma.budgetItem.delete({
      where: { id },
    });
  }
}
