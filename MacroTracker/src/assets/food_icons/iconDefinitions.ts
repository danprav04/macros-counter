// src/assets/food_icons/iconDefinitions.ts

// The `icon` property should be an emoji string.
// The `tagKey` property refers to a key within the "foodIconTags" section of your language JSON files.
// For example, a `tagKey` of "apple" will look for `t('foodIconTags.apple')` which should return an array of tags.
export interface FoodIconDefinition {
  icon: string; // Emoji character
  tagKey: string; // Base key for tags, e.g., "apple", "banana". Full key will be "foodIconTags.apple"
  priority?: number; // Optional: Higher number means higher priority if multiple tags match
}

// Priorities follow a tiered system to prevent ingredients (like "tomato") from overriding main dishes (like "fish"):
// 100+: Prepared Meals, Main Dishes, Specific Baked Goods (e.g., Cake, Pizza, Salad, Casserole)
// 80-99: Primary Proteins & Carb Bases (e.g., Meat, Fish, Bread, Rice, Pasta, Beans)
// 60-79: Snacks, Dairy, Drinks, Sweets (e.g., Chocolate, Cheese, Milk, Coffee, Chips)
// 40-59: Ingredients, Fruits, Vegetables, Nuts, Sauces (e.g., Apple, Tomato, Nuts, Sauce)
// < 20: Generic fallbacks
export const foodIconDefinitions: FoodIconDefinition[] = [
  // Fruits (Tier: 40)
  { icon: '🍎', tagKey: 'apple', priority: 40 },
  { icon: '🍌', tagKey: 'banana', priority: 40 },
  { icon: '🍇', tagKey: 'grapes', priority: 40 },
  { icon: '🍓', tagKey: 'strawberry', priority: 40 },
  { icon: '🫐', tagKey: 'blueberry', priority: 40 },
  { icon: '🍊', tagKey: 'orange', priority: 40 },
  { icon: '🍋', tagKey: 'lemonLime', priority: 40 },
  { icon: '🍉', tagKey: 'watermelon', priority: 40 },
  { icon: '🍍', tagKey: 'pineapple', priority: 40 },
  { icon: '🥭', tagKey: 'mango', priority: 40 },
  { icon: '🥝', tagKey: 'kiwi', priority: 40 },
  { icon: '🍑', tagKey: 'peachNectarine', priority: 40 },
  { icon: '🍒', tagKey: 'cherry', priority: 40 },
  { icon: '🍐', tagKey: 'pear', priority: 40 },
  { icon: '🥑', tagKey: 'avocado', priority: 40 },
  { icon: '🥥', tagKey: 'coconut', priority: 40 },

  // Vegetables (Tier: 40)
  { icon: '🍅', tagKey: 'tomato', priority: 40 }, 
  { icon: '🥕', tagKey: 'carrot', priority: 40 },
  { icon: '🥦', tagKey: 'broccoli', priority: 40 },
  { icon: '🥬', tagKey: 'leafyGreen', priority: 40 },
  { icon: '🥒', tagKey: 'cucumber', priority: 40 },
  { icon: '🌶️', tagKey: 'pepperGeneral', priority: 40 },
  { icon: '🫑', tagKey: 'bellPepper', priority: 45 },   // More specific than pepper
  { icon: '🌽', tagKey: 'corn', priority: 40 },
  { icon: '🥔', tagKey: 'potato', priority: 40 },
  { icon: '🧅', tagKey: 'onion', priority: 40 },
  { icon: '🧄', tagKey: 'garlic', priority: 40 },
  { icon: '🍆', tagKey: 'eggplant', priority: 40 },
  { icon: '🍄', tagKey: 'mushroom', priority: 40 },

  // Meats & Poultry (Tier: 80)
  { icon: '🍗', tagKey: 'poultry', priority: 80 },
  { icon: '🥩', tagKey: 'redMeat', priority: 80 },
  { icon: '🥓', tagKey: 'bacon', priority: 80 },
  { icon: '🍖', tagKey: 'processedMeat', priority: 80 },

  // Seafood (Tier: 80, Sushi 100)
  { icon: '🐟', tagKey: 'fish', priority: 80 },
  { icon: '🦐', tagKey: 'shrimpPrawn', priority: 80 },
  { icon: '🦞', tagKey: 'lobster', priority: 80 },
  { icon: '🦀', tagKey: 'crab', priority: 80 },
  { icon: '🍣', tagKey: 'sushi', priority: 100 },

  // Dairy & Eggs (Tier: 60, Egg 80)
  { icon: '🥚', tagKey: 'egg', priority: 80 },
  { icon: '🥛', tagKey: 'milk', priority: 60 },
  { icon: '🧀', tagKey: 'cheese', priority: 60 },
  { icon: '🧈', tagKey: 'butter', priority: 40 }, // Butter is usually an ingredient
  { icon: '🍦', tagKey: 'iceCream', priority: 90 }, // Dessert
  { icon: '🍧', tagKey: 'yogurt', priority: 60 }, 

  // Grains, Bread, Pasta, Cereal (Tier: 80, Cereal 100 for standalone meals)
  { icon: '🍞', tagKey: 'bread', priority: 80 },
  { icon: '🍚', tagKey: 'rice', priority: 80 },
  { icon: '🍝', tagKey: 'pasta', priority: 80 }, // Using pasta as base
  { icon: '🥣', tagKey: 'cerealOats', priority: 90 }, // often a standalone meal
  { icon: '🌾', tagKey: 'otherGrains', priority: 80 }, 
  { icon: '🫓', tagKey: 'flatbread', priority: 80 },

  // Legumes (Tier: 80)
  { icon: '🫘', tagKey: 'beansLegumes', priority: 80 },
  { icon: '🥜', tagKey: 'peanut', priority: 40 },

  // Nuts & Seeds (Tier: 40)
  { icon: '🌰', tagKey: 'nuts', priority: 40 },
  { icon: '🌻', tagKey: 'seeds', priority: 40 },

  // Sweets & Snacks (Tier: 70-100)
  { icon: '🍩', tagKey: 'donut', priority: 90 },
  { icon: '🍪', tagKey: 'cookie', priority: 90 },
  { icon: '🍫', tagKey: 'chocolate', priority: 70 }, // Lower than actual cakes
  { icon: '🍰', tagKey: 'cake', priority: 100 },
  { icon: '🍬', tagKey: 'candy', priority: 70 },
  { icon: '🍿', tagKey: 'popcorn', priority: 70 },
  { icon: '🥨', tagKey: 'pretzel', priority: 70 },
  { icon: '🍟', tagKey: 'friesChips', priority: 70 },
  { icon: '🍫', tagKey: 'proteinBar', priority: 90 }, // New tag for protein/energy bars

  // Drinks (Tier: 60)
  { icon: '☕', tagKey: 'coffee', priority: 60 },
  { icon: '🍵', tagKey: 'tea', priority: 60 },
  { icon: '🥤', tagKey: 'softDrinkJuice', priority: 60 },
  { icon: '💧', tagKey: 'water', priority: 60 },
  { icon: '🍷', tagKey: 'wine', priority: 60 },
  { icon: '🍺', tagKey: 'beer', priority: 60 },
  { icon: '🍸', tagKey: 'cocktail', priority: 60 },

  // Prepared Meals / Dishes (Tier: 100)
  { icon: '🍕', tagKey: 'pizza', priority: 100 },
  { icon: '🍔', tagKey: 'burger', priority: 100 },
  { icon: '🌮', tagKey: 'tacoBurrito', priority: 100 },
  { icon: '🥪', tagKey: 'sandwich', priority: 100 },
  { icon: '🍲', tagKey: 'soupStew', priority: 100 },
  { icon: '🥗', tagKey: 'salad', priority: 100 },
  { icon: '🍜', tagKey: 'noodleDish', priority: 100 },
  { icon: '🥘', tagKey: 'casserolePan', priority: 100 }, // New tag for casseroles, paella, etc.

  // Extra definitions added from translations
  { icon: '🧊', tagKey: 'tofu', priority: 80 },
  { icon: '🥞', tagKey: 'pancakeWaffle', priority: 100 },
  { icon: '🥫', tagKey: 'sauce', priority: 40 }, // Sauce is an ingredient
  { icon: '🍰', tagKey: 'dessert', priority: 90 },
  { icon: '🥜', tagKey: 'nutButter', priority: 40 },

  // Generic fallbacks (Tier: <20)
  { icon: '🍓', tagKey: 'genericFruit', priority: 15 },
  { icon: '🥬', tagKey: 'genericVegetable', priority: 15 },
  { icon: '🍽️', tagKey: 'genericMeal', priority: 10 },
  { icon: '❓', tagKey: 'unknownFood', priority: 0 }, 
];