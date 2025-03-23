// utils/iconUtils.ts
// const API_KEY = "your_api_key"; // Replace with your actual API key
const API_ENDPOINT = "https://www.themealdb.com/api/json/v1/1/search.php?s=";

export const getFoodIconUrl = async (foodName: string): Promise<string | null> => {
    try {
        const response = await fetch(`${API_ENDPOINT}${foodName}`);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (data.meals && data.meals.length > 0) {
            // Assuming the first meal's image is representative
            return data.meals[0].strMealThumb;
        } else {
            // If no meals found, return null or a default icon URL
            return null;
        }
    } catch (error) {
        console.error("Error fetching food icon:", error);
        return null;
    }
};