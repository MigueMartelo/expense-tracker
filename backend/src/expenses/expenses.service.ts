import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseType } from './entities/expense.entity';

export interface ExpenseFilters {
  type?: ExpenseType;
  creditCardId?: string | 'none'; // 'none' means expenses without credit card
}

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  private async assertRelationsOwned(
    userId: string,
    {
      creditCardId,
      categoryId,
    }: { creditCardId?: string; categoryId?: string },
  ) {
    if (creditCardId) {
      const creditCard = await this.prisma.creditCard.findFirst({
        where: { id: creditCardId, userId },
        select: { id: true },
      });
      if (!creditCard) {
        throw new NotFoundException(
          `Credit card with ID ${creditCardId} not found`,
        );
      }
    }

    if (categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: categoryId, userId },
        select: { id: true },
      });
      if (!category) {
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }
    }
  }

  async create(userId: string, createExpenseDto: CreateExpenseDto) {
    await this.assertRelationsOwned(userId, createExpenseDto);

    return this.prisma.expense.create({
      data: {
        userId,
        type: createExpenseDto.type,
        amount: createExpenseDto.amount,
        description: createExpenseDto.description,
        date: new Date(createExpenseDto.date),
        creditCardId: createExpenseDto.creditCardId || null,
        categoryId: createExpenseDto.categoryId || null,
      },
      include: {
        creditCard: true,
        category: true,
      },
    });
  }

  async findAll(userId: string, filters?: ExpenseFilters) {
    const where: Prisma.ExpenseWhereInput = { userId };

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.creditCardId) {
      if (filters.creditCardId === 'none') {
        where.creditCardId = null;
      } else {
        where.creditCardId = filters.creditCardId;
      }
    }

    return this.prisma.expense.findMany({
      where,
      include: {
        creditCard: true,
        category: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        creditCard: true,
        category: true,
      },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    if (expense.userId !== userId) {
      throw new ForbiddenException('You do not have access to this expense');
    }

    return expense;
  }

  async update(id: string, userId: string, updateExpenseDto: UpdateExpenseDto) {
    // Verify ownership
    await this.findOne(id, userId);
    await this.assertRelationsOwned(userId, updateExpenseDto);

    const updateData: Prisma.ExpenseUpdateInput = {};
    if (updateExpenseDto.type) updateData.type = updateExpenseDto.type;
    if (updateExpenseDto.amount) updateData.amount = updateExpenseDto.amount;
    if (updateExpenseDto.description !== undefined)
      updateData.description = updateExpenseDto.description;
    if (updateExpenseDto.date)
      updateData.date = new Date(updateExpenseDto.date);
    if (updateExpenseDto.creditCardId !== undefined) {
      if (updateExpenseDto.creditCardId) {
        updateData.creditCard = {
          connect: { id: updateExpenseDto.creditCardId },
        };
      } else {
        updateData.creditCard = { disconnect: true };
      }
    }
    if (updateExpenseDto.categoryId !== undefined) {
      if (updateExpenseDto.categoryId) {
        updateData.category = {
          connect: { id: updateExpenseDto.categoryId },
        };
      } else {
        updateData.category = { disconnect: true };
      }
    }

    return this.prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        creditCard: true,
        category: true,
      },
    });
  }

  async remove(id: string, userId: string) {
    // Verify ownership
    await this.findOne(id, userId);

    return this.prisma.expense.delete({
      where: { id },
    });
  }
}
