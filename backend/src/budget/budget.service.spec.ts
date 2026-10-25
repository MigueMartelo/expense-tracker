import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetService } from './budget.service';

const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';

const makeBudget = (overrides: Record<string, unknown> = {}) => ({
  id: 'budget-1',
  userId: USER_ID,
  name: 'Monthly',
  archivedAt: null as Date | null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  items: [],
  ...overrides,
});

const makeItem = (budgetOverrides: Record<string, unknown> = {}) => ({
  id: 'item-1',
  budgetId: 'budget-1',
  item: 'Rent',
  amount: new Prisma.Decimal(100),
  categoryId: null,
  budget: makeBudget(budgetOverrides),
});

describe('BudgetService', () => {
  let service: BudgetService;
  let prisma: {
    budget: Record<
      'findMany' | 'findUnique' | 'findFirst' | 'create' | 'update' | 'delete',
      jest.Mock
    >;
    budgetItem: Record<
      'groupBy' | 'findUnique' | 'create' | 'update' | 'delete',
      jest.Mock
    >;
    category: Record<'findFirst', jest.Mock>;
  };

  beforeEach(async () => {
    prisma = {
      budget: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      budgetItem: {
        groupBy: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      category: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BudgetService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<BudgetService>(BudgetService);
  });

  describe('list', () => {
    beforeEach(() => {
      prisma.budget.findMany.mockResolvedValue([]);
      prisma.budgetItem.groupBy.mockResolvedValue([]);
    });

    it('filters active budgets by default', async () => {
      await service.list(USER_ID);

      expect(prisma.budget.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID, archivedAt: null },
        }),
      );
    });

    it('filters archived budgets when requested', async () => {
      await service.list(USER_ID, true);

      expect(prisma.budget.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID, archivedAt: { not: null } },
        }),
      );
    });

    it('adds itemCount and total to each budget', async () => {
      prisma.budget.findMany.mockResolvedValue([
        { ...makeBudget({ id: 'b1' }), _count: { items: 2 } },
        { ...makeBudget({ id: 'b2' }), _count: { items: 0 } },
      ]);
      prisma.budgetItem.groupBy.mockResolvedValue([
        { budgetId: 'b1', _sum: { amount: new Prisma.Decimal('150.5') } },
      ]);

      const result = await service.list(USER_ID);

      expect(prisma.budgetItem.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['budgetId'],
          where: { budgetId: { in: ['b1', 'b2'] } },
        }),
      );
      expect(result).toEqual([
        expect.objectContaining({ id: 'b1', itemCount: 2, total: 150.5 }),
        expect.objectContaining({ id: 'b2', itemCount: 0, total: 0 }),
      ]);
      expect(result[0]).not.toHaveProperty('_count');
    });
  });

  describe('findOne', () => {
    it('returns the budget when it belongs to the user', async () => {
      const budget = makeBudget();
      prisma.budget.findUnique.mockResolvedValue(budget);

      await expect(service.findOne('budget-1', USER_ID)).resolves.toBe(budget);
    });

    it('throws NotFoundException for an unknown budget', async () => {
      prisma.budget.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing', USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws ForbiddenException for another user's budget", async () => {
      prisma.budget.findUnique.mockResolvedValue(
        makeBudget({ userId: OTHER_USER_ID }),
      );

      await expect(service.findOne('budget-1', USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    beforeEach(() => {
      prisma.budget.findUnique.mockResolvedValue(makeBudget());
      prisma.budget.update.mockResolvedValue(makeBudget());
    });

    it('sets archivedAt when archiving', async () => {
      await service.update('budget-1', USER_ID, { archived: true });

      const [{ data }] = prisma.budget.update.mock.calls[0] as [
        { data: Prisma.BudgetUpdateInput },
      ];
      expect(data.archivedAt).toBeInstanceOf(Date);
    });

    it('clears archivedAt when restoring', async () => {
      await service.update('budget-1', USER_ID, { archived: false });

      expect(prisma.budget.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'budget-1' },
          data: { archivedAt: null },
        }),
      );
    });

    it('updates the name', async () => {
      await service.update('budget-1', USER_ID, { name: 'Groceries' });

      expect(prisma.budget.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { name: 'Groceries' } }),
      );
    });

    it("rejects updating another user's budget", async () => {
      prisma.budget.findUnique.mockResolvedValue(
        makeBudget({ userId: OTHER_USER_ID }),
      );

      await expect(
        service.update('budget-1', USER_ID, { name: 'Hijacked' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.budget.update).not.toHaveBeenCalled();
    });
  });

  describe('createItemInBudget', () => {
    const dto = { item: 'Rent', amount: 100 };

    it('creates the item in an active budget', async () => {
      prisma.budget.findUnique.mockResolvedValue(makeBudget());

      await service.createItemInBudget('budget-1', USER_ID, dto);

      expect(prisma.budgetItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            budgetId: 'budget-1',
            item: 'Rent',
            amount: 100,
            categoryId: null,
          },
        }),
      );
    });

    it('throws ConflictException when the budget is archived', async () => {
      prisma.budget.findUnique.mockResolvedValue(
        makeBudget({ archivedAt: new Date() }),
      );

      await expect(
        service.createItemInBudget('budget-1', USER_ID, dto),
      ).rejects.toThrow(ConflictException);
      expect(prisma.budgetItem.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown budget', async () => {
      prisma.budget.findUnique.mockResolvedValue(null);

      await expect(
        service.createItemInBudget('missing', USER_ID, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException for another user's budget", async () => {
      prisma.budget.findUnique.mockResolvedValue(
        makeBudget({ userId: OTHER_USER_ID }),
      );

      await expect(
        service.createItemInBudget('budget-1', USER_ID, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('accepts a category owned by the user', async () => {
      prisma.budget.findUnique.mockResolvedValue(makeBudget());
      prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });

      await service.createItemInBudget('budget-1', USER_ID, {
        ...dto,
        categoryId: 'cat-1',
      });

      expect(prisma.category.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cat-1', userId: USER_ID } }),
      );
      expect(prisma.budgetItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ categoryId: 'cat-1' }) as unknown,
        }),
      );
    });

    it("throws NotFoundException for another user's category", async () => {
      prisma.budget.findUnique.mockResolvedValue(makeBudget());
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(
        service.createItemInBudget('budget-1', USER_ID, {
          ...dto,
          categoryId: 'foreign-cat',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.budgetItem.create).not.toHaveBeenCalled();
    });
  });

  describe('updateItem', () => {
    it('updates an item in an active budget', async () => {
      prisma.budgetItem.findUnique.mockResolvedValue(makeItem());

      await service.updateItem('item-1', USER_ID, { amount: 200 });

      expect(prisma.budgetItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: { amount: 200 },
        }),
      );
    });

    it('throws ConflictException when the budget is archived', async () => {
      prisma.budgetItem.findUnique.mockResolvedValue(
        makeItem({ archivedAt: new Date() }),
      );

      await expect(
        service.updateItem('item-1', USER_ID, { amount: 200 }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.budgetItem.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown item', async () => {
      prisma.budgetItem.findUnique.mockResolvedValue(null);

      await expect(
        service.updateItem('missing', USER_ID, { amount: 200 }),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException for another user's item", async () => {
      prisma.budgetItem.findUnique.mockResolvedValue(
        makeItem({ userId: OTHER_USER_ID }),
      );

      await expect(
        service.updateItem('item-1', USER_ID, { amount: 200 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('connects a category owned by the user', async () => {
      prisma.budgetItem.findUnique.mockResolvedValue(makeItem());
      prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });

      await service.updateItem('item-1', USER_ID, { categoryId: 'cat-1' });

      expect(prisma.budgetItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { category: { connect: { id: 'cat-1' } } },
        }),
      );
    });

    it("throws NotFoundException for another user's category", async () => {
      prisma.budgetItem.findUnique.mockResolvedValue(makeItem());
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(
        service.updateItem('item-1', USER_ID, { categoryId: 'foreign-cat' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.category.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'foreign-cat', userId: USER_ID },
        }),
      );
      expect(prisma.budgetItem.update).not.toHaveBeenCalled();
    });

    it('disconnects the category when categoryId is null', async () => {
      prisma.budgetItem.findUnique.mockResolvedValue(makeItem());

      await service.updateItem('item-1', USER_ID, { categoryId: null });

      expect(prisma.category.findFirst).not.toHaveBeenCalled();
      expect(prisma.budgetItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { category: { disconnect: true } },
        }),
      );
    });
  });

  describe('removeItem', () => {
    it('deletes an item in an active budget', async () => {
      prisma.budgetItem.findUnique.mockResolvedValue(makeItem());

      await service.removeItem('item-1', USER_ID);

      expect(prisma.budgetItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
    });

    it('throws ConflictException when the budget is archived', async () => {
      prisma.budgetItem.findUnique.mockResolvedValue(
        makeItem({ archivedAt: new Date() }),
      );

      await expect(service.removeItem('item-1', USER_ID)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.budgetItem.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown item', async () => {
      prisma.budgetItem.findUnique.mockResolvedValue(null);

      await expect(service.removeItem('missing', USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws ForbiddenException for another user's item", async () => {
      prisma.budgetItem.findUnique.mockResolvedValue(
        makeItem({ userId: OTHER_USER_ID }),
      );

      await expect(service.removeItem('item-1', USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.budgetItem.delete).not.toHaveBeenCalled();
    });
  });

  describe('legacy single-budget API', () => {
    it('getBudget returns the oldest budget', async () => {
      const budget = makeBudget();
      prisma.budget.findFirst.mockResolvedValue(budget);

      await expect(service.getBudget(USER_ID)).resolves.toBe(budget);
      expect(prisma.budget.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID },
          orderBy: { createdAt: 'asc' },
        }),
      );
      expect(prisma.budget.create).not.toHaveBeenCalled();
    });

    it('getBudget creates a budget when the user has none', async () => {
      const created = makeBudget();
      prisma.budget.findFirst.mockResolvedValue(null);
      prisma.budget.create.mockResolvedValue(created);

      await expect(service.getBudget(USER_ID)).resolves.toBe(created);
      expect(prisma.budget.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { userId: USER_ID } }),
      );
    });

    it('createItem adds the item to the oldest budget', async () => {
      const budget = makeBudget({ id: 'oldest' });
      prisma.budget.findFirst.mockResolvedValue(budget);
      prisma.budget.findUnique.mockResolvedValue(budget);

      await service.createItem(USER_ID, { item: 'Rent', amount: 100 });

      expect(prisma.budget.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'oldest' } }),
      );
      expect(prisma.budgetItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ budgetId: 'oldest' }) as unknown,
        }),
      );
    });

    it('createItem creates a budget first when the user has none', async () => {
      const created = makeBudget({ id: 'new-budget' });
      prisma.budget.findFirst.mockResolvedValue(null);
      prisma.budget.create.mockResolvedValue(created);
      prisma.budget.findUnique.mockResolvedValue(created);

      await service.createItem(USER_ID, { item: 'Rent', amount: 100 });

      expect(prisma.budget.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { userId: USER_ID } }),
      );
      expect(prisma.budgetItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ budgetId: 'new-budget' }) as unknown,
        }),
      );
    });
  });
});
