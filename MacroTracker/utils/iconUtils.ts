const API_KEY = '25170800-59d7530d1a73abe661796e093'; // Sign up at https://pixabay.com/ to get a free API key
const API_ENDPOINT = "https://pixabay.com/api/";

export const getFoodIconUrl = async (foodName: string): Promise<string | null> => {
  try {
    // Include additional keywords to target minimal icons with transparent backgrounds.
    const query = encodeURIComponent(`${foodName} minimal icon transparent`);
    // Request vector images to increase chance of having a transparent background.
    const url = `${API_ENDPOINT}?key=${API_KEY}&q=${query}&image_type=vector&category=food&safesearch=true`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.hits && data.hits.length > 0) {
      // Filter results to select only images with a likely transparent background.
      // For example, check if the URL ends with .png (or contains 'svg' if available).
      const filtered = data.hits.filter((hit: any) => {
        const url: string = hit.webformatURL.toLowerCase();
        // Check for common formats and maybe even keywords in tags/description if available
        return (url.endsWith('.png') || url.includes('svg')) && hit.tags?.toLowerCase().includes(foodName.toLowerCase());
      });
      
      // If a filtered image exists, return the first one; otherwise, return null.
      if (filtered.length > 0) {
        return filtered[0].webformatURL;
      } else {
        // No hit meets the filter criteria, so return null instead of a random image.
        return null;
      }
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching food icon:", error);
    return null;
  }
};
