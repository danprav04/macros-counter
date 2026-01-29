# MacrosVisionAI 🍎

An intelligent calorie and macro tracker that uses AI to simplify food logging. Snap a photo or describe your meal, and let the AI do the rest.

![License](https://img.shields.io/badge/license-Proprietary-red.svg)![React Native](https://img.shields.io/badge/React_Native-0.76.7-61DAFB?logo=react)![Expo](https://img.shields.io/badge/Expo-52-black?logo=expo)![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue?logo=typescript)

---

## ▶️ About The Project

MacrosVisionAI is a cross-platform mobile application built with React Native and Expo. It goes beyond traditional macro trackers by leveraging AI to analyze meals from images and text, making logging faster and more intuitive. It's designed for users who want a detailed and effortless way to monitor their dietary intake, complete with nutritional feedback and progress tracking.

The app is fully offline-first for core data (daily entries, food library), while leveraging a backend service for its AI-powered features.

## 📱 Screenshots

<div align="center">
  <img src="https://github.com/user-attachments/assets/f8c1abca-5e20-4668-b96b-2979ef947423" alt="Home Screen - Daily Overview" width="189" height="422" />
  <img src="https://github.com/user-attachments/assets/5479b752-2236-4072-93a1-d1a3a63b6dae" alt="Statistics & Charts" width="189" height="422" />
  <img src="https://github.com/user-attachments/assets/f8f8ba8b-c4da-4c57-9f85-04ceae1300a3" alt="Settings - Account" width="189" height="422" />
  <img src="https://github.com/user-attachments/assets/9f50201a-bb07-45c3-a712-791487bbe548" alt="Settings - Goals & Statistics" width="189" height="422" />
  <img src="https://github.com/user-attachments/assets/91b4e584-ce4d-40f8-be29-ba82975d3094" alt="Food Library" width="189" height="422" />
</div>

---

## ✨ Key Features

*   📸 **AI Vision Analysis:** Snap a photo of your meal to automatically identify multiple food items, estimate their weights, and log their macros.
*   ✍️ **AI Text Analysis:** Simply describe your meal in plain text (e.g., "a bowl of oatmeal with blueberries and a coffee") to get a full macro breakdown.
*   🍎 **Smart Food Grading:** Every food item and daily entry receives a nutritional grade from A (best) to F (worst) based on its macronutrient profile and calorie density, helping you make healthier choices.
*   🚀 **Dynamic Icon System:** Food items are automatically assigned relevant emoji icons based on their name, with support for multiple languages (English, Russian, Hebrew).
*   📊 **Detailed Statistics:** Track your intake of calories, protein, carbs, and fat over time with interactive, filterable charts.
*   🌍 **Multi-Language Support:** The entire UI is localized for English, Russian, and Hebrew, including right-to-left (RTL) layout support.
*   🎨 **Dynamic Theming:** Seamlessly switch between Light, Dark, and System-default themes for a comfortable user experience.
*   💾 **Full Data Portability:** Users can export their entire application data (entries, foods, settings) to a single JSON file and import it back at any time.
*   📝 **Comprehensive Food Library:** Manage a personal library of food items with full CRUD (Create, Read, Update, Delete) functionality.
*   🎯 **Customizable Goals:** Set and adjust daily goals for all major macronutrients. A built-in questionnaire can estimate your needs based on your biometrics and activity level.
*   🔗 **Deep Linking:** Share food items with others via a web link, which opens the app and pre-fills the "Add Food" modal with the shared data.

---

## 🛠️ Tech Stack & Architecture

This project is built with a modern React Native stack, emphasizing type safety, scalability, and a clean separation of concerns.

| Category                | Technology                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Core Framework**      | [React Native](https://reactnative.dev/), [Expo](https://expo.dev/)                                          |
| **Language**            | [TypeScript](https://www.typescriptlang.org/)                                                               |
| **Navigation**          | [React Navigation](https://reactnavigation.org/) (Bottom Tabs, Native Stack)                                |
| **UI Toolkit**          | [React Native Elements (RNEUI)](https://reactnativeelements.com/)                                             |
| **State Management**    | React Context API (for Auth & Settings), Component State (`useState`, `useReducer`)                           |
| **Localization**        | [i18n-js](https://github.com/fnando/i18n-js), [expo-localization](https://docs.expo.dev/versions/latest/sdk/localization/) |
| **Data Storage**        | [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) for local persistence.          |
| **Charts & Graphics**   | [uPlot](https://github.com/leeoniya/uPlot) via WebView, [react-native-svg](https://github.com/react-native-svg/react-native-svg) |
| **Utilities**           | [date-fns](https://date-fns.org/), [expo-image-picker](https://docs.expo.dev/versions/latest/sdk/image-picker/), [expo-image-manipulator](https://docs.expo.dev/versions/latest/sdk/image-manipulator/) |

### Project Structure

The codebase is organized into logical domains within the `src/` directory:

```
src/
├── assets/             # Static assets like fonts and icon definitions
├── components/         # Reusable React components used across screens
├── context/            # Global state management (e.g., AuthContext)
├── localization/       # i18n setup and language JSON files
├── navigation/         # Navigators and screen definitions
├── screens/            # Top-level screen components
├── services/           # Modules for interacting with storage and APIs
├── types/              # TypeScript type definitions
└── utils/              # Helper functions and business logic
```

---

## ⚙️ Core Functionality Deep Dive

#### 1. AI-Powered Food Logging

-   The "Quick Add" feature is the heart of the app's intelligence.
-   **Image Analysis (`macros_image_multiple`):** When a user uploads an image, it's compressed via `imageUtils.ts` and sent to the backend. The `backendService.ts` handles the API call, which returns a list of `EstimatedFoodItem` objects.
-   **Text Analysis (`macros_text_multiple`):** A similar flow occurs for text input, allowing for rapid logging without searching.
-   The `AddEntryModal.tsx` component orchestrates this flow, displaying the results in the `QuickAddList.tsx` component for user confirmation and editing.

#### 2. Food Grading System

-   The `gradingUtils.ts` file contains the logic for the A-F grading system.
-   `calculateBaseFoodGrade` provides a score for a food per 100g based on its calorie density and macronutrient balance.
-   `calculateDailyEntryGrade` takes the base grade and adjusts it based on the *portion size* relative to the user's daily goals, providing contextual feedback. For example, a large portion of an "A" grade food might be downgraded if it consumes a disproportionate amount of the day's calorie budget.

#### 3. Dynamic Icon System

-   To avoid storing a static icon for every food, the app uses a dynamic matching system.
-   `foodIconDefinitions.ts` defines a list of emojis and their associated tag keys.
-   The language JSON files (`en.json`, `ru.json`, `he.json`) contain arrays of keywords for each tag key (e.g., `foodIconTags.apple` -> `["apple", "gala", "fuji", ...]`).
-   When a food is displayed, `languageUtils.ts` first detects the language of the food's name.
-   Then, `foodIconMatcher.ts` finds the best-matching emoji by comparing the food's name against the localized tags, using a scoring and priority system. This makes the system highly extensible.

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

-   Node.js (LTS version recommended)
-   npm or yarn
-   [Expo Go](https://expo.dev/go) app on your iOS or Android device.

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/macros-vision-ai.git
    cd macros-vision-ai
    ```

2.  **Install NPM packages:**
    ```sh
    npm install
    ```
    or
    ```sh
    yarn install
    ```

3.  **Configure Backend URL:**
    The app requires a backend for its AI features. The URL is configured in `app.json` and `eas.json` under the `extra.env` section.
    ```json
    "extra": {
      "eas": { ... },
      "env": {
         "BACKEND_URL_PRODUCTION": "https://your-production-backend.com",
         "BACKEND_URL_DEVELOPMENT": "http://your-local-ip:8000"
      }
    }
    ```
    Update `BACKEND_URL_DEVELOPMENT` to point to your local backend instance.

4.  **Run the application:**
    ```sh
    npm start
    ```
    or
    ```sh
    expo start
    ```    This will start the Metro bundler. Scan the QR code with the Expo Go app on your phone.

---

## 📜 License

Distributed under the 0BSD License. See `package.json` for more information.

