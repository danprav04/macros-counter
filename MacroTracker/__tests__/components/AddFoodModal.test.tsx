// __tests__/components/AddFoodModal.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider, createTheme } from '@rneui/themed';
import AddFoodModal from '../../src/components/AddFoodModal';
import * as macrosUtil from '../../src/utils/macros';
import * as ImagePicker from 'expo-image-picker';
import { lightThemeColors } from '../../src/navigation/AppNavigator';
import { Alert } from 'react-native';

jest.mock('react-native-get-random-values', () => ({
    getRandomBase64: jest.fn(),
}));

jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
  hide: jest.fn(),
}));

jest.mock('../../src/utils/macros');
jest.mock('expo-image-picker');
jest.mock('react-native/Libraries/LayoutAnimation/LayoutAnimation', () => ({
  ...jest.requireActual('react-native/Libraries/LayoutAnimation/LayoutAnimation'),
  configureNext: jest.fn(),
}));

const theme = createTheme({
    lightColors: lightThemeColors,
    darkColors: {},
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('AddFoodModal', () => {
    const mockProps = {
        isVisible: true,
        toggleOverlay: jest.fn(),
        newFood: { name: '', calories: 0, protein: 0, carbs: 0, fat: 0 },
        editFood: null,
        errors: {},
        handleInputChange: jest.fn(),
        handleCreateFood: jest.fn(),
        handleUpdateFood: jest.fn(),
        validateFood: jest.fn(),
        setErrors: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock t function for this test suite
        jest.spyOn(require('../../src/localization/i18n'), 't').mockImplementation((...args: any[]): string => {
            const key = args[0];
            if (key === 'addFoodModal.buttonAdd') return 'Add';
            if (key === 'foodListScreen.fixErrors') return 'Please fix errors';
            if (key === 'addFoodModal.aiAssist') return 'AI Assist';
            if (key === 'addFoodModal.ingredientsPlaceholder') return 'e.g., 100g Chicken Breast, 50g Rice, 1 tbsp Olive Oil';
            if (key === 'addEntryModal.gallery') return 'Gallery';
            return key;
        });
    });

    it('renders manual input form by default', () => {
        const { getByText, getByLabelText } = render(<AddFoodModal {...mockProps} />, { wrapper: TestWrapper });
        expect(getByText('Add New Food')).toBeTruthy();
        expect(getByLabelText('foodFormFields.foodName')).toBeTruthy();
    });

    it('shows validation errors and does not submit when invalid', async () => {
        // Setup: Mock validateFood to return errors
        mockProps.validateFood.mockReturnValue({ name: 'Name is required' });

        const { getByText } = render(<AddFoodModal {...mockProps} />, { wrapper: TestWrapper });
        fireEvent.press(getByText('Add'));

        await waitFor(() => {
            // Check that setErrors was called with the validation result
            expect(mockProps.setErrors).toHaveBeenCalledWith({ name: 'Name is required' });
            // Check that the submission handler was NOT called
            expect(mockProps.handleCreateFood).not.toHaveBeenCalled();
            // Check that the error toast was shown
            expect(require('react-native-toast-message').show).toHaveBeenCalledWith(expect.objectContaining({
                type: 'error',
                text1: 'Please fix errors'
            }));
        });
    });

    it('switches to AI mode and shows AI inputs', () => {
        const { getByText, getByPlaceholderText } = render(<AddFoodModal {...mockProps} />, { wrapper: TestWrapper });
        fireEvent.press(getByText('AI Assist'));
        expect(getByPlaceholderText('e.g., 100g Chicken Breast, 50g Rice, 1 tbsp Olive Oil')).toBeTruthy();
        expect(getByText('Analyze Text')).toBeTruthy();
        expect(getByText('Analyze from Image')).toBeTruthy();
    });

    it('calls getMacrosFromText when analyzing text', async () => {
        const { getByText, getByPlaceholderText } = render(<AddFoodModal {...mockProps} />, { wrapper: TestWrapper });

        fireEvent.press(getByText('AI Assist'));
        fireEvent.changeText(getByPlaceholderText('e.g., 100g Chicken Breast, 50g Rice, 1 tbsp Olive Oil'), 'some ingredients');
        fireEvent.press(getByText('Analyze Text'));

        await waitFor(() => expect(macrosUtil.getMacrosFromText).toHaveBeenCalledWith(mockProps.newFood.name, 'some ingredients'));
    });

    it('calls getMacrosForImageFile when analyzing an image', async () => {
        const mockedLaunchImageLibraryAsync = ImagePicker.launchImageLibraryAsync as jest.Mock;
        mockedLaunchImageLibraryAsync.mockResolvedValue({
            canceled: false,
            assets: [{ uri: 'test-uri', width: 100, height: 100 }],
        });

        // Mock Alert.alert to immediately "press" the "Gallery" button
        jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
            const galleryButton = buttons?.find(b => b.text === 'Gallery');
            if (galleryButton?.onPress) {
                galleryButton.onPress();
            }
        });
        
        const { getByText } = render(<AddFoodModal {...mockProps} />, { wrapper: TestWrapper });

        fireEvent.press(getByText('AI Assist'));
        fireEvent.press(getByText('Analyze from Image'));

        await waitFor(() => {
             expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
        });
        
        await waitFor(() => {
             expect(macrosUtil.getMacrosForImageFile).toHaveBeenCalled();
        });
    });
});