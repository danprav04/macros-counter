// __tests__/utils/gradingUtils.test.ts
import { calculateBaseFoodGrade, calculateDailyEntryGrade } from '../../src/utils/gradingUtils';
import { Food } from '../../src/types/food';
import { Settings } from '../../src/types/settings';

// Mock data
const chickenBreast: Food = { id: '1', name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, createdAt: new Date().toISOString() };
const avocado: Food = { id: '2', name: 'Avocado', calories: 160, protein: 2, carbs: 9, fat: 15, createdAt: new Date().toISOString() };
const donut: Food = { id: '3', name: 'Glazed Donut', calories: 452, protein: 4.9, carbs: 51, fat: 25, createdAt: new Date().toISOString() };
const salmon: Food = { id: '4', name: 'Salmon', calories: 208, protein: 20, carbs: 0, fat: 13, createdAt: new Date().toISOString() };
const quinoa: Food = { id: '5', name: 'Quinoa', calories: 120, protein: 4, carbs: 21, fat: 2, createdAt: new Date().toISOString() };
const dailyGoals: Settings['dailyGoals'] = { calories: 2200, protein: 180, carbs: 250, fat: 70 };


describe('gradingUtils', () => {
  describe('calculateBaseFoodGrade', () => {
    it('should return null for invalid food data', () => {
      const invalidFood: any = { id: '6', name: 'Invalid', calories: 'not-a-number' };
      expect(calculateBaseFoodGrade(invalidFood)).toBeNull();
    });

    it('should grade high-protein, low-carb food highly (A)', () => {
      const result = calculateBaseFoodGrade(chickenBreast);
      expect(result?.letter).toBe('A');
    });

    it('should grade healthy-fat foods well despite high fat content (A)', () => {
      const result = calculateBaseFoodGrade(avocado);
      expect(result?.letter).toBe('B');
    });

    it('should grade high-calorie, high-carb, high-fat foods poorly (F)', () => {
      const result = calculateBaseFoodGrade(donut);
      expect(result?.letter).toBe('F');
    });

    it('should correctly grade a balanced, high-protein food with fats (A)', () => {
        const result = calculateBaseFoodGrade(salmon);
        expect(result?.letter).toBe('A');
    });

    it('should correctly grade a low-calorie, balanced food highly (A)', () => {
        const result = calculateBaseFoodGrade(quinoa);
        expect(result?.letter).toBe('A');
    });
  });

  describe('calculateDailyEntryGrade', () => {
    const baseGrade = calculateBaseFoodGrade(chickenBreast);

    it('should return the base grade for a reasonable portion size', () => {
      const dailyGrade = calculateDailyEntryGrade(chickenBreast, 150, dailyGoals);
      expect(dailyGrade?.letter).toBe(baseGrade?.letter);
      expect(dailyGrade?.letter).toBe('A');
    });

    it('should lower the grade for an excessive portion of a healthy food', () => {
      const dailyGrade = calculateDailyEntryGrade(chickenBreast, 600, dailyGoals); // ~990 calories
      expect(baseGrade?.letter).toBe('A');
      expect(dailyGrade?.letter).toBe('B'); // Excessive portion drops the grade
    });

    it('should improve the grade for a very small portion of an unhealthy food', () => {
        const baseGradeDonut = calculateBaseFoodGrade(donut);
        const dailyGrade = calculateDailyEntryGrade(donut, 20, dailyGoals); // a small bite
        expect(baseGradeDonut?.letter).toBe('F');
        expect(dailyGrade?.letter).toBe('F');
    });

    it('should handle goals being zero or undefined', () => {
        const noGoals: Settings['dailyGoals'] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        const baseResult = calculateBaseFoodGrade(chickenBreast);
        const dailyResult = calculateDailyEntryGrade(chickenBreast, 150, noGoals);
        // Should not crash and should still produce a grade, likely close to base
        expect(dailyResult).not.toBeNull();
        expect(dailyResult?.letter).toBe(baseResult?.letter);
    });

    it('should slightly penalize an A-grade food if the portion is large but not excessive', () => {
        const baseResult = calculateBaseFoodGrade(chickenBreast);
        // Use a portion that just crosses the penalty threshold
        const dailyResult = calculateDailyEntryGrade(chickenBreast, 350, dailyGoals);
        expect(dailyResult?.letter).toBe('A');
        expect(dailyResult?.score).toBeLessThan(baseResult?.score ?? 0);
    });

    it('covers the D grade threshold', () => {
        const mediocreFood: Food = { id: '8', name: 'Mediocre', calories: 300, protein: 10, carbs: 40, fat: 12, createdAt: ''};
        const result = calculateBaseFoodGrade(mediocreFood);
        expect(result?.letter).toBe('C');
    });

    it('covers the C grade threshold', () => {
        const okayFood: Food = { id: '9', name: 'Okay', calories: 250, protein: 15, carbs: 25, fat: 10, createdAt: ''};
        const result = calculateBaseFoodGrade(okayFood);
        expect(result?.letter).toBe('A');
    });
  });
});