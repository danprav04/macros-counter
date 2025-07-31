// __tests__/components/AddFoodModal.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider, createTheme } from '@rneui/themed';
import AddFoodModal from 'components/AddFoodModal';
import * as macrosUtil from 'utils/macros';
import * as imagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

jest.mock('utils/macros');
jest.mock('expo-image-picker');
jest.spyOn(Alert, 'alert');

const theme = createTheme();
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const mockedGetMacrosFromText = macrosUtil.getMacrosFromText as jest.Mock;
const mockedGetMacrosForImageFile = macrosUtil.getMacrosForImageFile as jest.Mock;
const mockedLaunchImageLibraryAsync = imagePicker.launchImageLibraryAsync as jest.Mock;


const mockProps = {
  isVisible: true,
  toggleOverlay: jest.fn(),
  newFood: { name: "", calories: 0, protein: 0, carbs: 0, fat: 0 },
  editFood: null,
  errors: {},
  handleInputChange: jest.fn(),
  handleCreateFood: jest.fn().mockResolvedValue(undefined),
  handleUpdateFood: jest.fn().mockResolvedValue(undefined),
  validateFood: jest.fn().mockReturnValue(null),
  setErrors: jest.fn(),
};

describe('AddFoodModal', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly in "Add New" mode', () => {
        const { getByText } = render(<AddFoodModal {...mockProps} />, { wrapper: TestWrapper });
        expect(getByText('Add New Food')).toBeTruthy();
        expect(getByText('Manual Input')).toBeTruthy();
        expect(getByText('AI Assist')).toBeTruthy();
    });

    it('renders correctly in "Edit" mode', () => {
        const { getByText, queryByText } = render(
            <AddFoodModal {...mockProps} editFood={{ id: '1', name: 'Apple', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, createdAt: '' }} />, 
            { wrapper: TestWrapper }
        );
        expect(getByText('Edit Food')).toBeTruthy();
        expect(queryByText('AI Assist')).toBeNull(); // AI mode switcher is hidden on edit
    });

    it('calls handleCreateFood on submit when valid', async () => {
        mockProps.validateFood.mockReturnValueOnce(null); // Form is valid
        const { getByText } = render(<AddFoodModal {...mockProps} />, { wrapper: TestWrapper });

        fireEvent.press(getByText('Add'));
        await waitFor(() => expect(mockProps.handleCreateFood).toHaveBeenCalled());
    });
    
    it('shows validation errors and does not submit when invalid', async () => {
        mockProps.validateFood.mockReturnValueOnce({ name: 'Name is required' });
        const { getByText } = render(<AddFoodModal {...mockProps} setErrors={mockProps.validateFood} />, { wrapper: TestWrapper });
        
        fireEvent.press(getByText('Add'));
        
        await waitFor(() => {
            expect(mockProps.handleCreateFood).not.toHaveBeenCalled();
            expect(getByText('Please fix errors')).toBeTruthy();
        });
    });

    it('switches to AI mode and shows AI inputs', () => {
        const { getByText, getByPlaceholderText } = render(<AddFoodModal {...mockProps} />, { wrapper: TestWrapper });
        fireEvent.press(getByText('AI Assist'));
        expect(getByPlaceholderText(/e.g.,\n100g Chicken Breast/)).toBeTruthy();
        expect(getByText('Analyze Text')).toBeTruthy();
        expect(getByText('Analyze from Image')).toBeTruthy();
    });

    it('calls getMacrosFromText when analyzing text', async () => {
        mockedGetMacrosFromText.mockResolvedValue({ foodName: 'Analyzed Food', calories: 200, protein: 20, carbs: 10, fat: 5 });
        const { getByText, getByPlaceholderText } = render(<AddFoodModal {...mockProps} />, { wrapper: TestWrapper });
        
        fireEvent.press(getByText('AI Assist'));
        fireEvent.changeText(getByPlaceholderText(/e.g.,\n100g Chicken Breast/), 'some ingredients');
        fireEvent.press(getByText('Analyze Text'));

        await waitFor(() => expect(macrosUtil.getMacrosFromText).toHaveBeenCalled());
        expect(mockProps.handleInputChange).toHaveBeenCalledWith('name', 'Analyzed Food', false);
    });

    it('calls getMacrosForImageFile when analyzing an image', async () => {
        mockedLaunchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'test-uri', width: 100, height: 100, type: 'image' }] });
        mockedGetMacrosForImageFile.mockResolvedValue({ foodName: 'Image Food', calories: 300, protein: 15, carbs: 25, fat: 12 });
        
        const { getByText } = render(<AddFoodModal {...mockProps} />, { wrapper: TestWrapper });

        fireEvent.press(getByText('AI Assist'));
        fireEvent.press(getByText('Analyze from Image'));

        // The alert to choose camera/gallery appears
        // In test, we can assume 'Gallery' is pressed and test the subsequent logic
        await waitFor(() => {
             // Let's assume the user picks an image from the gallery
            expect(imagePicker.launchImageLibraryAsync).toHaveBeenCalled();
        });

        // After the mocked image picker returns, the analysis should run
        await waitFor(() => {
            expect(macrosUtil.getMacrosForImageFile).toHaveBeenCalled();
            expect(mockProps.handleInputChange).toHaveBeenCalledWith('name', 'Image Food', false);
        });
    });
});