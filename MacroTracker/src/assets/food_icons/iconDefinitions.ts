// src/assets/food_icons/iconDefinitions.ts

// The `icon` property should be an emoji string.
// The `tagKey` property refers to a key within the "foodIconTags" section of your language JSON files.
// For example, a `tagKey` of "apple" will look for `t('foodIconTags.apple')` which should return an array of tags.
export interface FoodIconDefinition {
  icon: string; // Emoji character
  tagKey: string; // Base key for tags, e.g., "apple", "banana". Full key will be "foodIconTags.apple"
  priority?: number; // Optional: Higher number means higher priority if multiple tags match
}

export const foodIconDefinitions: FoodIconDefinition[] = [
  // Fruits
  { icon: '🍎', tagKey: 'apple', priority: 10 },
  { icon: '🍌', tagKey: 'banana', priority: 10 },
  { icon: '🍇', tagKey: 'grapes', priority: 10 },
  { icon: '🍓', tagKey: 'strawberry', priority: 10 },
  { icon: '🫐', tagKey: 'blueberry', priority: 10 },
  { icon: '🍊', tagKey: 'orange', priority: 10 },
  { icon: '🍋', tagKey: 'lemonLime', priority: 10 },
  { icon: '🍉', tagKey: 'watermelon', priority: 10 },
  { icon: '🍍', tagKey: 'pineapple', priority: 10 },
  { icon: '🥭', tagKey: 'mango', priority: 10 },
  { icon: '🥝', tagKey: 'kiwi', priority: 10 },
  { icon: '🍑', tagKey: 'peachNectarine', priority: 10 },
  { icon: '🍒', tagKey: 'cherry', priority: 10 },
  { icon: '🍐', tagKey: 'pear', priority: 10 },
  { icon: '🥑', tagKey: 'avocado', priority: 10 },
  { icon: '🥥', tagKey: 'coconut', priority: 10 },

  // Vegetables
  { icon: '🍅', tagKey: 'tomato', priority: 9 }, // Often culinary vegetable
  { icon: '🥕', tagKey: 'carrot', priority: 10 },
  { icon: '🥦', tagKey: 'broccoli', priority: 10 },
  { icon: '🥬', tagKey: 'leafyGreen', priority: 10 },
  { icon: '🥒', tagKey: 'cucumber', priority: 10 },
  { icon: '🌶️', tagKey: 'pepperGeneral', priority: 10 }, // General pepper
  { icon: '🫑', tagKey: 'bellPepper', priority: 11 },   // More specific bell pepper (can cover green, yellow, orange)
  { icon: '🌽', tagKey: 'corn', priority: 10 },
  { icon: '🥔', tagKey: 'potato', priority: 10 },
  { icon: '🧅', tagKey: 'onion', priority: 10 },
  { icon: '🧄', tagKey: 'garlic', priority: 10 },
  { icon: '🍆', tagKey: 'eggplant', priority: 10 },
  { icon: '🍄', tagKey: 'mushroom', priority: 10 },

  // Meats & Poultry
  { icon: '🍗', tagKey: 'poultry', priority: 10 },
  { icon: '🥩', tagKey: 'redMeat', priority: 10 },
  { icon: '🥓', tagKey: 'bacon', priority: 10 },
  { icon: '🍖', tagKey: 'processedMeat', priority: 9 },

  // Seafood
  { icon: '🐟', tagKey: 'fish', priority: 10 },
  { icon: '🦐', tagKey: 'shrimpPrawn', priority: 10 },
  { icon: '🦞', tagKey: 'lobster', priority: 10 },
  { icon: '🦀', tagKey: 'crab', priority: 10 },
  { icon: '🍣', tagKey: 'sushi', priority: 10 },

  // Dairy & Eggs
  { icon: '🥚', tagKey: 'egg', priority: 10 },
  { icon: '🥛', tagKey: 'milk', priority: 10 },
  { icon: '🧀', tagKey: 'cheese', priority: 10 },
  { icon: '🧈', tagKey: 'butter', priority: 10 },
  { icon: '🍦', tagKey: 'iceCream', priority: 8 },
  { icon: '🍧', tagKey: 'yogurt', priority: 10 }, // Changed from 🍧 to a more generic yogurt emoji, or keep 🍧 for frozen

  // Grains, Bread, Pasta, Cereal
  { icon: '🍞', tagKey: 'bread', priority: 10 },
  { icon: '🍚', tagKey: 'rice', priority: 10 },
  { icon: '🍝', tagKey: 'pasta', priority: 10 },
  { icon: '🥣', tagKey: 'cerealOats', priority: 10 },
  { icon: '🌾', tagKey: 'otherGrains', priority: 10 }, // Quinoa, couscous etc.
  { icon: '🫓', tagKey: 'flatbread', priority: 10 },

  // Legumes
  { icon: '🫘', tagKey: 'beansLegumes', priority: 10 },
  { icon: '🥜', tagKey: 'peanut', priority: 9 },

  // Nuts & Seeds
  { icon: '🌰', tagKey: 'nuts', priority: 10 },
  { icon: '🌻', tagKey: 'seeds', priority: 10 }, // Using sunflower as general seed representation

  // Sweets & Snacks
  { icon: '🍩', tagKey: 'donut', priority: 7 },
  { icon: '🍪', tagKey: 'cookie', priority: 7 },
  { icon: '🍫', tagKey: 'chocolate', priority: 7 },
  { icon: '🍰', tagKey: 'cake', priority: 7 },
  { icon: '🍬', tagKey: 'candy', priority: 6 },
  { icon: '🍿', tagKey: 'popcorn', priority: 8 },
  { icon: '🥨', tagKey: 'pretzel', priority: 8 },
  { icon: '🍟', tagKey: 'friesChips', priority: 7 },

  // Drinks
  { icon: '☕', tagKey: 'coffee', priority: 9 },
  { icon: '🍵', tagKey: 'tea', priority: 9 },
  { icon: '🥤', tagKey: 'softDrinkJuice', priority: 8 },
  { icon: '💧', tagKey: 'water', priority: 10 },
  { icon: '🍷', tagKey: 'wine', priority: 7 },
  { icon: '🍺', tagKey: 'beer', priority: 7 },
  { icon: '🍸', tagKey: 'cocktail', priority: 7 },

  // Prepared Meals / Dishes
  { icon: '🍕', tagKey: 'pizza', priority: 8 },
  { icon: '🍔', tagKey: 'burger', priority: 8 },
  { icon: '🌮', tagKey: 'tacoBurrito', priority: 8 },
  { icon: '🥪', tagKey: 'sandwich', priority: 9 },
  { icon: '🍲', tagKey: 'soupStew', priority: 9 },
  { icon: '🥗', tagKey: 'salad', priority: 10 },
  { icon: '🍜', tagKey: 'noodleDish', priority: 9 },


  // Generic fallbacks - these should have broad tags in the language files
  { icon: '🍓', tagKey: 'genericFruit', priority: 2 },
  { icon: '🥬', tagKey: 'genericVegetable', priority: 2 },
  { icon: '🍽️', tagKey: 'genericMeal', priority: 1 },
  { icon: '❓', tagKey: 'unknownFood', priority: 0 }, // Lowest priority
];