// apply_i18n.js
const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

// --- Helper Functions ---

function readFileContent(filePath) {
    const fullPath = path.join(projectRoot, filePath);
    if (!fs.existsSync(fullPath)) {
        console.error(`❌ Error: File not found - ${filePath}`);
        return null;
    }
    return fs.readFileSync(fullPath, 'utf-8');
}

function writeFileContent(filePath, content) {
    const fullPath = path.join(projectRoot, filePath);
    try {
        fs.writeFileSync(fullPath, content, 'utf-8');
        console.log(`✅ Modified: ${filePath}`);
    } catch (error) {
        console.error(`❌ Error writing to ${filePath}:`, error);
    }
}

function insertToFile(filePath, marker, insertion, position = 'after') {
    let content = readFileContent(filePath);
    if (!content) return;

    if (content.includes(insertion.trim())) {
        console.log(`⏩ Skipping insertion in ${filePath}, content already exists.`);
        return;
    }

    const lines = content.split('\n');
    const markerIndex = lines.findIndex(line => line.includes(marker));

    if (markerIndex === -1) {
        console.error(`❌ Error: Marker "${marker}" not found in ${filePath}`);
        return;
    }

    if (position === 'after') {
        lines.splice(markerIndex + 1, 0, insertion);
    } else {
        lines.splice(markerIndex, 0, insertion);
    }

    writeFileContent(filePath, lines.join('\n'));
}

function replaceInFile(filePath, searchValue, replaceValue) {
    let content = readFileContent(filePath);
    if (!content) return;

    if (!content.includes(searchValue)) {
        console.log(`⏩ Skipping replacement in ${filePath}, search value "${searchValue}" not found.`);
        return;
    }

    const newContent = content.replace(searchValue, replaceValue);
    writeFileContent(filePath, newContent);
}

// --- Main Script Logic ---

console.log("🚀 Starting i18n implementation script...");

// 1. Create locales directory and translation files
const localesDir = path.join(projectRoot, 'locales');
const languages = ['en', 'ru', 'he'];

if (!fs.existsSync(localesDir)) {
    fs.mkdirSync(localesDir);
    console.log("✅ Created directory: locales/");
}

