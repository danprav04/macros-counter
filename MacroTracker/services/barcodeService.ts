// Create this new file: services/barcodeService.ts
import { Food } from '../types/food';

// Define a type for the relevant parts of the Open Food Facts response
interface OpenFoodFactsProduct {
    product_name?: string;
    product_name_en?: string; // Fallback English name
    nutriments: {
        'energy-kcal_100g'?: number;
        proteins_100g?: number;
        carbohydrates_100g?: number;
        fat_100g?: number;
        // Add other potential nutrient fields if needed
    };
}

interface OpenFoodFactsResponse {
    status: number; // 1 for found, 0 for not found
    product?: OpenFoodFactsProduct;
    code: string; // The barcode scanned
    status_verbose: string;
}

// Result type for our function
export type BarcodeScanResult = Partial<Omit<Food, 'id'>> & { name: string }; // Ensure name is always string

const OPENFOODFACTS_API_URL = "https://world.openfoodfacts.org/api/v2/product/";

/**
 * Fetches food data from Open Food Facts using a barcode.
 * Returns null if the product is not found or an error occurs.
 * Returns Partial<Omit<Food, 'id'>> with available data if found.
 */
export const getFoodByBarcode = async (barcode: string): Promise<BarcodeScanResult | null> => {
    const url = `${OPENFOODFACTS_API_URL}${barcode}.json`;
    console.log(`Fetching from OFF: ${url}`);

    try {
        const response = await fetch(url);

        if (!response.ok) {
            // Handle non-2xx HTTP errors
            console.error(`OFF API request failed with status: ${response.status}`);
            // Consider specific handling for 404 vs other errors if needed
            return null; // Treat non-OK responses as not found or error
        }

        const data: OpenFoodFactsResponse = await response.json();

        // Check if OFF explicitly states the product wasn't found
        if (data.status !== 1 || !data.product) {
            console.log(`Product not found in OFF for barcode: ${barcode} (Status: ${data.status}, Verbose: ${data.status_verbose})`);
            return null;
        }

        const product = data.product;
        const nutriments = product.nutriments || {}; // Ensure nutriments object exists

        // Construct the result, providing defaults (0) for missing numeric values
        const foodData: BarcodeScanResult = {
            name: product.product_name || product.product_name_en || `Product ${barcode}`, // Provide a fallback name
            calories: nutriments['energy-kcal_100g'] ?? 0,
            protein: nutriments.proteins_100g ?? 0,
            carbs: nutriments.carbohydrates_100g ?? 0,
            fat: nutriments.fat_100g ?? 0,
        };

        console.log("OFF Data Found:", foodData);
        return foodData;

    } catch (error) {
        console.error(`Error fetching or parsing data from OFF for barcode ${barcode}:`, error);
        // Handle network errors, JSON parsing errors, etc.
        return null;
    }
};