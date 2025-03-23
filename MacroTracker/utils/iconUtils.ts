const API_KEY = '25170800-59d7530d1a73abe661796e093'; // Sign up at https://pixabay.com/ to get a free API key
const API_ENDPOINT = "https://pixabay.com/api/";

export const getFoodIconUrl = async (foodName: string): Promise<string | null> => {
  try {
    // Modify the query to include terms that emphasize minimalistic icons
    const query = encodeURIComponent(`${foodName} minimal icon`);
const url = `${API_ENDPOINT}?key=${API_KEY}&q=${query}&image_type=illustration&category=food&safesearch=true`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.hits && data.hits.length > 0) {
      return data.hits[0].webformatURL;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching food icon:", error);
    return null;
  }
};
