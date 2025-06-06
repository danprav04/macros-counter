// src/assets/food_icons/iconDefinitions.ts

// The `icon` property should be an emoji string or a key that your app can use
// to render a specific local image asset (e.g., via require or a lookup).
// For this example, emojis are used.
export interface FoodIconDefinition {
  icon: string; // Emoji character or local asset identifier
  tags: string[];
  priority?: number; // Optional: Higher number means higher priority if multiple tags match
}

// This list should be significantly expanded for a production app.
// Tags should be lowercase.
export const foodIconDefinitions: FoodIconDefinition[] = [
  // Fruits
  { icon: '🍎', tags: ['apple', 'red apple', 'green apple', 'gala', 'fuji', 'granny smith'], priority: 10 },
  { icon: '🍌', tags: ['banana', 'plantain'], priority: 10 },
  { icon: '🍇', tags: ['grape', 'grapes'], priority: 10 },
  { icon: '🍓', tags: ['strawberry', 'strawberries'], priority: 10 },
  { icon: '🫐', tags: ['blueberry', 'blueberries'], priority: 10 },
  { icon: '🍊', tags: ['orange', 'mandarin', 'tangerine', 'clementine'], priority: 10 },
  { icon: '🍋', tags: ['lemon', 'lime'], priority: 10 },
  { icon: '🍉', tags: ['watermelon'], priority: 10 },
  { icon: '🍍', tags: ['pineapple'], priority: 10 },
  { icon: '🥭', tags: ['mango'], priority: 10 },
  { icon: '🥝', tags: ['kiwi', 'kiwifruit'], priority: 10 },
  { icon: '🍑', tags: ['peach', 'nectarine'], priority: 10 },
  { icon: '🍒', tags: ['cherry', 'cherries'], priority: 10 },
  { icon: '🍐', tags: ['pear'], priority: 10 },
  { icon: '🥑', tags: ['avocado'], priority: 10 },
  { icon: '🥥', tags: ['coconut'], priority: 10 },
  { icon: '🍅', tags: ['tomato', 'tomatoes', 'roma tomato', 'cherry tomato'], priority: 9 }, // Often culinary vegetable

  // Vegetables
  { icon: '🥕', tags: ['carrot', 'carrots'], priority: 10 },
  { icon: '🥦', tags: ['broccoli', 'broccolini'], priority: 10 },
  { icon: '🥬', tags: ['lettuce', 'spinach', 'kale', 'greens', 'leafy green', 'romaine', 'arugula'], priority: 10 },
  { icon: '🥒', tags: ['cucumber', 'cucumbers', 'pickle', 'pickles'], priority: 10 },
  { icon: '🌶️', tags: ['pepper', 'bell pepper', 'chili', 'chilli', 'jalapeno', 'capsicum'], priority: 10 },
  { icon: '🌽', tags: ['corn', 'maize', 'sweet corn'], priority: 10 },
  { icon: '🥔', tags: ['potato', 'potatoes', 'sweet potato', 'yam'], priority: 10 },
  { icon: '🧅', tags: ['onion', 'shallot', 'spring onion', 'scallion'], priority: 10 },
  { icon: '🧄', tags: ['garlic'], priority: 10 },
  { icon: '🍆', tags: ['eggplant', 'aubergine'], priority: 10 },
  { icon: '🍄', tags: ['mushroom', 'mushrooms', 'portobello', 'shiitake', 'champignon'], priority: 10 },
  { icon: '🫑', tags: ['bell pepper green', 'green pepper'], priority: 11 }, // More specific
  { icon: '🌶️', tags: ['bell pepper red', 'red pepper', 'bell pepper yellow', 'yellow pepper'], priority: 11 }, // More specific

  // Meats & Poultry
  { icon: '🍗', tags: ['chicken', 'chicken breast', 'chicken thigh', 'chicken leg', 'drumstick', 'poultry'], priority: 10 },
  { icon: '🥩', tags: ['beef', 'steak', 'mince', 'ground beef', 'pork', 'lamb', 'veal', 'red meat', 'patty'], priority: 10 },
  { icon: '🥓', tags: ['bacon'], priority: 10 },
  { icon: '🍖', tags: ['ham', 'sausage', 'hot dog', 'frankfurter', 'chorizo', 'salami', 'processed meat'], priority: 9 },

  // Seafood
  { icon: '🐟', tags: ['fish', 'salmon', 'tuna', 'cod', 'tilapia', 'mackerel', 'sardine', 'halibut', 'white fish'], priority: 10 },
  { icon: '🦐', tags: ['shrimp', 'prawn', 'shellfish'], priority: 10 },
  { icon: '🦞', tags: ['lobster', 'crayfish', 'shellfish'], priority: 10 },
  { icon: '🦀', tags: ['crab', 'shellfish'], priority: 10 },
  { icon: '🍣', tags: ['sushi', 'sashimi', 'raw fish'], priority: 10 },

  // Dairy & Eggs
  { icon: '🥚', tags: ['egg', 'eggs', 'scrambled eggs', 'fried egg', 'omelette', 'boiled egg'], priority: 10 },
  { icon: '🥛', tags: ['milk', 'dairy milk', 'cow milk', 'soy milk', 'almond milk', 'oat milk', 'plant milk'], priority: 10 },
  { icon: '🧀', tags: ['cheese', 'cheddar', 'mozzarella', 'parmesan', 'gouda', 'brie', 'feta', 'cottage cheese'], priority: 10 },
  { icon: '🧈', tags: ['butter'], priority: 10 },
  { icon: '🍦', tags: ['ice cream', 'gelato', 'sorbet', 'frozen yogurt'], priority: 8 }, // Less "healthy"
  { icon: '🍧', tags: ['yogurt', 'yoghurt', 'greek yogurt', 'dairy'], priority: 10 },

  // Grains, Bread, Pasta, Cereal
  { icon: '🍞', tags: ['bread', 'toast', 'bagel', 'croissant', 'bun', 'roll', 'sourdough', 'whole wheat bread', 'white bread'], priority: 10 },
  { icon: '🍚', tags: ['rice', 'white rice', 'brown rice', 'basmati', 'jasmine', 'grain'], priority: 10 },
  { icon: '🍝', tags: ['pasta', 'spaghetti', 'macaroni', 'noodles', 'fettuccine', 'lasagna', 'ramen'], priority: 10 },
  { icon: '🥣', tags: ['cereal', 'oats', 'oatmeal', 'granola', 'muesli', 'porridge'], priority: 10 },
  { icon: '🌾', tags: ['quinoa', 'couscous', 'barley', 'bulgur', 'farro', 'ancient grain'], priority: 10 },
  { icon: '🫓', tags: ['tortilla', 'wrap', 'pita', 'naan', 'flatbread'], priority: 10 },

  // Legumes
  { icon: '🫘', tags: ['beans', 'black beans', 'kidney beans', 'chickpeas', 'garbanzo', 'lentils', 'peas', 'legume'], priority: 10 },
  { icon: '🥜', tags: ['peanut', 'peanuts', 'peanut butter'], priority: 9 },

  // Nuts & Seeds
  { icon: '🌰', tags: ['nuts', 'almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut', 'brazil nut'], priority: 10 },
  { icon: '🌻', tags: ['seeds', 'sunflower seeds', 'pumpkin seeds', 'chia seeds', 'flax seeds', 'sesame seeds'], priority: 10 },

  // Sweets & Snacks
  { icon: '🍩', tags: ['donut', 'doughnut', 'pastry'], priority: 7 },
  { icon: '🍪', tags: ['cookie', 'biscuit'], priority: 7 },
  { icon: '🍫', tags: ['chocolate', 'chocolate bar', 'dark chocolate', 'milk chocolate'], priority: 7 },
  { icon: '🍰', tags: ['cake', 'cupcake', 'muffin', 'brownie'], priority: 7 },
  { icon: '🍬', tags: ['candy', 'sweets', 'gummy', 'lollipop', 'jelly beans'], priority: 6 },
  { icon: '🍿', tags: ['popcorn'], priority: 8 },
  { icon: '🥨', tags: ['pretzel'], priority: 8 },
  { icon: '🍟', tags: ['fries', 'french fries', 'chips', 'potato chips', 'crisps'], priority: 7 },

  // Drinks
  { icon: '☕', tags: ['coffee', 'espresso', 'latte', 'cappuccino', 'americano'], priority: 9 },
  { icon: '🍵', tags: ['tea', 'green tea', 'black tea', 'herbal tea'], priority: 9 },
  { icon: '🥤', tags: ['soda', 'coke', 'pepsi', 'soft drink', 'juice', 'orange juice', 'apple juice', 'smoothie', 'protein shake'], priority: 8 },
  { icon: '💧', tags: ['water', 'bottled water', 'mineral water'], priority: 10 },
  { icon: '🍷', tags: ['wine', 'red wine', 'white wine', 'alcohol'], priority: 7 },
  { icon: '🍺', tags: ['beer', 'lager', 'ale', 'alcohol'], priority: 7 },
  { icon: '🍸', tags: ['cocktail', 'spirit', 'liquor', 'alcohol'], priority: 7 },

  // Prepared Meals / Dishes
  { icon: '🍕', tags: ['pizza', 'margherita', 'pepperoni pizza'], priority: 8 },
  { icon: '🍔', tags: ['burger', 'hamburger', 'cheeseburger', 'veggie burger'], priority: 8 },
  { icon: '🌮', tags: ['taco', 'burrito', 'mexican food'], priority: 8 },
  { icon: '🥪', tags: ['sandwich', 'sub', 'blt', 'club sandwich'], priority: 9 },
  { icon: '🍲', tags: ['soup', 'stew', 'broth', 'chowder', 'pho'], priority: 9 },
  { icon: '🥗', tags: ['salad', 'caesar salad', 'greek salad', 'garden salad'], priority: 10 },
  { icon: '🍜', tags: ['ramen noodles', 'pho noodles', 'noodle soup'], priority: 9},


  // Generic fallback
  { icon: '❓', tags: [], priority: 0 }, // Lowest priority, should be last
  { icon: '🍽️', tags: ['food', 'meal', 'dish', 'plate', 'generic food'], priority: 1 } // Generic, slightly better than unknown
];

// A more general fruit icon if specific ones aren't matched
foodIconDefinitions.push({ icon: '🍓', tags: ['fruit', 'berry'], priority: 2 });
// A more general vegetable icon
foodIconDefinitions.push({ icon: '🥬', tags: ['vegetable', 'veg'], priority: 2 });