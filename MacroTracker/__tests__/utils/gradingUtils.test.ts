// __tests__/utils/gradingUtils.test.ts
import { calculateBaseFoodGrade, calculateDailyEntryGrade, gradeColors } from 'utils/gradingUtils';
import { Food } from 'types/food';
import { Settings } from 'types/settings';

describe('gradingUtils', () => {
  describe('calculateBaseFoodGrade', () => {
    it('should return null for invalid food data', () => {
      expect(calculateBaseFoodGrade(null as any)).toBeNull();
      expect(calculateBaseFoodGrade({} as Food)).toBeNull();
    });

    it('should grade lean protein (chicken breast) as A', () => {
      const chickenBreast: Food = { id: '1', name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, createdAt: '' };
      const result = calculateBaseFoodGrade(chickenBreast);
      expect(result?.letter).toBe('A');
      expect(result?.color).toBe(gradeColors.A);
    });

    it('should grade fatty protein (salmon) as A', () => {
        // High protein and moderate "healthy" fat should still grade well.
        const salmon: Food = { id: '2', name: 'Salmon', calories: 208, protein: 20, carbs: 0, fat: 13, createdAt: '' };
        const result = calculateBaseFoodGrade(salmon);
        expect(result?.letter).toBe('A');
    });

    it('should grade balanced food (quinoa) as A', () => {
      const quinoa: Food = { id: '3', name: 'Quinoa', calories: 120, protein: 4, carbs: 21, fat: 2, createdAt: '' };
      const result = calculateBaseFoodGrade(quinoa);
      expect(result?.letter).toBe('A');
    });
    
    it('should grade sugary cereal as D or F', () => {
      const sugaryCereal: Food = { id: '4', name: 'Sugary Cereal', calories: 380, protein: 5, carbs: 85, fat: 2, createdAt: '' };
      const result = calculateBaseFoodGrade(sugaryCereal);
      expect(['D', 'F']).toContain(result?.letter);
    });

    it('should grade donuts as F', () => {
        const donut: Food = { id: '5', name: 'Donut', calories: 452, protein: 4.9, carbs: 51, fat: 25, createdAt: '' };
        const result = calculateBaseFoodGrade(donut);
        expect(result?.letter).toBe('F');
    });

     it('should grade avocado (high fat, but healthy) as B', () => {
        const avocado: Food = { id: '6', name: 'Avocado', calories: 160, protein: 2, carbs: 9, fat: 15, createdAt: '' };
        const result = calculateBaseFoodGrade(avocado);
        expect(result?.letter).toBe('B');
    });

    it('should grade olive oil (pure fat) as F', () => {
        const oliveOil: Food = { id: '7', name: 'Olive Oil', calories: 884, protein: 0, carbs: 0, fat: 100, createdAt: '' };
        const result = calculateBaseFoodGrade(oliveOil);
        expect(result?.letter).toBe('F');
    });
  });

  describe('calculateDailyEntryGrade', () => {
    const dailyGoals: Settings['dailyGoals'] = { calories: 2000, protein: 150, carbs: 200, fat: 70 };
    const chickenBreast: Food = { id: '1', name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, createdAt: '' };
    const donut: Food = { id: '5', name: 'Donut', calories: 452, protein: 4.9, carbs: 51, fat: 25, createdAt: '' };

    it('should return null if base grading is not possible', () => {
      expect(calculateDailyEntryGrade({} as Food, 100, dailyGoals)).toBeNull();
    });

    it('should return the base grade for zero grams consumed', () => {
        const baseGrade = calculateBaseFoodGrade(chickenBreast);
        const dailyGrade = calculateDailyEntryGrade(chickenBreast, 0, dailyGoals);
        expect(dailyGrade).toEqual(baseGrade);
    });

    it('should lower the grade for an excessive portion of a healthy food', () => {
      const baseGrade = calculateBaseFoodGrade(chickenBreast);
      const dailyGrade = calculateDailyEntryGrade(chickenBreast, 600, dailyGoals); // ~990 calories
      expect(baseGrade?.letter).toBe('A');
      expect(dailyGrade?.letter).toBe('C'); // Excessive portion drops the grade
    });

    it('should improve the grade for a very small portion of an unhealthy food', () => {
        const baseGrade = calculateBaseFoodGrade(donut);
        const dailyGrade = calculateDailyEntryGrade(donut, 20, dailyGoals); // a small bite
        expect(baseGrade?.letter).toBe('F');
        expect(dailyGrade?.letter).toBe('D');
    });

    it('should handle goals being zero or undefined', () => {
         const noGoals: Settings['dailyGoals'] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
         const result = calculateDailyEntryGrade(chickenBreast, 150, noGoals);
         expect(result?.letter).not.toBeNull();
    });
    
    it('should heavily penalize a large portion of an F-grade food', () => {
        const dailyGrade = calculateDailyEntryGrade(donut, 200, dailyGoals); // Almost half daily calories from donuts
        expect(dailyGrade?.letter).toBe('F');
        expect(dailyGrade?.score).toBeLessThan(10);
    });

    it('should slightly penalize an A-grade food if the portion is large but not excessive', () => {
        // 300g chicken is ~495 calories, ~25% of daily goal. Should slightly lower score but not the letter grade.
        const baseResult = calculateBaseFoodGrade(chickenBreast);
        const dailyResult = calculateDailyEntryGrade(chickenBreast, 300, dailyGoals);
        expect(dailyResult?.letter).toBe('A');
        expect(dailyResult?.score).toBeLessThan(baseResult?.score ?? 0);
    });

    it('covers the D grade threshold', () => {
        const mediocreFood: Food = { id: '8', name: 'Mediocre', calories: 300, protein: 10, carbs: 40, fat: 12, createdAt: ''};
        const result = calculateBaseFoodGrade(mediocreFood);
        expect(result?.letter).toBe('D');
    });
    
    it('covers the C grade threshold', () => {
        const okayFood: Food = { id: '9', name: 'Okay', calories: 250, protein: 15, carbs: 25, fat: 10, createdAt: ''};
        const result = calculateBaseFoodGrade(okayFood);
        expect(result?.letter).toBe('C');
    });
  });
});