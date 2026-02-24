import fs from 'fs';
import { findBestIcon } from '../../src/utils/foodIconMatcher';
import i18n from '../../src/localization/i18n';

describe('Macro Data Icon Analysis', () => {
  it('should analyze all unique foods', () => {
    const dataPath = 'c:\\Users\\Daniel\\Downloads\\macro_data_2026-02-24.json';
    if (!fs.existsSync(dataPath)) {
      console.log('File not found, skipping.');
      return;
    }
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    const getLang = (text: string) => {
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code >= 0x0400 && code <= 0x04FF) return 'ru';
        if (code >= 0x0590 && code <= 0x05FF) return 'he';
      }
      return 'en';
    };

    const uniqueFoods = new Set<string>();
    
    if (data.foods) {
      data.foods.forEach((f: any) => uniqueFoods.add(f.name));
    }
    if (data.dailyEntries) {
      data.dailyEntries.forEach((entry: any) => {
        entry.items.forEach((item: any) => {
          uniqueFoods.add(item.food.name);
        });
      });
    }

    const results: any[] = [];

    Array.from(uniqueFoods).forEach(foodName => {
      const lang = getLang(foodName);
      i18n.locale = lang;
      const icon = findBestIcon(foodName, lang as any);
      results.push({ name: foodName, lang, icon });
    });

    let outString = "=== MACRO DATA ICON ANALYSIS ===\n";
    results.sort((a, b) => (a.icon || '').localeCompare(b.icon || '') || 0).forEach(r => {
      outString += `${r.icon || 'NULL'} | ${r.name} (${r.lang})\n`;
    });
    outString += `Total unique foods tested: ${results.length}\n`;
    outString += "================================\n";
    fs.writeFileSync('c:\\Users\\Daniel\\Documents\\GitHub\\macros-counter\\MacroTracker\\macroDataResults.txt', outString);
    
    expect(true).toBe(true);
  });
});