languages.forEach(lang => {
    const langDir = path.join(localesDir, lang);
    if (!fs.existsSync(langDir)) {
        fs.mkdirSync(langDir);
        console.log(`✅ Created directory: locales/${lang}/`);
    }
    const translationFile = path.join(langDir, 'translation.json');
    if (!fs.existsSync(translationFile)) {
        // Basic structure - ADD MORE KEYS MANUALLY!
        const basicTranslations = {
            common: {
                add: "Add",
                edit: "Edit",
                delete: "Delete",
                cancel: "Cancel",
                confirm: "Confirm",
                update: "Update",
                save: "Save",
                searchPlaceholder: "Search...",
                loading: "Loading...",
                error: "Error",
                success: "Success",
                close: "Close",
                undo: "Undo",
                back: "Back"
            },
            screens: {
                dailyEntry: "Daily Entry",
                foods: "Foods",
                settings: "Settings"
            },
            dailyEntryScreen: {
                entriesTitle: "Entries:",
                gramsSuffix: "g",
                invalidInputTitle: "Invalid Input",
                invalidInputMessage: "Please select a food and enter a valid, positive number for grams.",
                confirmDeleteTitle: "Delete Entry?",
                confirmDeleteMessage: "Are you sure you want to delete this entry?",
                deletedToast: "{{foodName}} entry deleted",
                undoDeleteToast: "Tap to undo"
            },
            foodListScreen: {
                addFoodTitle: "Add New Food",
                editFoodTitle: "Edit Food",
                deletedToast: "{{foodName}} deleted",
                undoDeleteToast: "Tap to undo",
                errorCreate: "Failed to create food.",
                errorUpdate: "Failed to update food.",
                errorDelete: "Failed to delete food."
            },
            settingsScreen: {
                general: "General",
                theme: "Theme",
                darkMode: "Dark Mode", // Keep for ThemeSwitch consistency for now
                language: "Language",
                dailyGoals: "Daily Goals",
                statistics: "Statistics",
                dataManagement: "Data Management",
                exportData: "Export Data",
                importData: "Import Data",
                clearAllData: "Clear All Data",
                clearDataConfirmTitle: "Clear All Data?",
                clearDataConfirmMessage: "This action cannot be undone. Confirmation Text: CLEAR DATA",
                importSuccess: "Import Successful",
                importFailed: "Import Failed",
                exportFailed: "Export Failed",
                dataCleared: "Data Cleared",
                invalidFile: "Invalid File",
                selectJson: "Please select a JSON file.",
                missingData: "The imported file is missing required data (dailyEntries, foods, or settings).",
                invalidJson: "The imported file is not valid JSON."
            },
            addEntryModal: {
                addTitle: "Add Entry",
                editTitle: "Edit Entry",
                searchPlaceholder: "Search Foods...",
                recentFoods: "Recent Foods",
                noFoods: "No foods found.",
                gramsPlaceholder: "Grams (e.g. 150)",
                enterValidNumber: "Enter a valid number"
            },
            addFoodModal: {
                addTitle: "Add New Food",
                editTitle: "Edit Food",
                foodNameLabel: "Food Name",
                caloriesLabel: "Calories (per 100g)",
                proteinLabel: "Protein (per 100g)",
                carbsLabel: "Carbs (per 100g)",
                fatLabel: "Fat (per 100g)",
                nameRequired: "Name is required",
                invalidInput: "Invalid input",
                aiCalculate: "Calculate with AI (Optional)",
                aiIngredients: "Get Macros from Ingredients",
                aiNameOnly: "Get Macros from Name Only",
                ingredientsLabel: "Ingredients (Optional - Add if known)",
                ingredientsPlaceholder: "e.g.\n100g Chicken Breast\n50g Rice\n1 tbsp Olive Oil",
                backToManual: "Back to Manual Input",
                barcodeComingSoon: "Barcode Input (Coming Soon)"
            },
            confirmationModal: {
                 defaultTitle: "Confirm Action",
                 defaultMessage: "Are you sure you want to perform this action?",
                 enterConfirmation: "Enter confirmation text"
            },
             dailyGoalsInput: {
                caloriesGoal: "Calories Goal",
                proteinGoal: "Protein Goal",
                carbsGoal: "Carbs Goal",
                fatGoal: "Fat Goal"
            },
             dailyProgress: {
                calories: "Calories",
                protein: "Protein",
                carbs: "Carbs",
                fat: "Fat"
            }
            // ... Add more keys for other components/screens
        };
        // Very basic placeholder translation - REPLACE WITH ACTUAL TRANSLATIONS
        let translations = basicTranslations;
        if (lang === 'ru') {
            translations = { // VERY ROUGH EXAMPLES - GET PROPER TRANSLATIONS
                common: { ...basicTranslations.common, add: "Добавить", edit: "Изменить", delete: "Удалить", cancel: "Отмена", confirm: "Подтвердить", update: "Обновить", save: "Сохранить", searchPlaceholder: "Поиск...", loading: "Загрузка...", error: "Ошибка", success: "Успешно", close: "Закрыть", undo: "Отменить", back: "Назад" },
                screens: { ...basicTranslations.screens, dailyEntry: "Дневник", foods: "Продукты", settings: "Настройки" },
                settingsScreen: { ...basicTranslations.settingsScreen, general: "Общие", language: "Язык", dailyGoals: "Дневные цели", statistics: "Статистика", dataManagement: "Управление данными", exportData: "Экспорт данных", importData: "Импорт данных", clearAllData: "Очистить все данные" },
                // ... etc
            };
        } else if (lang === 'he') {
             translations = { // VERY ROUGH EXAMPLES - GET PROPER TRANSLATIONS
                common: { ...basicTranslations.common, add: "הוסף", edit: "ערוך", delete: "מחק", cancel: "ביטול", confirm: "אישור", update: "עדכן", save: "שמור", searchPlaceholder: "חיפוש...", loading: "טוען...", error: "שגיאה", success: "הצלחה", close: "סגור", undo: "בטל", back: "חזור" },
                screens: { ...basicTranslations.screens, dailyEntry: "יומן יומי", foods: "מאכלים", settings: "הגדרות" },
                settingsScreen: { ...basicTranslations.settingsScreen, general: "כללי", language: "שפה", dailyGoals: "יעדים יומיים", statistics: "סטטיסטיקה", dataManagement: "ניהול נתונים", exportData: "יצוא נתונים", importData: "ייבוא נתונים", clearAllData: "נקה הכל" },
                // ... etc
            };
        }

        fs.writeFileSync(translationFile, JSON.stringify(translations, null, 2), 'utf-8');
        console.log(`✅ Created placeholder file: ${translationFile}`);
    } else {
         console.log(`⏩ File already exists: ${translationFile}`);
    }
});

