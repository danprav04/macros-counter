// __tests__/services/tokenStorage.test.ts
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { saveToken, getToken, deleteToken } from "services/tokenStorage";
import { Token } from "types/token";

jest.mock("expo-secure-store");
jest.mock("@react-native-async-storage/async-storage");

const mockToken: Token = {
  access_token: "abc",
  refresh_token: "xyz",
  token_type: "bearer",
};
const mockTokenJson = JSON.stringify(mockToken);

describe("tokenStorage", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("when in Expo Go", () => {
    beforeAll(() => {
      // @ts-ignore
      Constants.appOwnership = "expo";
    });

    it("should use AsyncStorage to save a token", async () => {
      await saveToken(mockToken);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.any(String),
        mockTokenJson
      );
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it("should use AsyncStorage to get a token", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockTokenJson);
      const token = await getToken();
      expect(token).toEqual(mockToken);
      expect(AsyncStorage.getItem).toHaveBeenCalled();
      expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    });

    it("should use AsyncStorage to delete a token", async () => {
      await deleteToken();
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
      expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    });
  });

  describe("when in a standalone build", () => {
    beforeAll(() => {
      // @ts-ignore
      Constants.appOwnership = "standalone";
    });

    it("should use SecureStore to save a token", async () => {
      await saveToken(mockToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        expect.any(String),
        mockTokenJson
      );
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it("should use SecureStore to get a token", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockTokenJson);
      const token = await getToken();
      expect(token).toEqual(mockToken);
      expect(SecureStore.getItemAsync).toHaveBeenCalled();
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });

    it("should use SecureStore to delete a token", async () => {
      await deleteToken();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    beforeAll(() => {
      // Temporarily override the mock for this describe block
      jest.doMock("expo-constants", () => ({
        ...jest.requireActual("expo-constants"),
        expoConfig: {
          extra: {},
          appOwnership: "expo", // Simulate running in Expo Go
        },
      }));
    });

    afterAll(() => {
      jest.unmock("expo-constants"); // Restore original mock
    });

    it("should return null if no token is found", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const token = await getToken();
      expect(token).toBeNull();
    });

    it("should return null and delete corrupted token", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("{not-json");
      const token = await getToken();
      expect(token).toBeNull();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    });
  });
});
