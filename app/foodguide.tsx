import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Platform, LayoutChangeEvent, Dimensions, LayoutAnimation,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useGlucoseStore } from '../store/glucoseStore';
import { calcCorrectionDose, getAnalogByType } from '../utils/insulinUtils';
import { generateId } from '../utils/idUtils';
import { useTheme } from '../context/AppContext';
import { PressBtn } from '../components/PressBtn';
import { useTranslation } from '../hooks/useTranslation';

const RED = '#EC5557';

type FoodAction = 'lower' | 'maintain' | 'raise' | '';
type ActiveTab  = 'planner' | 'history';

interface FoodItem {
  name: string; carbs: number; sugars: number; fiber: number;
  protein: number; fat: number; kcal: number; gi: number; sodium: number; potassium: number;
}
interface MealItem extends FoodItem { uniqueId: string; quantity: number }
interface SavedMeal {
  id: string; date: string; action: FoodAction; items: FoodItem[];
  totals: NutrientTotals; estimatedGlycemia: number | null;
  currentGlucose: number | null; unit: string;
}
interface NutrientTotals {
  carbs: number; sugars: number; fiber: number; protein: number;
  fat: number; kcal: number; sodium: number; potassium: number;
}

// ─── Food Database ─────────────────────────────────────────────────────────────
const foodDatabase: Record<string, Record<string, FoodItem[]>> = {
  raise: {
    Drinks: [
      { name: 'Orange Juice (200ml)',        carbs: 22, sugars: 20, fiber: 0.5, protein: 1.7, fat: 0.3, kcal: 85,  gi: 50, sodium: 2,   potassium: 400 },
      { name: 'Apple Juice (200ml)',         carbs: 24, sugars: 22, fiber: 0.2, protein: 0.2, fat: 0.1, kcal: 96,  gi: 44, sodium: 10,  potassium: 250 },
      { name: 'Grape Juice (200ml)',         carbs: 36, sugars: 34, fiber: 0.2, protein: 0.5, fat: 0.1, kcal: 150, gi: 55, sodium: 10,  potassium: 200 },
      { name: 'Pineapple Juice (200ml)',     carbs: 26, sugars: 24, fiber: 0.5, protein: 0.5, fat: 0.2, kcal: 110, gi: 58, sodium: 2,   potassium: 300 },
      { name: 'Gatorade (250ml)',            carbs: 14, sugars: 14, fiber: 0,   protein: 0,   fat: 0,   kcal: 56,  gi: 78, sodium: 160, potassium: 45  },
      { name: 'Whole Milk (200ml)',          carbs: 10, sugars: 10, fiber: 0,   protein: 7,   fat: 8,   kcal: 150, gi: 41, sodium: 120, potassium: 380 },
      { name: 'Chocolate Milk (200ml)',      carbs: 26, sugars: 24, fiber: 1,   protein: 8,   fat: 5,   kcal: 180, gi: 45, sodium: 150, potassium: 400 },
      { name: 'Sweetened Iced Tea (250ml)', carbs: 26, sugars: 25, fiber: 0,   protein: 0,   fat: 0,   kcal: 104, gi: 65, sodium: 15,  potassium: 30  },
      { name: 'Lemonade (250ml)',            carbs: 27, sugars: 26, fiber: 0,   protein: 0,   fat: 0,   kcal: 110, gi: 54, sodium: 10,  potassium: 20  },
      { name: 'Energy Drink (250ml)',        carbs: 28, sugars: 27, fiber: 0,   protein: 0,   fat: 0,   kcal: 110, gi: 68, sodium: 200, potassium: 60  },
    ],
    'Grains & Bread': [
      { name: 'White Bread (1 slice)',       carbs: 15, sugars: 2,  fiber: 0.8, protein: 3,   fat: 1,   kcal: 80,  gi: 75, sodium: 150, potassium: 30  },
      { name: 'White Rice (100g cooked)',    carbs: 28, sugars: 0,  fiber: 0.4, protein: 2.7, fat: 0.3, kcal: 130, gi: 70, sodium: 1,   potassium: 35  },
      { name: 'Bagel (1 medium)',            carbs: 50, sugars: 6,  fiber: 2,   protein: 10,  fat: 1,   kcal: 250, gi: 72, sodium: 400, potassium: 100 },
      { name: 'Cornflakes (30g)',            carbs: 26, sugars: 3,  fiber: 1,   protein: 2,   fat: 0.2, kcal: 110, gi: 81, sodium: 290, potassium: 35  },
      { name: 'Instant Oatmeal (1 packet)', carbs: 32, sugars: 12, fiber: 3,   protein: 5,   fat: 2,   kcal: 160, gi: 79, sodium: 200, potassium: 120 },
      { name: 'Croissant (1 medium)',        carbs: 26, sugars: 6,  fiber: 1.5, protein: 5,   fat: 12,  kcal: 230, gi: 67, sodium: 350, potassium: 70  },
      { name: 'Waffle (1 medium)',           carbs: 25, sugars: 5,  fiber: 1,   protein: 4,   fat: 5,   kcal: 150, gi: 70, sodium: 300, potassium: 80  },
      { name: 'Pancake (1 medium)',          carbs: 22, sugars: 5,  fiber: 1,   protein: 4,   fat: 3,   kcal: 130, gi: 67, sodium: 250, potassium: 90  },
      { name: 'Pasta (100g cooked)',         carbs: 30, sugars: 1,  fiber: 2,   protein: 5,   fat: 1,   kcal: 150, gi: 65, sodium: 5,   potassium: 50  },
      { name: 'Naan (1 piece)',              carbs: 45, sugars: 4,  fiber: 2,   protein: 9,   fat: 6,   kcal: 260, gi: 71, sodium: 480, potassium: 100 },
    ],
    'Cooked Foods': [
      { name: 'Mashed Potato (100g)',        carbs: 17, sugars: 1,  fiber: 1.5, protein: 2,   fat: 4,   kcal: 110, gi: 85, sodium: 300, potassium: 300 },
      { name: 'French Fries (100g)',         carbs: 35, sugars: 0,  fiber: 3,   protein: 3,   fat: 15,  kcal: 270, gi: 75, sodium: 200, potassium: 400 },
      { name: 'Baked Potato (1 medium)',     carbs: 37, sugars: 2,  fiber: 4,   protein: 4,   fat: 0.2, kcal: 160, gi: 82, sodium: 10,  potassium: 900 },
      { name: 'Pizza (1 slice)',             carbs: 36, sugars: 4,  fiber: 2,   protein: 12,  fat: 10,  kcal: 285, gi: 60, sodium: 640, potassium: 200 },
      { name: 'Fried Rice (100g)',           carbs: 28, sugars: 1,  fiber: 1,   protein: 4,   fat: 4,   kcal: 165, gi: 68, sodium: 350, potassium: 80  },
    ],
    Snacks: [
      { name: 'Gummy Bears (30g)',           carbs: 24, sugars: 18, fiber: 0,   protein: 2,   fat: 0,   kcal: 104, gi: 78, sodium: 25,  potassium: 0   },
      { name: 'Honey (1 tbsp)',              carbs: 17, sugars: 17, fiber: 0,   protein: 0.1, fat: 0,   kcal: 64,  gi: 58, sodium: 1,   potassium: 10  },
      { name: 'Granola Bar (1 bar)',         carbs: 20, sugars: 10, fiber: 2,   protein: 3,   fat: 5,   kcal: 140, gi: 66, sodium: 80,  potassium: 100 },
      { name: 'Rice Cakes (2 cakes)',        carbs: 28, sugars: 2,  fiber: 1,   protein: 2,   fat: 1,   kcal: 120, gi: 82, sodium: 50,  potassium: 30  },
      { name: 'Fruit Yogurt (100g)',         carbs: 20, sugars: 18, fiber: 0,   protein: 4,   fat: 2,   kcal: 110, gi: 50, sodium: 60,  potassium: 200 },
    ],
    Fruits: [
      { name: 'Banana (1 medium)',           carbs: 27, sugars: 14, fiber: 3,   protein: 1.3, fat: 0.4, kcal: 105, gi: 51, sodium: 1,   potassium: 422 },
      { name: 'Watermelon (150g)',           carbs: 11, sugars: 9,  fiber: 0.6, protein: 0.9, fat: 0.2, kcal: 46,  gi: 72, sodium: 2,   potassium: 170 },
      { name: 'Grapes (100g)',               carbs: 17, sugars: 16, fiber: 0.9, protein: 0.6, fat: 0.2, kcal: 69,  gi: 53, sodium: 2,   potassium: 191 },
      { name: 'Dates (30g, ~3 dates)',       carbs: 22, sugars: 20, fiber: 1.8, protein: 0.7, fat: 0.1, kcal: 83,  gi: 42, sodium: 1,   potassium: 195 },
      { name: 'Mango (100g)',                carbs: 15, sugars: 14, fiber: 1.6, protein: 0.8, fat: 0.4, kcal: 60,  gi: 51, sodium: 1,   potassium: 168 },
    ],
  },
  maintain: {
    Drinks: [
      { name: 'Water (250ml)',                     carbs: 0, sugars: 0,   fiber: 0, protein: 0,   fat: 0,   kcal: 0,  gi: 0,  sodium: 0,   potassium: 0   },
      { name: 'Sparkling Water (250ml)',            carbs: 0, sugars: 0,   fiber: 0, protein: 0,   fat: 0,   kcal: 0,  gi: 0,  sodium: 0,   potassium: 0   },
      { name: 'Black Coffee (250ml)',               carbs: 0, sugars: 0,   fiber: 0, protein: 0.3, fat: 0,   kcal: 2,  gi: 0,  sodium: 5,   potassium: 90  },
      { name: 'Unsweetened Tea (250ml)',            carbs: 0, sugars: 0,   fiber: 0, protein: 0,   fat: 0,   kcal: 0,  gi: 0,  sodium: 5,   potassium: 20  },
      { name: 'Green Tea (250ml)',                  carbs: 0, sugars: 0,   fiber: 0, protein: 0,   fat: 0,   kcal: 0,  gi: 0,  sodium: 0,   potassium: 20  },
      { name: 'Almond Milk unsweetened (200ml)',   carbs: 2, sugars: 0,   fiber: 1, protein: 1,   fat: 3,   kcal: 35, gi: 25, sodium: 150, potassium: 50  },
      { name: 'Kombucha (250ml)',                   carbs: 7, sugars: 4,   fiber: 0, protein: 0,   fat: 0,   kcal: 30, gi: 30, sodium: 10,  potassium: 50  },
    ],
    'Proteins & Dairy': [
      { name: 'Grilled Chicken (100g)',   carbs: 0,   sugars: 0,   fiber: 0, protein: 25,  fat: 3,   kcal: 165, gi: 0,  sodium: 70,  potassium: 300 },
      { name: 'Baked Salmon (100g)',      carbs: 0,   sugars: 0,   fiber: 0, protein: 20,  fat: 13,  kcal: 208, gi: 0,  sodium: 60,  potassium: 380 },
      { name: 'Tuna in water (100g)',     carbs: 0,   sugars: 0,   fiber: 0, protein: 25,  fat: 1,   kcal: 116, gi: 0,  sodium: 300, potassium: 280 },
      { name: 'Turkey Breast (100g)',     carbs: 0,   sugars: 0,   fiber: 0, protein: 24,  fat: 2,   kcal: 135, gi: 0,  sodium: 60,  potassium: 300 },
      { name: 'Lean Beef (100g)',         carbs: 0,   sugars: 0,   fiber: 0, protein: 26,  fat: 8,   kcal: 180, gi: 0,  sodium: 70,  potassium: 350 },
      { name: 'Egg (1 large)',            carbs: 0.6, sugars: 0.6, fiber: 0, protein: 6,   fat: 5,   kcal: 70,  gi: 0,  sodium: 70,  potassium: 70  },
      { name: 'Tofu firm (100g)',         carbs: 2,   sugars: 0,   fiber: 1, protein: 8,   fat: 4,   kcal: 80,  gi: 15, sodium: 10,  potassium: 150 },
      { name: 'Greek Yogurt plain (100g)',carbs: 3,   sugars: 3,   fiber: 0, protein: 10,  fat: 0.4, kcal: 59,  gi: 35, sodium: 36,  potassium: 141 },
      { name: 'Cottage Cheese (100g)',    carbs: 3,   sugars: 3,   fiber: 0, protein: 11,  fat: 4,   kcal: 100, gi: 30, sodium: 400, potassium: 100 },
      { name: 'Shrimp cooked (100g)',     carbs: 0.9, sugars: 0,   fiber: 0, protein: 20,  fat: 1.7, kcal: 99,  gi: 0,  sodium: 190, potassium: 180 },
    ],
    'Grains & Legumes': [
      { name: 'Quinoa (100g cooked)',        carbs: 21, sugars: 1, fiber: 2.8, protein: 4.4, fat: 1.9, kcal: 120, gi: 53, sodium: 7,   potassium: 172 },
      { name: 'Brown Rice (100g cooked)',    carbs: 23, sugars: 0, fiber: 2,   protein: 3,   fat: 1,   kcal: 110, gi: 50, sodium: 5,   potassium: 85  },
      { name: 'Oats rolled (50g dry)',       carbs: 27, sugars: 1, fiber: 4,   protein: 5,   fat: 3,   kcal: 150, gi: 55, sodium: 1,   potassium: 150 },
      { name: 'Whole Wheat Bread (1 slice)', carbs: 12, sugars: 2, fiber: 2,   protein: 4,   fat: 1,   kcal: 80,  gi: 60, sodium: 150, potassium: 70  },
      { name: 'Lentils (100g cooked)',       carbs: 20, sugars: 2, fiber: 8,   protein: 9,   fat: 0,   kcal: 120, gi: 30, sodium: 5,   potassium: 350 },
      { name: 'Chickpeas (100g cooked)',     carbs: 20, sugars: 3, fiber: 6,   protein: 8,   fat: 2,   kcal: 130, gi: 28, sodium: 10,  potassium: 250 },
      { name: 'Sweet Potato (100g cooked)', carbs: 20, sugars: 6, fiber: 3,   protein: 2,   fat: 0,   kcal: 90,  gi: 54, sodium: 40,  potassium: 350 },
      { name: 'Barley (100g cooked)',        carbs: 28, sugars: 0, fiber: 4,   protein: 2.3, fat: 0.4, kcal: 123, gi: 25, sodium: 3,   potassium: 110 },
    ],
    Vegetables: [
      { name: 'Broccoli (100g)',  carbs: 4, sugars: 1,   fiber: 2.6, protein: 2.8, fat: 0.4, kcal: 34, gi: 10, sodium: 33, potassium: 316 },
      { name: 'Spinach (100g)',   carbs: 1, sugars: 0,   fiber: 2.2, protein: 2.9, fat: 0.4, kcal: 23, gi: 15, sodium: 79, potassium: 558 },
      { name: 'Bell Pepper (100g)',carbs: 4, sugars: 2,  fiber: 1.5, protein: 1,   fat: 0,   kcal: 20, gi: 15, sodium: 3,  potassium: 200 },
      { name: 'Zucchini (100g)',  carbs: 3, sugars: 2.5, fiber: 1,   protein: 1.2, fat: 0.2, kcal: 17, gi: 15, sodium: 8,  potassium: 261 },
      { name: 'Mushrooms (100g)', carbs: 2, sugars: 1,   fiber: 1,   protein: 3.1, fat: 0.3, kcal: 22, gi: 10, sodium: 5,  potassium: 318 },
    ],
    Snacks: [
      { name: 'Almonds (30g)',        carbs: 6,   sugars: 1,   fiber: 3, protein: 6,   fat: 14, kcal: 170, gi: 15, sodium: 0,   potassium: 200 },
      { name: 'Walnuts (30g)',        carbs: 4,   sugars: 0.7, fiber: 2, protein: 4.3, fat: 18, kcal: 185, gi: 15, sodium: 1,   potassium: 125 },
      { name: 'Hummus (2 tbsp)',      carbs: 5,   sugars: 0,   fiber: 2, protein: 2,   fat: 5,  kcal: 70,  gi: 10, sodium: 120, potassium: 100 },
      { name: 'Hard-Boiled Egg',      carbs: 0.6, sugars: 0.6, fiber: 0, protein: 6,   fat: 5,  kcal: 70,  gi: 0,  sodium: 70,  potassium: 70  },
      { name: 'Dark Chocolate (20g)', carbs: 12,  sugars: 8,   fiber: 2, protein: 2,   fat: 7,  kcal: 110, gi: 23, sodium: 5,   potassium: 150 },
    ],
  },
  lower: {
    Drinks: [
      { name: 'Water (250ml)',                       carbs: 0, sugars: 0, fiber: 0, protein: 0, fat: 0, kcal: 0, gi: 0, sodium: 0, potassium: 0  },
      { name: 'Green Tea (250ml)',                   carbs: 0, sugars: 0, fiber: 0, protein: 0, fat: 0, kcal: 0, gi: 0, sodium: 0, potassium: 20 },
      { name: 'Matcha Tea (250ml)',                  carbs: 0, sugars: 0, fiber: 0, protein: 1, fat: 0, kcal: 5, gi: 0, sodium: 0, potassium: 30 },
      { name: 'Cinnamon Tea (250ml)',                carbs: 0, sugars: 0, fiber: 0, protein: 0, fat: 0, kcal: 0, gi: 0, sodium: 0, potassium: 10 },
      { name: 'Ginger Tea (250ml)',                  carbs: 0, sugars: 0, fiber: 0, protein: 0, fat: 0, kcal: 0, gi: 0, sodium: 0, potassium: 10 },
      { name: 'Apple Cider Vinegar (1 tbsp + water)',carbs: 0, sugars: 0, fiber: 0, protein: 0, fat: 0, kcal: 1, gi: 0, sodium: 0, potassium: 15 },
      { name: 'Chamomile Tea (250ml)',               carbs: 0, sugars: 0, fiber: 0, protein: 0, fat: 0, kcal: 0, gi: 0, sodium: 0, potassium: 0  },
      { name: 'Peppermint Tea (250ml)',              carbs: 0, sugars: 0, fiber: 0, protein: 0, fat: 0, kcal: 0, gi: 0, sodium: 0, potassium: 0  },
    ],
    'Non-Starchy Vegetables': [
      { name: 'Broccoli (100g)',    carbs: 4, sugars: 1,   fiber: 2.6, protein: 2.8, fat: 0.4, kcal: 34, gi: 10, sodium: 33, potassium: 316 },
      { name: 'Spinach (100g)',     carbs: 1, sugars: 0,   fiber: 2.2, protein: 2.9, fat: 0.4, kcal: 23, gi: 15, sodium: 79, potassium: 558 },
      { name: 'Cauliflower (100g)', carbs: 3, sugars: 1.9, fiber: 2,   protein: 2,   fat: 0.3, kcal: 25, gi: 15, sodium: 30, potassium: 300 },
      { name: 'Zucchini (100g)',    carbs: 3, sugars: 2.5, fiber: 1,   protein: 1.2, fat: 0.2, kcal: 17, gi: 15, sodium: 8,  potassium: 261 },
      { name: 'Mushrooms (100g)',   carbs: 2, sugars: 1,   fiber: 1,   protein: 3.1, fat: 0.3, kcal: 22, gi: 10, sodium: 5,  potassium: 318 },
      { name: 'Asparagus (100g)',   carbs: 3, sugars: 1,   fiber: 2,   protein: 2.2, fat: 0.2, kcal: 20, gi: 15, sodium: 2,  potassium: 200 },
      { name: 'Kale (100g)',        carbs: 4, sugars: 1,   fiber: 2,   protein: 2.9, fat: 0.4, kcal: 35, gi: 15, sodium: 30, potassium: 350 },
      { name: 'Green Beans (100g)', carbs: 4, sugars: 1,   fiber: 2.5, protein: 1.8, fat: 0.1, kcal: 30, gi: 15, sodium: 5,  potassium: 200 },
      { name: 'Cabbage (100g)',     carbs: 3, sugars: 2,   fiber: 2,   protein: 1.3, fat: 0.1, kcal: 25, gi: 10, sodium: 15, potassium: 200 },
      { name: 'Cucumber (100g)',    carbs: 2, sugars: 1,   fiber: 0.5, protein: 0.7, fat: 0.1, kcal: 8,  gi: 10, sodium: 2,  potassium: 150 },
      { name: 'Celery (100g)',      carbs: 3, sugars: 2,   fiber: 1.6, protein: 0.7, fat: 0.2, kcal: 14, gi: 15, sodium: 80, potassium: 260 },
      { name: 'Lettuce (100g)',     carbs: 1, sugars: 0,   fiber: 1,   protein: 1,   fat: 0.2, kcal: 15, gi: 10, sodium: 10, potassium: 200 },
    ],
    'Nuts & Seeds': [
      { name: 'Avocado (half)',          carbs: 6, sugars: 0.3, fiber: 4.6, protein: 1.3, fat: 15,  kcal: 120, gi: 10, sodium: 5,  potassium: 485 },
      { name: 'Walnuts (30g)',           carbs: 4, sugars: 0.7, fiber: 2,   protein: 4.3, fat: 18,  kcal: 185, gi: 15, sodium: 1,  potassium: 125 },
      { name: 'Chia Seeds (10g)',        carbs: 4, sugars: 0,   fiber: 3.4, protein: 1.7, fat: 3,   kcal: 50,  gi: 1,  sodium: 5,  potassium: 115 },
      { name: 'Flaxseeds (10g)',         carbs: 3, sugars: 0.2, fiber: 2.8, protein: 1.8, fat: 4.3, kcal: 55,  gi: 1,  sodium: 5,  potassium: 85  },
      { name: 'Pumpkin Seeds (30g)',     carbs: 5, sugars: 0.5, fiber: 1,   protein: 9,   fat: 13,  kcal: 160, gi: 10, sodium: 5,  potassium: 260 },
      { name: 'Almond Butter (1 tbsp)', carbs: 3, sugars: 1,   fiber: 1,   protein: 3,   fat: 9,   kcal: 100, gi: 10, sodium: 0,  potassium: 120 },
      { name: 'Hemp Seeds (10g)',        carbs: 1, sugars: 0,   fiber: 1,   protein: 3,   fat: 5,   kcal: 55,  gi: 0,  sodium: 0,  potassium: 100 },
    ],
    'Lean Proteins': [
      { name: 'Grilled Chicken (100g)',  carbs: 0,   sugars: 0, fiber: 0, protein: 25,  fat: 3,   kcal: 165, gi: 0,  sodium: 70,  potassium: 300 },
      { name: 'Baked Salmon (100g)',     carbs: 0,   sugars: 0, fiber: 0, protein: 20,  fat: 13,  kcal: 208, gi: 0,  sodium: 60,  potassium: 380 },
      { name: 'Tuna in water (100g)',    carbs: 0,   sugars: 0, fiber: 0, protein: 25,  fat: 1,   kcal: 116, gi: 0,  sodium: 300, potassium: 280 },
      { name: 'Tofu firm (100g)',        carbs: 2,   sugars: 0, fiber: 1, protein: 8,   fat: 4,   kcal: 80,  gi: 15, sodium: 10,  potassium: 150 },
      { name: 'Greek Yogurt plain (100g)',carbs: 3,  sugars: 3, fiber: 0, protein: 10,  fat: 0.4, kcal: 59,  gi: 35, sodium: 36,  potassium: 141 },
    ],
    'Low-GI Fruits': [
      { name: 'Strawberries (100g)', carbs: 8,  sugars: 5,  fiber: 2,   protein: 0.7, fat: 0.3, kcal: 32,  gi: 40, sodium: 1, potassium: 153 },
      { name: 'Blueberries (100g)',  carbs: 14, sugars: 10, fiber: 2.4, protein: 0.7, fat: 0.3, kcal: 57,  gi: 53, sodium: 1, potassium: 77  },
      { name: 'Raspberries (100g)',  carbs: 12, sugars: 4,  fiber: 6.5, protein: 1.2, fat: 0.7, kcal: 52,  gi: 32, sodium: 1, potassium: 151 },
      { name: 'Blackberries (100g)', carbs: 10, sugars: 5,  fiber: 5,   protein: 1.4, fat: 0.5, kcal: 43,  gi: 25, sodium: 1, potassium: 162 },
      { name: 'Apple (1 medium)',    carbs: 25, sugars: 19, fiber: 4.4, protein: 0.5, fat: 0.3, kcal: 95,  gi: 36, sodium: 2, potassium: 195 },
      { name: 'Pear (1 medium)',     carbs: 28, sugars: 17, fiber: 5.5, protein: 0.6, fat: 0.2, kcal: 101, gi: 38, sodium: 2, potassium: 206 },
      { name: 'Grapefruit (half)',   carbs: 13, sugars: 12, fiber: 2,   protein: 0.9, fat: 0.1, kcal: 52,  gi: 25, sodium: 0, potassium: 166 },
      { name: 'Cherries (100g)',     carbs: 16, sugars: 13, fiber: 2.1, protein: 1,   fat: 0.2, kcal: 63,  gi: 22, sodium: 0, potassium: 222 },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNow(): string {
  const now = new Date();
  const dd  = String(now.getDate()).padStart(2, '0');
  const mm  = String(now.getMonth() + 1).padStart(2, '0');
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${dd}/${mm}/${now.getFullYear()} ${time}`;
}

function calcTotals(items: MealItem[]): NutrientTotals {
  return items.reduce((acc, i) => {
    const q = i.quantity ?? 1;
    return {
      carbs:     acc.carbs     + i.carbs     * q,
      sugars:    acc.sugars    + i.sugars    * q,
      fiber:     acc.fiber     + i.fiber     * q,
      protein:   acc.protein   + i.protein   * q,
      fat:       acc.fat       + i.fat       * q,
      kcal:      acc.kcal      + i.kcal      * q,
      sodium:    acc.sodium    + i.sodium    * q,
      potassium: acc.potassium + i.potassium * q,
    };
  }, { carbs: 0, sugars: 0, fiber: 0, protein: 0, fat: 0, kcal: 0, sodium: 0, potassium: 0 });
}

function estimatePostMeal(currentGlucose: number, currentUnit: string, items: MealItem[]): { value: number; unit: string } | null {
  if (items.length === 0) return null;
  const mgDl       = currentUnit === 'mmol/L' ? currentGlucose * 18.0182 : currentGlucose;
  const totalCarbs = items.reduce((s, i) => s + i.carbs * (i.quantity ?? 1), 0);
  const avgGI      = totalCarbs > 0 ? items.reduce((s, i) => s + i.gi * i.carbs * (i.quantity ?? 1), 0) / totalCarbs : 0;
  const estimated  = Math.round(mgDl + totalCarbs * (avgGI / 100) * 10);
  if (currentUnit === 'mmol/L') return { value: parseFloat((estimated / 18).toFixed(1)), unit: 'mmol/L' };
  return { value: estimated, unit: 'mg/dL' };
}

function statusColor(value: number, unit: string, lowMgdL: number, highMgdL: number): string {
  const lo = unit === 'mmol/L' ? lowMgdL  / 18.0182 : lowMgdL;
  const hi = unit === 'mmol/L' ? highMgdL / 18.0182 : highMgdL;
  return value < lo ? '#e53935' : value <= hi ? '#2e7d32' : '#ef6c00';
}

function NutrientGrid({ totals }: { totals: NutrientTotals }) {
  const { colors } = useTheme();
  const t = useTranslation();
  const stats = [
    { label: t.carbs,     value: `${totals.carbs.toFixed(1)}g` },
    { label: t.sugars,    value: `${totals.sugars.toFixed(1)}g` },
    { label: t.fiber,     value: `${totals.fiber.toFixed(1)}g` },
    { label: t.protein,   value: `${totals.protein.toFixed(1)}g` },
    { label: t.fat,       value: `${totals.fat.toFixed(1)}g` },
    { label: t.kcal,      value: `${totals.kcal.toFixed(0)}` },
    { label: t.sodium,    value: `${totals.sodium.toFixed(0)}mg` },
    { label: t.potassium, value: `${totals.potassium.toFixed(0)}mg` },
  ];
  return (
    <View style={s.statsGrid}>
      {stats.map((st) => (
        <View key={st.label} style={s.statItem}>
          <Text style={[s.statNumber, { color: colors.text }]}>{st.value}</Text>
          <Text style={[s.statLabel, { color: colors.textMuted }]}>{st.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FoodGuideScreen() {
  const { glucoseValue, unit, settings, setTotalCarbs } = useGlucoseStore();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const t = useTranslation();

  const [activeTab,      setActiveTab]      = useState<ActiveTab>('planner');
  const [foodAction,     setFoodAction]     = useState<FoodAction>('');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [searchFocused,  setSearchFocused]  = useState(false);
  const [expandedGroup,  setExpandedGroup]  = useState<string | null>(null);
  const [currentMeal,    setCurrentMeal]    = useState<MealItem[]>([]);
  const [savedMeals,     setSavedMeals]     = useState<SavedMeal[]>([]);
  const [expandedMealId,    setExpandedMealId]    = useState<string | null>(null);
  const [localGlucoseInput, setLocalGlucoseInput] = useState('');

  const scrollRef  = useRef<ScrollView>(null);
  const mealYRef   = useRef<number>(0);
  const onMealSectionLayout = (e: LayoutChangeEvent) => { mealYRef.current = e.nativeEvent.layout.y; };

  const totals  = useMemo(() => calcTotals(currentMeal), [currentMeal]);
  const hasMeal = currentMeal.length > 0;

  const effectiveGlucose = useMemo(() => {
    if (glucoseValue !== null) return glucoseValue;
    const parsed = parseFloat(localGlucoseInput);
    return !isNaN(parsed) && parsed > 0 ? parsed : null;
  }, [glucoseValue, localGlucoseInput]);

  const postMeal = useMemo(() => {
    if (effectiveGlucose === null || !hasMeal) return null;
    return estimatePostMeal(effectiveGlucose, unit ?? 'mg/dL', currentMeal);
  }, [effectiveGlucose, unit, currentMeal]);

  const allItems = useMemo<FoodItem[]>(() => {
    if (!foodAction) return [];
    return Object.values(foodDatabase[foodAction]).flat();
  }, [foodAction]);

  const searchResults = useMemo<FoodItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allItems.filter((i) => i.name.toLowerCase().includes(q));
  }, [searchQuery, allItems]);

  const showSearch = foodAction !== '' && searchQuery.trim().length > 0;

  const statusLabelT = (value: number, sUnit: string, low: number, high: number) => {
    const lo = sUnit === 'mmol/L' ? low  / 18.0182 : low;
    const hi = sUnit === 'mmol/L' ? high / 18.0182 : high;
    return value < lo ? t.statusLow : value <= hi ? t.statusNormal : t.statusHigh;
  };

  const ACTION_OPTIONS = [
    { label: t.lower,    value: 'lower'    as FoodAction, color: colors.normal },
    { label: t.maintain, value: 'maintain' as FoodAction, color: colors.textMuted },
    { label: t.raise,    value: 'raise'    as FoodAction, color: colors.red },
  ];

  const addFoodToMeal = (item: FoodItem) => {
    setCurrentMeal((prev) => {
      const existing = prev.find((i) => i.name === item.name);
      if (existing) return prev.map((i) => i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i);
      const next = [...prev, { ...item, uniqueId: generateId(), quantity: 1 }];
      setTimeout(() => scrollRef.current?.scrollTo({ y: mealYRef.current, animated: true }), 350);
      return next;
    });
  };

  const decrementMealItem = (uid: string) =>
    setCurrentMeal((prev) => prev.map((i) => i.uniqueId === uid ? { ...i, quantity: i.quantity - 1 } : i).filter((i) => i.quantity > 0));

  const saveMeal = () => {
    if (!hasMeal) return;
    setSavedMeals((prev) => [{
      id: generateId(), date: formatNow(), action: foodAction,
      items: currentMeal.flatMap(({ uniqueId: _u, quantity: q, ...rest }) => Array.from({ length: q }, () => ({ ...rest }))),
      totals, estimatedGlycemia: postMeal?.value ?? null,
      currentGlucose: effectiveGlucose, unit: unit ?? 'mg/dL',
    }, ...prev]);
    setTotalCarbs(totals.carbs);
    setCurrentMeal([]);
    setActiveTab('history');
  };

  const actionLabel = (action: FoodAction) => {
    if (action === 'lower')    return t.lower;
    if (action === 'maintain') return t.maintain;
    if (action === 'raise')    return t.raise;
    return action;
  };

  const renderFoodRow = (item: FoodItem, idx: number) => (
    <View key={`${item.name}-${idx}`} style={[s.foodRow, { backgroundColor: colors.bgCard }, idx > 0 && [s.foodRowBorder, { borderTopColor: colors.borderLight }]]}>
      <View style={s.foodInfo}>
        <Text style={[s.foodName, { color: colors.text }]}>{t.foodNames[item.name] ?? item.name}</Text>
        <Text style={[s.foodMacros, { color: colors.textMuted }]}>{t.carbs} {item.carbs}g · {t.sugars} {item.sugars}g · {t.fiber} {item.fiber}g</Text>
        <Text style={[s.foodMacros, { color: colors.textMuted }]}>{t.protein} {item.protein}g · {t.fat} {item.fat}g · {item.kcal} kcal · GI {item.gi}</Text>
      </View>
      <PressBtn style={[s.addBtn, { borderColor: colors.red, backgroundColor: 'transparent' }]} onPress={() => addFoodToMeal(item)} activeOpacity={0.75}>
        <Text style={[s.addBtnText, { color: colors.red }]}>{t.addFood}</Text>
      </PressBtn>
    </View>
  );

  const renderPlanner = () => (
    <>
      {glucoseValue !== null ? (
        <View style={[s.readingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[s.readingLabel, { color: colors.textMuted }]}>{t.currentGlycemia}</Text>
          <Text style={[s.readingValue, { color: colors.red }]}>{glucoseValue} {unit}</Text>
        </View>
      ) : (
        <View style={[s.localGlucoseCard, { backgroundColor: colors.bgCard, borderColor: localGlucoseInput ? colors.red : colors.border }]}>
          <Text style={[s.readingLabel, { color: colors.textMuted }]}>{t.currentBloodSugar}</Text>
          <View style={s.localGlucoseRow}>
            <TextInput
              style={[s.localGlucoseInput, { color: colors.text, backgroundColor: colors.inputBg }]}
              placeholder={t.glucosePlaceholder}
              placeholderTextColor="#aaa"
              keyboardType="decimal-pad"
              value={localGlucoseInput}
              onChangeText={setLocalGlucoseInput}
            />
            <Text style={[s.localGlucoseUnit, { color: colors.textMuted }]}>mg/dL</Text>
          </View>
          {!localGlucoseInput && (
            <Text style={{ color: colors.textFaint, fontSize: 11, marginTop: 4 }}>
              {t.glucoseNoReading}
            </Text>
          )}
        </View>
      )}

          {glucoseValue !== null && (() => {
            const mgdl = unit === 'mmol/L' ? glucoseValue! * 18.0182 : glucoseValue!;
            if (mgdl <= settings.targetGlucose) return null;
            const mmolEq  = (mgdl / 18).toFixed(1);
            const rawDose = calcCorrectionDose(mgdl, settings.targetGlucose, settings.isf);
            const dose    = rawDose > 0 ? Math.round(rawDose) : null;
            const analog  = getAnalogByType(settings.insulinAnalogType);
            return (
              <View style={[s.highWarningCard, { backgroundColor: colors.highBg, borderColor: colors.high }]}>
                <Text style={[s.highWarningTitle, { color: colors.high }]}>{t.eatingNotRecommended}</Text>
                <Text style={[s.highWarningBody, { color: colors.text }]}>
                  {t.bloodSugarHighWarning(Math.round(mgdl), mmolEq)}{' '}
                  {dose !== null && dose > 0
                    ? t.takeDoseBeforeEating(dose, analog.label.toLowerCase())
                    : t.consultDoctorBeforeEating
                  }
                </Text>
                <Text style={[s.highWarningCheck, { color: colors.textMuted }]}>
                  {t.recheckEvery15}
                </Text>
              </View>
            );
          })()}

          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>{t.whatWouldYouLikeToDo}</Text>
          <View style={s.pillRow}>
            {ACTION_OPTIONS.map((opt) => {
              const active = foodAction === opt.value;
              return (
                <TouchableOpacity key={opt.value}
                  style={[s.pill, active ? s.primaryBtnShadow : null, { borderColor: opt.color, backgroundColor: active ? opt.color : 'transparent' }]}
                  onPress={() => { setFoodAction(opt.value); setExpandedGroup(null); setSearchQuery(''); }} activeOpacity={0.75}>
                  <Text style={[s.pillText, { color: active ? '#fff' : opt.color }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={s.skipMealBtn} onPress={() => router.push('/medication')} activeOpacity={0.75}>
            <Text style={s.skipMealBtnText}>{t.notEatingGoMeds}</Text>
          </TouchableOpacity>

          {foodAction === '' && (
            <View style={[s.howItWorksCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={[s.howItWorksTitle, { color: colors.text }]}>{t.howItWorks}</Text>
              {[
                { step: '1', label: t.howStep1Label, desc: t.howStep1Desc },
                { step: '2', label: t.howStep2Label, desc: t.howStep2Desc },
                { step: '3', label: t.howStep3Label, desc: t.howStep3Desc },
                { step: '4', label: t.howStep4Label, desc: t.howStep4Desc },
              ].map((row) => (
                <View key={row.step} style={s.howItWorksRow}>
                  <Text style={[s.howItWorksStep, { backgroundColor: colors.red }]}>{row.step}</Text>
                  <View style={s.howItWorksText}>
                    <Text style={[s.howItWorksLabel, { color: colors.text }]}>{row.label}</Text>
                    <Text style={[s.howItWorksDesc, { color: colors.textMuted }]}>{row.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {foodAction !== '' && (
            <View style={[s.searchBar, { borderColor: searchFocused ? colors.red : colors.border, backgroundColor: colors.inputBg }]}>
              <Text style={s.searchIcon}>🔍</Text>
              <TextInput style={[s.searchInput, { color: colors.text }]} placeholder={t.searchFoods} placeholderTextColor="#aaa"
                value={searchQuery} onChangeText={setSearchQuery}
                onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} returnKeyType="search" />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                  <Text style={[s.searchClear, { color: colors.textFaint }]}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {foodAction === 'lower' && !showSearch && (
            <View style={[s.noteCard, { backgroundColor: colors.normalBg, borderColor: '#c8e6c9' }]}>
              <Text style={[s.noteText, { color: colors.normal }]}>{t.lowerNote}</Text>
            </View>
          )}

          {showSearch && (
            <View style={[s.groupCard, { backgroundColor: colors.bgCard, borderColor: colors.border, shadowColor: isDark ? '#000' : '#6070a0', shadowOffset: { width: 0, height: 8 }, shadowOpacity: isDark ? 0.45 : 0.13, shadowRadius: 18, elevation: 4 }]}>
              <View style={s.groupHeader}>
                <Text style={[s.groupTitle, { color: colors.text }]}>{t.searchResults}</Text>
                <Text style={[s.groupCount, { color: colors.textMuted }]}>{t.found(searchResults.length)}</Text>
              </View>
              {searchResults.length === 0
                ? <Text style={[s.noResults, { color: colors.textMuted }]}>{t.noFoodsMatch(searchQuery)}</Text>
                : searchResults.map((item, idx) => renderFoodRow(item, idx))}
            </View>
          )}

          {foodAction !== '' && !showSearch && Object.entries(foodDatabase[foodAction]).map(([groupName, items]) => {
            const isOpen = expandedGroup === groupName;
            const groupLabel = t.foodCategories[groupName] ?? groupName;
            return (
              <View key={groupName} style={[s.groupCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <TouchableOpacity style={s.groupHeader}
                  onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpandedGroup(isOpen ? null : groupName); }}
                  activeOpacity={0.8}>
                  <Text style={[s.groupTitle, { color: colors.text }]}>{groupLabel}</Text>
                  <View style={s.groupHeaderRight}>
                    <Text style={[s.groupCount, { color: colors.textMuted }]}>{t.items(items.length)}</Text>
                    <Text style={[s.groupChevron, { color: colors.textMuted }]}>{isOpen ? '▲' : '▼'}</Text>
                  </View>
                </TouchableOpacity>
                {isOpen && items.map((item, idx) => renderFoodRow(item, idx))}
              </View>
            );
          })}

          {hasMeal && (
            <>
              <View style={s.divider} onLayout={onMealSectionLayout} />
              <View style={[s.statsCard, { backgroundColor: colors.bgCard, borderColor: colors.border, shadowColor: isDark ? '#000' : '#6070a0', shadowOffset: { width: 0, height: 8 }, shadowOpacity: isDark ? 0.45 : 0.13, shadowRadius: 18, elevation: 4 }]}>
                <Text style={[s.statsTitle, { color: colors.textMuted }]}>{t.mealNutritionSummary}</Text>
                <NutrientGrid totals={totals} />
              </View>

              {postMeal !== null && (() => {
                const col = statusColor(postMeal.value, postMeal.unit, settings.glucoseLow, settings.glucoseHigh);
                return (
                  <View style={[s.glycemiaCard, { borderColor: col, backgroundColor: colors.bgCard }]}>
                    <View style={s.glycemiaRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.glycemiaLabel, { color: colors.text }]}>{t.estimatedPostMeal}</Text>
                        <Text style={[s.glycemiaSub, { color: colors.textMuted }]}>{totals.carbs.toFixed(1)}g {t.carbs} · {t.beforeMeal}: {effectiveGlucose} {unit ?? 'mg/dL'}</Text>
                      </View>
                      <View style={s.glycemiaRight}>
                        <Text style={[s.glycemiaValue, { color: col }]}>{postMeal.value}</Text>
                        <Text style={[s.glycemiaUnit,  { color: col }]}>{postMeal.unit}</Text>
                        <Text style={[s.glycemiaStatus,{ color: col }]}>{statusLabelT(postMeal.value, postMeal.unit, settings.glucoseLow, settings.glucoseHigh)}</Text>
                      </View>
                    </View>
                    <Text style={[s.glycemiaDisclaimer, { color: colors.textFaint }]}>{t.estimateOnlyVerify}</Text>
                  </View>
                );
              })()}

              <View style={[s.groupCard, { backgroundColor: colors.bgCard, borderColor: colors.border, shadowColor: isDark ? '#000' : '#6070a0', shadowOffset: { width: 0, height: 8 }, shadowOpacity: isDark ? 0.45 : 0.13, shadowRadius: 18, elevation: 4 }]}>
                <View style={s.groupHeader}>
                  <Text style={[s.groupTitle, { color: colors.text }]}>{t.selectedItems(currentMeal.length)}</Text>
                  <PressBtn onPress={() => setCurrentMeal([])} activeOpacity={0.75}>
                    <Text style={[s.clearAllText, { color: colors.red }]}>{t.clearAllItems}</Text>
                  </PressBtn>
                </View>
                {currentMeal.map((item, idx) => (
                  <View key={item.uniqueId} style={[s.foodRow, idx > 0 && [s.foodRowBorder, { borderTopColor: colors.borderLight }]]}>
                    <Text style={[s.foodName, { flex: 1, color: colors.text, marginRight: 8 }]}>{t.foodNames[item.name] ?? item.name}</Text>
                    <View style={s.qtyRow}>
                      <PressBtn style={[s.qtyBtn, { borderColor: colors.border, backgroundColor: 'transparent' }]} onPress={() => decrementMealItem(item.uniqueId)} activeOpacity={0.75}>
                        <Text style={[s.qtyBtnText, { color: colors.red }]}>−</Text>
                      </PressBtn>
                      <Text style={[s.qtyValue, { color: colors.text }]}>{item.quantity}</Text>
                      <PressBtn style={[s.qtyBtn, { borderColor: colors.border, backgroundColor: 'transparent' }]} onPress={() => addFoodToMeal(item)} activeOpacity={0.75}>
                        <Text style={[s.qtyBtnText, { color: colors.red }]}>+</Text>
                      </PressBtn>
                    </View>
                  </View>
                ))}
              </View>

              <PressBtn style={[s.saveMealBtn, { backgroundColor: colors.red }, s.primaryBtnShadow]} onPress={saveMeal}>
                <Text style={s.saveMealBtnText}>{t.saveMealToHistory}</Text>
              </PressBtn>
              <PressBtn style={[s.backToListBtn, { borderColor: colors.red, backgroundColor: 'transparent' }]}
                onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} activeOpacity={0.75}>
                <Text style={[s.backToListBtnText, { color: colors.red }]}>{t.backToFoodList}</Text>
              </PressBtn>
            </>
          )}
    </>
  );

  const renderHistory = () => (
    <>
      {savedMeals.length === 0 ? (
        <>
          <View style={[s.emptyCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={s.emptyIcon}>🥗</Text>
            <Text style={[s.emptyTitle, { color: colors.text }]}>{t.noMealsSaved}</Text>
            <Text style={[s.emptyText, { color: colors.textMuted }]}>{t.noMealsSavedText}</Text>
          </View>
          <View style={[s.howItWorksCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[s.howItWorksTitle, { color: colors.text }]}>{t.mealLoggingTips}</Text>
            {[t.mealTip1, t.mealTip2, t.mealTip3, t.mealTip4, t.mealTip5].map((tip, i) => (
              <View key={i} style={s.tipRow}>
                <Text style={[s.tipBullet, { color: colors.red }]}>•</Text>
                <Text style={[s.tipBody, { color: colors.textMuted }]}>{tip}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        savedMeals.map((meal) => {
          const isOpen = expandedMealId === meal.id;
          const actionColor = meal.action === 'lower' ? '#2e7d32' : meal.action === 'raise' ? RED : '#ef6c00';
          const estCol = meal.estimatedGlycemia !== null ? statusColor(meal.estimatedGlycemia, meal.unit, settings.glucoseLow, settings.glucoseHigh) : '#888';
          return (
            <View key={meal.id} style={[s.groupCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <TouchableOpacity style={s.groupHeader} onPress={() => setExpandedMealId(isOpen ? null : meal.id)} activeOpacity={0.8}>
                <View style={{ flex: 1 }}>
                  <View style={s.mealHistoryTop}>
                    <Text style={[s.mealHistoryDate, { color: colors.text }]}>{meal.date}</Text>
                    <View style={[s.actionBadge, { borderColor: actionColor }]}>
                      <Text style={[s.actionBadgeText, { color: actionColor }]}>{actionLabel(meal.action)}</Text>
                    </View>
                  </View>
                  <Text style={[s.mealHistorySub, { color: colors.textMuted }]}>
                    {t.items(meal.items.length)} · {meal.totals.carbs.toFixed(1)}g {t.carbs} · {meal.totals.kcal.toFixed(0)} kcal
                    {meal.estimatedGlycemia !== null ? ` · ${t.estLabel} ${meal.estimatedGlycemia} ${meal.unit}` : ''}
                  </Text>
                </View>
                <Text style={[s.groupChevron, { marginLeft: 8 }]}>{isOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isOpen && (
                <>
                  {meal.estimatedGlycemia !== null && (
                    <View style={[s.glycemiaCard, { margin: 10, marginTop: 0, borderColor: estCol, backgroundColor: colors.bgCard }]}>
                      <View style={s.glycemiaRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.glycemiaLabel, { color: colors.text }]}>{t.postMealGlycemiaEstimate}</Text>
                          <Text style={[s.glycemiaSub, { color: colors.textMuted }]}>{t.beforeMeal}: {meal.currentGlucose} {meal.unit}</Text>
                        </View>
                        <View style={s.glycemiaRight}>
                          <Text style={[s.glycemiaValue, { color: estCol }]}>{meal.estimatedGlycemia}</Text>
                          <Text style={[s.glycemiaUnit,  { color: estCol }]}>{meal.unit}</Text>
                          <Text style={[s.glycemiaStatus,{ color: estCol }]}>{statusLabelT(meal.estimatedGlycemia, meal.unit, settings.glucoseLow, settings.glucoseHigh)}</Text>
                        </View>
                      </View>
                    </View>
                  )}
                  <View style={[s.statsCard, { margin: 10, marginTop: 0 }]}>
                    <Text style={[s.statsTitle, { color: colors.textMuted }]}>{t.nutritionalSummary}</Text>
                    <NutrientGrid totals={meal.totals} />
                  </View>
                  <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
                    <Text style={[s.groupTitle, { fontSize: 13, marginBottom: 6, color: colors.text }]}>{t.itemsLabel}</Text>
                    {meal.items.map((item, idx) => (
                      <Text key={idx} style={[s.historyItemName, { color: colors.textMuted }]}>• {t.foodNames[item.name] ?? item.name}</Text>
                    ))}
                  </View>
                  <PressBtn style={[s.deleteMealBtn, { backgroundColor: 'transparent' }]}
                    onPress={() => setSavedMeals((prev) => prev.filter((m) => m.id !== meal.id))} activeOpacity={0.75}>
                    <Text style={[s.deleteMealBtnText, { color: colors.textMuted }]}>{t.deleteMeal}</Text>
                  </PressBtn>
                </>
              )}
            </View>
          );
        })
      )}
    </>
  );

  return (
    <ScrollView ref={scrollRef} style={[s.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={s.contentContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={[s.title, { color: colors.text }]}>{t.mealPlanner}</Text>

      <View style={[s.tabRow, { borderColor: colors.red }, s.tabBarShadow]}>
        {(['planner', 'history'] as ActiveTab[]).map((tab) => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity key={tab} style={[s.tabBtn, { backgroundColor: active ? colors.red : colors.bg }]}
              onPress={() => setActiveTab(tab)} activeOpacity={0.8}>
              <Text style={[s.tabBtnText, { color: active ? '#fff' : colors.red }]}>
                {tab === 'planner' ? t.planner : `${t.history}${savedMeals.length > 0 ? ` (${savedMeals.length})` : ''}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === 'planner' ? renderPlanner() : renderHistory()}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 48 },
  title:            { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 12 },

  tabRow:       { flexDirection: 'row', borderRadius: 8, borderWidth: 1.5, overflow: 'hidden', marginBottom: 16 },
  tabBtn:       { flex: 1, paddingVertical: 8, alignItems: 'center' },
  tabBtnText:   { fontSize: 14, fontWeight: '600' },

  emptyCard:  { minHeight: Dimensions.get('window').height - 280, borderRadius: 12, borderWidth: 1, padding: 24, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  emptyIcon:  { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptyText:  { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  readingCard:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 14 },
  readingLabel: { fontSize: 13 },
  readingValue: { fontSize: 16, fontWeight: '800' },

  localGlucoseCard:  { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 14 },
  localGlucoseRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  localGlucoseInput: { flex: 1, borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 8 : 5, fontSize: 16, fontWeight: '700' },
  localGlucoseUnit:  { fontSize: 13, fontWeight: '600' },

  sectionLabel: { fontSize: 13, textAlign: 'center', marginBottom: 10, lineHeight: 18 },
  pillRow:      { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 14 },
  pill:         { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 6, borderWidth: 1.5, minWidth: 84, alignItems: 'center', backgroundColor: 'transparent' },
  pillText:     { fontSize: 14, fontWeight: '600' },

  searchBar:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 8 : 4, marginBottom: 12 },
  searchIcon:   { fontSize: 14, marginRight: 6 },
  searchInput:  { flex: 1, fontSize: 14 },
  searchClear:  { fontSize: 13, paddingLeft: 6 },
  noResults:    { fontSize: 13, textAlign: 'center', padding: 14 },

  noteCard: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 12 },
  noteText: { fontSize: 13, color: '#2e7d32', lineHeight: 18 },

  groupCard:        { borderRadius: 10, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  groupHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  groupHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupTitle:       { fontSize: 15, fontWeight: '700' },
  groupChevron:     { fontSize: 12 },
  groupCount:       { fontSize: 12 },

  foodRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  foodRowBorder: { borderTopWidth: 1 },
  foodInfo:      { flex: 1, marginRight: 10 },
  foodName:      { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  foodMacros:    { fontSize: 11, lineHeight: 16 },

  addBtn:     { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 5, borderWidth: 1.5, backgroundColor: 'transparent' },
  addBtnText: { fontSize: 12, fontWeight: '700', backgroundColor: 'transparent' },

  divider: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 14 },

  statsCard:  { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
  statsTitle: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center', marginBottom: 10 },
  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statItem:   { width: '25%', alignItems: 'center', marginBottom: 10 },
  statNumber: { fontSize: 13, fontWeight: '800', marginBottom: 1 },
  statLabel:  { fontSize: 9, fontWeight: '500' },

  glycemiaCard:       { borderRadius: 10, borderWidth: 1.5, padding: 12, marginBottom: 10 },
  glycemiaRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  glycemiaLabel:      { fontSize: 13, fontWeight: '700' },
  glycemiaSub:        { fontSize: 11, marginTop: 2 },
  glycemiaRight:      { alignItems: 'flex-end' },
  glycemiaValue:      { fontSize: 26, fontWeight: '900', lineHeight: 28 },
  glycemiaUnit:       { fontSize: 12, fontWeight: '600' },
  glycemiaStatus:     { fontSize: 12, fontWeight: '700', marginTop: 1 },
  glycemiaDisclaimer: { fontSize: 11, lineHeight: 16 },

  clearAllText: { fontSize: 12, fontWeight: '600' },
  qtyRow:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn:       { width: 28, height: 28, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText:   { fontSize: 16, fontWeight: '700', lineHeight: 20, backgroundColor: 'transparent' },
  qtyValue:     { fontSize: 14, fontWeight: '700', minWidth: 22, textAlign: 'center' },

  saveMealBtn:     { borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  saveMealBtnText: { fontSize: 15, color: '#fff', fontWeight: '700', backgroundColor: 'transparent' },
  backToListBtn:   { borderRadius: 8, paddingVertical: 11, alignItems: 'center', marginTop: 8, borderWidth: 1.5, backgroundColor: 'transparent' },
  backToListBtnText:{ fontSize: 14, fontWeight: '600', backgroundColor: 'transparent' },
  skipMealBtn:     { alignItems: 'center', paddingVertical: 8, marginBottom: 10 },
  skipMealBtnText: { fontSize: 13, color: '#aaaaaa', textDecorationLine: 'underline', backgroundColor: 'transparent' },

  howItWorksCard:  { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  howItWorksTitle: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  howItWorksRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  howItWorksStep:  { width: 24, height: 24, borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: '800', textAlign: 'center', lineHeight: 24, overflow: 'hidden', backgroundColor: 'transparent' },
  howItWorksText:  { flex: 1 },
  howItWorksLabel: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  howItWorksDesc:  { fontSize: 12, lineHeight: 17 },

  tipRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  tipBullet: { fontSize: 14, fontWeight: '800', marginTop: 1 },
  tipBody:   { flex: 1, fontSize: 13, lineHeight: 18 },

  mealHistoryTop:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  mealHistoryDate:  { fontSize: 13, fontWeight: '600' },
  mealHistorySub:   { fontSize: 12 },
  actionBadge:      { borderWidth: 1.5, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  actionBadgeText:  { fontSize: 11, fontWeight: '700', backgroundColor: 'transparent' },
  historyItemName:  { fontSize: 13, lineHeight: 20 },
  deleteMealBtn:    { margin: 10, marginTop: 0, paddingVertical: 8, borderRadius: 6, borderWidth: 1.5, borderColor: '#e0e0e0', alignItems: 'center', backgroundColor: 'transparent' },
  deleteMealBtnText:{ fontSize: 13, fontWeight: '600', backgroundColor: 'transparent' },

  // ── Shadows ──────────────────────────────────────────────────────────────────
  tabBarShadow:     { shadowColor: '#EC5557', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 4 },
  primaryBtnShadow: { shadowColor: '#7a1010', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.45, shadowRadius: 0, elevation: 4 },

  highWarningCard:  { borderWidth: 1.5, borderRadius: 10, padding: 12, marginBottom: 14 },
  highWarningTitle: { fontSize: 14, fontWeight: '800', marginBottom: 6 },
  highWarningBody:  { fontSize: 13, lineHeight: 20, marginBottom: 6 },
  highWarningBold:  { fontWeight: '800' },
  highWarningCheck: { fontSize: 12, fontStyle: 'italic' },
  outlineBtnShadow: { shadowColor: '#000', shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
});


/* Psalm 37:4 "Delight yourself in the LORD, and he will give you the desires of your heart" */