// 2. Create i18n.ts configuration file
const i18nConfigFile = 'i18n.ts';
const i18nConfigContent = `
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native'; // Import I18nManager

// Import translation files
import en from './locales/en/translation.json';
import ru from './locales/ru/translation.json';
import he from './locales/he/translation.json';

// Import language storage functions (assuming they exist - we'll add them)
import { loadLanguage, saveLanguage } from './services/storageService';

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  he: { translation: he },
};

const LANGUAGE_DETECTOR = {
  type: 'languageDetector' as const, // Use 'as const' for literal type
  async: true, // We need async for AsyncStorage
  detect: async (callback: (lang: string) => void) => {
    try {
      // 1. Try to get language from AsyncStorage
      const savedLanguage = await loadLanguage();
      if (savedLanguage) {
        console.log('i18n: Loaded language from storage:', savedLanguage);
        callback(savedLanguage);
        return;
      }

      // 2. Get device locale
      const locales = Localization.getLocales();
      const deviceLanguage = locales?.[0]?.languageCode; // e.g., 'en', 'ru', 'he'

      if (deviceLanguage && resources[deviceLanguage as keyof typeof resources]) {
        console.log('i18n: Detected device language:', deviceLanguage);
        callback(deviceLanguage);
        return;
      }

      // 3. Fallback to English
      console.log('i18n: Falling back to English');
      callback('en');
    } catch (error) {
      console.error('i18n: Error detecting language:', error);
      callback('en'); // Fallback on error
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      console.log('i18n: Caching user language:', language);
      await saveLanguage(language);
      // Handle RTL switching if necessary (though direct manipulation is tricky)
      // const isRTL = language === 'he';
      // if (I18nManager.isRTL !== isRTL) {
      //   I18nManager.forceRTL(isRTL);
      //   // IMPORTANT: RNRestart.Restart(); // Requires react-native-restart, usually needs user confirmation
      //   console.warn("RTL setting mismatch. App restart might be needed for full layout changes.");
      // }
    } catch (error) {
      console.error('i18n: Error caching language:', error);
    }
  },
};

i18n
  .use(LANGUAGE_DETECTOR)
  .use(initReactI18next)
  .init({
    resources,
    // lng: 'en', // Let detector handle initial language
    fallbackLng: 'en',
    compatibilityJSON: 'v3', // For Expo SDK 4 compatibility+
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
    react: {
      useSuspense: false, // Recommended for React Native
    },
  });

export default i18n;
`;
if (!fs.existsSync(path.join(projectRoot, i18nConfigFile))) {
    writeFileContent(i18nConfigFile, i18nConfigContent.trim());
} else {
    console.log(`⏩ File already exists: ${i18nConfigFile}`);
}


