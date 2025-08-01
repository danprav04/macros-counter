// src/assets/food_icons/combinationTags.ts

// This file maps broad search terms (in multiple languages) to specific tagKeys
// from foodIconDefinitions.ts. This enables searching for "vegetable" and
// finding items tagged as "carrot", "broccoli", etc.

// Keys are lowercase search terms. Values are arrays of tagKey strings.
export const combinationTags: Record<string, string[]> = {
  // --- VEGETABLES ---
  "vegetable": [
    "carrot", "broccoli", "leafyGreen", "cucumber", "pepperGeneral",
    "bellPepper", "corn", "potato", "onion", "garlic", "eggplant",
    "mushroom", "tomato" // Tomato is culinarily a vegetable
  ],
  "vegetables": [
    "carrot", "broccoli", "leafyGreen", "cucumber", "pepperGeneral",
    "bellPepper", "corn", "potato", "onion", "garlic", "eggplant",
    "mushroom", "tomato"
  ],
  "овощ": [ // Russian for vegetable (singular)
    "carrot", "broccoli", "leafyGreen", "cucumber", "pepperGeneral",
    "bellPepper", "corn", "potato", "onion", "garlic", "eggplant",
    "mushroom", "tomato"
  ],
  "овощи": [ // Russian for vegetables (plural)
    "carrot", "broccoli", "leafyGreen", "cucumber", "pepperGeneral",
    "bellPepper", "corn", "potato", "onion", "garlic", "eggplant",
    "mushroom", "tomato"
  ],
  "ירק": [ // Hebrew for vegetable (singular)
    "carrot", "broccoli", "leafyGreen", "cucumber", "pepperGeneral",
    "bellPepper", "corn", "potato", "onion", "garlic", "eggplant",
    "mushroom", "tomato"
  ],
  "ירקות": [ // Hebrew for vegetables (plural)
    "carrot", "broccoli", "leafyGreen", "cucumber", "pepperGeneral",
    "bellPepper", "corn", "potato", "onion", "garlic", "eggplant",
    "mushroom", "tomato"
  ],

  // --- FRUITS ---
  "fruit": [
    "apple", "banana", "grapes", "strawberry", "blueberry", "orange",
    "lemonLime", "watermelon", "pineapple", "mango", "kiwi",
    "peachNectarine", "cherry", "pear", "coconut"
  ],
  "fruits": [
    "apple", "banana", "grapes", "strawberry", "blueberry", "orange",
    "lemonLime", "watermelon", "pineapple", "mango", "kiwi",
    "peachNectarine", "cherry", "pear", "coconut"
  ],
  "фрукт": [ // Russian for fruit (singular)
    "apple", "banana", "grapes", "strawberry", "blueberry", "orange",
    "lemonLime", "watermelon", "pineapple", "mango", "kiwi",
    "peachNectarine", "cherry", "pear", "coconut"
  ],
  "фрукты": [ // Russian for fruits (plural)
    "apple", "banana", "grapes", "strawberry", "blueberry", "orange",
    "lemonLime", "watermelon", "pineapple", "mango", "kiwi",
    "peachNectarine", "cherry", "pear", "coconut"
  ],
  "פרי": [ // Hebrew for fruit (singular)
    "apple", "banana", "grapes", "strawberry", "blueberry", "orange",
    "lemonLime", "watermelon", "pineapple", "mango", "kiwi",
    "peachNectarine", "cherry", "pear", "coconut"
  ],
  "פירות": [ // Hebrew for fruits (plural)
    "apple", "banana", "grapes", "strawberry", "blueberry", "orange",
    "lemonLime", "watermelon", "pineapple", "mango", "kiwi",
    "peachNectarine", "cherry", "pear", "coconut"
  ],

  // --- MEATS ---
  "meat": ["poultry", "redMeat", "bacon", "processedMeat"],
  "мясо": ["poultry", "redMeat", "bacon", "processedMeat"], // Russian
  "בשר": ["poultry", "redMeat", "bacon", "processedMeat"], // Hebrew

  // --- DRINKS ---
  "drink": ["coffee", "tea", "softDrinkJuice", "water", "wine", "beer", "cocktail"],
  "drinks": ["coffee", "tea", "softDrinkJuice", "water", "wine", "beer", "cocktail"],
  "напиток": ["coffee", "tea", "softDrinkJuice", "water", "wine", "beer", "cocktail"], // Russian
  "напитки": ["coffee", "tea", "softDrinkJuice", "water", "wine", "beer", "cocktail"],
  "משקה": ["coffee", "tea", "softDrinkJuice", "water", "wine", "beer", "cocktail"], // Hebrew
  "משקאות": ["coffee", "tea", "softDrinkJuice", "water", "wine", "beer", "cocktail"],

  // --- DAIRY ---
  "dairy": ["milk", "cheese", "butter", "yogurt"],
  "молочные продукты": ["milk", "cheese", "butter", "yogurt"], // Russian
  "מוצרי חלב": ["milk", "cheese", "butter", "yogurt"], // Hebrew
};