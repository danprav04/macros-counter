const API_KEY = '25170800-59d7530d1a73abe661796e093'; // Sign up at https://pixabay.com/ to get a free API key
const API_ENDPOINT = "https://pixabay.com/api/";

export const getFoodIconUrl = async (foodName: string): Promise<string | null> => {
  try {
    // URL encode the query to support non-English characters as well
    const query = encodeURIComponent(foodName);
    // Optionally, you can add parameters to filter for illustrations if you prefer icons:
    // e.g., image_type=photo or image_type=illustration
    const url = `${API_ENDPOINT}?key=${API_KEY}&q=${query}&image_type=photo`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    // Pick the first image from the results
    if (data.hits && data.hits.length > 0) {
      return data.hits[0].webformatURL; // or choose another size based on your needs
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching food icon:", error);
    return null;
  }
};