// 3. Modify package.json
const packageJsonPath = 'package.json';
let packageJsonContent = readFileContent(packageJsonPath);
if (packageJsonContent) {
    const packageJson = JSON.parse(packageJsonContent);
    const dependencies = packageJson.dependencies || {};
    let changed = false;

    const i18nDeps = {
        "i18next": "^23.11.5", // Use recent versions
        "react-i18next": "^14.1.2",
        "expo-localization": "~15.0.10", // Match Expo SDK
        "@react-native-picker/picker": "2.7.7" // For language dropdown
    };

    for (const [dep, version] of Object.entries(i18nDeps)) {
        if (!dependencies[dep]) {
            dependencies[dep] = version;
            changed = true;
            console.log(`➕ Added dependency: ${dep}@${version}`);
        }
    }

    if (changed) {
        packageJson.dependencies = dependencies;
        // Ensure dependencies are sorted alphabetically for consistency
        packageJson.dependencies = Object.keys(packageJson.dependencies)
            .sort()
            .reduce((acc, key) => {
                acc[key] = packageJson.dependencies[key];
                return acc;
            // --- FIX IS HERE ---
            }, {}); // Removed the type assertion
            // --- END FIX ---

        writeFileContent(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log("❗ Note: Run 'npm install' or 'yarn install' after this script finishes.");
    } else {
        console.log("⏩ Dependencies already exist in package.json.");
    }
}

// 4. Modify App.tsx
const appTsxPath = 'App.tsx';
insertToFile(appTsxPath, 'import React', "import './i18n'; // Import i18n configuration", 'before');
insertToFile(appTsxPath, 'import { SafeAreaProvider', "import { I18nextProvider } from 'react-i18next';", 'before');
insertToFile(appTsxPath, 'import i18n from \'./i18n\';', "", 'after'); // Ensure i18n import exists if added manually

// Wrap with I18nextProvider - adjust if your structure differs slightly
replaceInFile(appTsxPath,
    '<SafeAreaView style={{ flex: 1, backgroundColor: backgroundColor }}>',
    `<I18nextProvider i18n={i18n}>
      <SafeAreaView style={{ flex: 1, backgroundColor: backgroundColor }}>`
);
replaceInFile(appTsxPath,
    '</SafeAreaView>\n    </ThemeProvider>',
    `</SafeAreaView>
    </I18nextProvider>
    </ThemeProvider>`
);


// 5. Modify storageService.ts
const storageServicePath = 'services/storageService.ts';
insertToFile(storageServicePath, "const RECENT_FOODS = 'recentFoods';", "const LANGUAGE_KEY = 'userLanguage';", 'after');

const languageFunctions = `

// --- Language Preference ---

export const saveLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Error saving language preference:', error);
    throw error;
  }
};

export const loadLanguage = async (): Promise<string | null> => {
  try {
    const language = await AsyncStorage.getItem(LANGUAGE_KEY);
    return language;
  } catch (error) {
    console.error('Error loading language preference:', error);
    return null; // Return null on error
  }
};
`;
// Add functions at the end of the file
let storageContent = readFileContent(storageServicePath);
if (storageContent && !storageContent.includes('saveLanguage')) {
    storageContent += languageFunctions;
    writeFileContent(storageServicePath, storageContent);
} else if (storageContent) {
     console.log(`⏩ Language functions already exist in ${storageServicePath}.`);
}

// 6. Modify SettingsScreen.tsx
const settingsScreenPath = 'screens/SettingsScreen.tsx';
insertToFile(settingsScreenPath, 'import React', "import { Picker } from '@react-native-picker/picker';", 'after');
insertToFile(settingsScreenPath, 'import { useTheme } from "@rneui/themed";', "import { useTranslation } from 'react-i18next';", 'after');
insertToFile(settingsScreenPath, 'const styles = useStyles();', "  const { t, i18n } = useTranslation();", 'after');

// Add language state and handler
insertToFile(settingsScreenPath, 'const [dataChangeCounter, setDataChangeCounter] = useState(0);', `
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
`, 'after');

const languageChangeHandler = `
  const handleLanguageChange = async (lang: string) => {
    if (lang && lang !== currentLanguage) {
      try {
        await i18n.changeLanguage(lang);
        setCurrentLanguage(lang); // Update local state
        // Persisting is handled by i18next detector's cacheUserLanguage
        // Consider if a forced update/reload is needed for RTL, but avoid if possible
        Alert.alert(t('settingsScreen.languageChangedTitle', 'Language Changed'), t('settingsScreen.languageChangedMessage', 'The app language has been updated. Some changes might require an app restart.'));
      } catch (error) {
          console.error("Failed to change language", error);
          Alert.alert(t('common.error'), t('settingsScreen.languageChangeFailed', 'Failed to change language.'));
      }
    }
  };
`;
insertToFile(settingsScreenPath, '}, [loadInitialSettings]);', languageChangeHandler, 'after'); // Insert after useEffect

// Replace some text with t() calls - DO MORE MANUALLY!
replaceInFile(settingsScreenPath, '<Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>General</Text>', "<Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settingsScreen.general')}</Text>");
replaceInFile(settingsScreenPath, '<ListItem.Title style={{ color: theme.colors.text }}>\n          Dark Mode\n        </ListItem.Title>', `<ListItem.Title style={{ color: theme.colors.text }}>\n          {t('settingsScreen.darkMode')}\n        </ListItem.Title>`); // ThemeSwitch Title
replaceInFile(settingsScreenPath, '<Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>Daily Goals</Text>', "<Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settingsScreen.dailyGoals')}</Text>");
replaceInFile(settingsScreenPath, '<Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>Statistics</Text>', "<Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settingsScreen.statistics')}</Text>");
replaceInFile(settingsScreenPath, '<Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>Data Management</Text>', "<Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settingsScreen.dataManagement')}</Text>");
replaceInFile(settingsScreenPath, 'title="Export Data"', "title={t('settingsScreen.exportData')}");
replaceInFile(settingsScreenPath, 'title="Import Data"', "title={t('settingsScreen.importData')}");
replaceInFile(settingsScreenPath, 'title="Clear All Data"', "title={t('settingsScreen.clearAllData')}");


// Add Language Picker UI
const languagePickerUI = `

      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settingsScreen.language')}</Text>
      <View style={[styles.pickerContainer, {backgroundColor: theme.colors.grey5}]}>
        <Picker
          selectedValue={currentLanguage}
          onValueChange={(itemValue) => handleLanguageChange(itemValue)}
          style={[styles.picker, {color: theme.colors.text}]}
          dropdownIconColor={theme.colors.text} // Style dropdown icon
        >
          <Picker.Item label="English" value="en" />
          <Picker.Item label="Русский (Russian)" value="ru" />
          <Picker.Item label="עברית (Hebrew)" value="he" />
        </Picker>
      </View>
`;
// Insert before Daily Goals section
insertToFile(settingsScreenPath, "<Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settingsScreen.dailyGoals')}</Text>", languagePickerUI, 'before');


// Add styles for picker
insertToFile(settingsScreenPath, 'button: {', `
  pickerContainer: {
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    overflow: 'hidden', // Ensure border radius works
  },
  picker: {
    width: '100%',
    height: Platform.OS === 'ios' ? 150 : 50, // Adjust height for platforms
     // backgroundColor: theme.colors.grey5, // Set background for picker itself if needed
  },
`, 'before');


// 7. Modify AppNavigator.tsx (Example for tab titles)
const appNavigatorPath = 'navigation/AppNavigator.tsx';
insertToFile(appNavigatorPath, 'import { Icon, useTheme } from \'@rneui/themed\';', "import { useTranslation } from 'react-i18next';", 'after');
insertToFile(appNavigatorPath, 'const { theme } = useTheme();', "  const { t } = useTranslation();", 'after');
// Replace hardcoded tab names
replaceInFile(appNavigatorPath, '<Tab.Screen name="Daily Entry">', `<Tab.Screen name={t('screens.dailyEntry')}>`);
replaceInFile(appNavigatorPath, '<Tab.Screen name="Foods">', `<Tab.Screen name={t('screens.foods')}>`);
replaceInFile(appNavigatorPath, '<Tab.Screen name="Settings">', `<Tab.Screen name={t('screens.settings')}>`);
// Also need to update the route.name checks in tabBarIcon, using the keys instead of hardcoded strings
replaceInFile(appNavigatorPath, "route.name === 'Daily Entry'", `route.name === t('screens.dailyEntry')`);
replaceInFile(appNavigatorPath, "route.name === 'Foods'", `route.name === t('screens.foods')`);
replaceInFile(appNavigatorPath, "route.name === 'Settings'", `route.name === t('screens.settings')`);


// --- Final Instructions ---
console.log("\n--- Script Finished ---");
console.log("⚠️ IMPORTANT NEXT STEPS:");
console.log("1. Run 'npm install' or 'yarn install' to add the new dependencies.");
console.log("2. Review ALL generated translation files (`locales/*/translation.json`) and provide ACCURATE translations for all keys.");
console.log("3. Go through ALL your components and screens (`.tsx` files) and replace any remaining user-visible text with the `t('your.key.here')` function from `useTranslation`. Add corresponding keys to the JSON files.");
console.log("4. Test thoroughly, especially text wrapping, layout in different languages, and RTL layout for Hebrew.");
console.log("5. For Hebrew (RTL), if the layout doesn't switch correctly automatically, you might need to investigate `I18nManager.forceRTL(true)` and potentially use `react-native-restart` after changing the language to 'he', but this often requires user confirmation and complicates the UX.");
console.log("6. Start your app: 'npx expo start'");