// __tests__/utils/gradingUtils.test.ts
import { calculateBaseFoodGrade, calculateDailyEntryGrade } from '../../src/utils/gradingUtils';
import { Food } from '../../src/types/food';
import { Settings } from '../../src/types/settings';

describe('gradingUtils', () => {
  describe('calculateBaseFoodGrade', () => {
    it('should return null for invalid food data', () => {
      expect(calculateBaseFoodGrade(null as any)).toBeNull();
      expect(calculateBaseFoodGrade({} as Food)).toBeNull();
    });

    it('should return a high grade (A) for a lean protein source like chicken breast', () => {
      const chickenBreast: Food = {
        id: '1',
        name: 'Chicken Breast',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        createdAt: new Date().toISOString(),
      };
      const result = calculateBaseFoodGrade(chickenBreast);
      expect(result?.letter).toBe('A');
    });

    it('should return a good grade (B) for a balanced food like salmon', () => {
      const salmon: Food = {
        id: '2',
        name: 'Salmon',
        calories: 208,
        protein: 20,
        carbs: 0,
        fat: 13,
        createdAt: new Date().toISOString(),
      };
      const result = calculateBaseFoodGrade(salmon);
      expect(result?.letter).toBe('B');
    });

    it('should return a medium grade (C) for a carb-heavy food like white rice', () => {
      const whiteRice: Food = {
        id: '3',
        name: 'White Rice',
        calories: 130,
        protein: 2.7,
        carbs: 28,
        fat: 0.3,
        createdAt: new Date().toISOString(),
      };
      const result = calculateBaseFoodGrade(whiteRice);
      expect(result?.letter).toBe('C');
    });

    it('should return a low grade (F) for a high-calorie, high-fat, low-protein food like a donut', () => {
      const donut: Food = {
        id: '4',
        name: 'Glazed Donut',
        calories: 452,
        protein: 4.9,
        carbs: 51,
        fat: 25,
        createdAt: new Date().toISOString(),
      };
      const result = calculateBaseFoodGrade(donut);
      expect(result?.letter).toBe('F');
    });
  });

  describe('calculateDailyEntryGrade', () => {
    const dailyGoals: Settings['dailyGoals'] = {
      calories: 2000,
      protein: 150,
      carbs: 250,
      fat: 65,
    };

    const donut: Food = {
      id: '4', name: 'Glazed Donut', calories: 452, protein: 4.9, carbs: 51, fat: 25,
      createdAt: new Date().toISOString(),
    };

    it('should return the base grade if consumed grams are zero or negative', () => {
      const baseGrade = calculateBaseFoodGrade(donut);
      const entryGrade = calculateDailyEntryGrade(donut, 0, dailyGoals);
      expect(entryGrade?.score).toBe(baseGrade?.score);
    });

    it('should improve the grade for a small portion of an F-grade food', () => {
      // A small donut (30g) is a small treat
      const result = calculateDailyEntryGrade(donut, 30, dailyGoals);
      // Base grade is F, but a small portion might be upgraded to D or C
      expect(['D', 'C']).toContain(result?.letter);
    });

    it('should worsen the grade for a very large portion of an F-grade food', () => {
        // Eating three donuts (240g) is a significant portion of daily calories
        const result = calculateDailyEntryGrade(donut, 240, dailyGoals);
        // This should definitely remain an F, and the score should be very low
        expect(result?.letter).toBe('F');
        expect(result?.score).toBeLessThan(30);
    });

    it('should give a bonus for a high-protein item that fits well within goals', () => {
        const chickenBreast: Food = {
            id: '1', name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6,
            createdAt: new Date().toISOString(),
        };
        // A standard portion (200g) provides a lot of protein without breaking the calorie bank
        const result = calculateDailyEntryGrade(chickenBreast, 200, dailyGoals);
        const baseResult = calculateBaseFoodGrade(chickenBreast);
        expect(result?.letter).toBe('A');
        expect(result!.score).toBeGreaterThan(baseResult!.score); // Score should be improved
    });
  });
});