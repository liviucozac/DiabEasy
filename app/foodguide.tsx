import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Platform, LayoutChangeEvent, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useGlucoseStore } from '../store/glucoseStore';
import { useTheme } from '../context/AppContext';

const RED = '#EC5557';

type FoodAction = 'lower' | 'maintain' | 'raise' | '';
type ActiveTab  = 'planner' | 'history';

interface FoodItem {
  name: string;
  carbs: number; sugars: number; fiber: number;
  protein: number; fat: number; kcal: number;
  gi: number; sodium: number; potassium: number;
}
interface MealItem extends FoodItem { uniqueId: string }
interface SavedMeal {
  id: string; date: string; action: FoodAction;
  items: FoodItem[]; totals: NutrientTotals;
  estimatedGlycemia: number | null;
  currentGlucose: number | null; unit: string;
}
interface NutrientTotals {
  carbs: number; sugars: number; fiber: number;
  protein: number; fat: number; kcal: number;
  sodium: number; potassium: number;
}

// ─── FOOD DATABASE ────────────────────────────────────────────────────────────
// Raise: 35 items | Maintain: 35 items | Lower: 35 items
// ─────────────────────────────────────────────────────────────────────────────

const foodDatabase: Record<string, Record<string, FoodItem[]>> = {

  // ── RAISE — 35 items ──────────────────────────────────────────────────────
  raise: {
    Drinks: [
      // 10 items
      { name: 'Orange Juice (200ml)',         carbs: 22, sugars: 20, fiber: 0.5, protein: 1.7, fat: 0.3, kcal: 85,  gi: 50, sodium: 2,   potassium: 400 },
      { name: 'Apple Juice (200ml)',          carbs: 24, sugars: 22, fiber: 0.2, protein: 0.2, fat: 0.1, kcal: 96,  gi: 44, sodium: 10,  potassium: 250 },
      { name: 'Grape Juice (200ml)',          carbs: 36, sugars: 34, fiber: 0.2, protein: 0.5, fat: 0.1, kcal: 150, gi: 55, sodium: 10,  potassium: 200 },
      { name: 'Pineapple Juice (200ml)',      carbs: 26, sugars: 24, fiber: 0.5, protein: 0.5, fat: 0.2, kcal: 110, gi: 58, sodium: 2,   potassium: 300 },
      { name: 'Gatorade (250ml)',             carbs: 14, sugars: 14, fiber: 0,   protein: 0,   fat: 0,   kcal: 56,  gi: 78, sodium: 160, potassium: 45  },
      { name: 'Whole Milk (200ml)',           carbs: 10, sugars: 10, fiber: 0,   protein: 7,   fat: 8,   kcal: 150, gi: 41, sodium: 120, potassium: 380 },
      { name: 'Chocolate Milk (200ml)',       carbs: 26, sugars: 24, fiber: 1,   protein: 8,   fat: 5,   kcal: 180, gi: 45, sodium: 150, potassium: 400 },
      { name: 'Sweetened Iced Tea (250ml)',  carbs: 26, sugars: 25, fiber: 0,   protein: 0,   fat: 0,   kcal: 104, gi: 65, sodium: 15,  potassium: 30  },
      { name: 'Lemonade (250ml)',             carbs: 27, sugars: 26, fiber: 0,   protein: 0,   fat: 0,   kcal: 110, gi: 54, sodium: 10,  potassium: 20  },
      { name: 'Energy Drink (250ml)',         carbs: 28, sugars: 27, fiber: 0,   protein: 0,   fat: 0,   kcal: 110, gi: 68, sodium: 200, potassium: 60  },
    ],
    'Grains & Bread': [
      // 10 items
      { name: 'White Bread (1 slice)',        carbs: 15, sugars: 2,  fiber: 0.8, protein: 3,   fat: 1,   kcal: 80,  gi: 75, sodium: 150, potassium: 30  },
      { name: 'White Rice (100g cooked)',     carbs: 28, sugars: 0,  fiber: 0.4, protein: 2.7, fat: 0.3, kcal: 130, gi: 70, sodium: 1,   potassium: 35  },
      { name: 'Bagel (1 medium)',             carbs: 50, sugars: 6,  fiber: 2,   protein: 10,  fat: 1,   kcal: 250, gi: 72, sodium: 400, potassium: 100 },
      { name: 'Cornflakes (30g)',             carbs: 26, sugars: 3,  fiber: 1,   protein: 2,   fat: 0.2, kcal: 110, gi: 81, sodium: 290, potassium: 35  },
      { name: 'Instant Oatmeal (1 packet)',  carbs: 32, sugars: 12, fiber: 3,   protein: 5,   fat: 2,   kcal: 160, gi: 79, sodium: 200, potassium: 120 },
      { name: 'Croissant (1 medium)',         carbs: 26, sugars: 6,  fiber: 1.5, protein: 5,   fat: 12,  kcal: 230, gi: 67, sodium: 350, potassium: 70  },
      { name: 'Waffle (1 medium)',            carbs: 25, sugars: 5,  fiber: 1,   protein: 4,   fat: 5,   kcal: 150, gi: 70, sodium: 300, potassium: 80  },
      { name: 'Pancake (1 medium)',           carbs: 22, sugars: 5,  fiber: 1,   protein: 4,   fat: 3,   kcal: 130, gi: 67, sodium: 250, potassium: 90  },
      { name: 'Pasta (100g cooked)',          carbs: 30, sugars: 1,  fiber: 2,   protein: 5,   fat: 1,   kcal: 150, gi: 65, sodium: 5,   potassium: 50  },
      { name: 'Naan (1 piece)',               carbs: 45, sugars: 4,  fiber: 2,   protein: 9,   fat: 6,   kcal: 260, gi: 71, sodium: 480, potassium: 100 },
    ],
    'Cooked Foods': [
      // 5 items
      { name: 'Mashed Potato (100g)',         carbs: 17, sugars: 1,  fiber: 1.5, protein: 2,   fat: 4,   kcal: 110, gi: 85, sodium: 300, potassium: 300 },
      { name: 'French Fries (100g)',          carbs: 35, sugars: 0,  fiber: 3,   protein: 3,   fat: 15,  kcal: 270, gi: 75, sodium: 200, potassium: 400 },
      { name: 'Baked Potato (1 medium)',      carbs: 37, sugars: 2,  fiber: 4,   protein: 4,   fat: 0.2, kcal: 160, gi: 82, sodium: 10,  potassium: 900 },
      { name: 'Pizza (1 slice)',              carbs: 36, sugars: 4,  fiber: 2,   protein: 12,  fat: 10,  kcal: 285, gi: 60, sodium: 640, potassium: 200 },
      { name: 'Fried Rice (100g)',            carbs: 28, sugars: 1,  fiber: 1,   protein: 4,   fat: 4,   kcal: 165, gi: 68, sodium: 350, potassium: 80  },
    ],
    Snacks: [
      // 5 items
      { name: 'Gummy Bears (30g)',            carbs: 24, sugars: 18, fiber: 0,   protein: 2,   fat: 0,   kcal: 104, gi: 78, sodium: 25,  potassium: 0   },
      { name: 'Honey (1 tbsp)',               carbs: 17, sugars: 17, fiber: 0,   protein: 0.1, fat: 0,   kcal: 64,  gi: 58, sodium: 1,   potassium: 10  },
      { name: 'Granola Bar (1 bar)',          carbs: 20, sugars: 10, fiber: 2,   protein: 3,   fat: 5,   kcal: 140, gi: 66, sodium: 80,  potassium: 100 },
      { name: 'Rice Cakes (2 cakes)',         carbs: 28, sugars: 2,  fiber: 1,   protein: 2,   fat: 1,   kcal: 120, gi: 82, sodium: 50,  potassium: 30  },
      { name: 'Fruit Yogurt (100g)',          carbs: 20, sugars: 18, fiber: 0,   protein: 4,   fat: 2,   kcal: 110, gi: 50, sodium: 60,  potassium: 200 },
    ],
    Fruits: [
      // 5 items
      { name: 'Banana (1 medium)',            carbs: 27, sugars: 14, fiber: 3,   protein: 1.3, fat: 0.4, kcal: 105, gi: 51, sodium: 1,   potassium: 422 },
      { name: 'Watermelon (150g)',            carbs: 11, sugars: 9,  fiber: 0.6, protein: 0.9, fat: 0.2, kcal: 46,  gi: 72, sodium: 2,   potassium: 170 },
      { name: 'Grapes (100g)',                carbs: 17, sugars: 16, fiber: 0.9, protein: 0.6, fat: 0.2, kcal: 69,  gi: 53, sodium: 2,   potassium: 191 },
      { name: 'Dates (30g, ~3 dates)',        carbs: 22, sugars: 20, fiber: 1.8, protein: 0.7, fat: 0.1, kcal: 83,  gi: 42, sodium: 1,   potassium: 195 },
      { name: 'Mango (100g)',                 carbs: 15, sugars: 14, fiber: 1.6, protein: 0.8, fat: 0.4, kcal: 60,  gi: 51, sodium: 1,   potassium: 168 },
    ],
  },
  // RAISE TOTAL: 10+10+5+5+5 = 35 ✓

  // ── MAINTAIN — 35 items ───────────────────────────────────────────────────
  maintain: {
    Drinks: [
      // 7 items
      { name: 'Water (250ml)',                      carbs: 0, sugars: 0,   fiber: 0, protein: 0,   fat: 0,   kcal: 0,  gi: 0,  sodium: 0,   potassium: 0   },
      { name: 'Sparkling Water (250ml)',             carbs: 0, sugars: 0,   fiber: 0, protein: 0,   fat: 0,   kcal: 0,  gi: 0,  sodium: 0,   potassium: 0   },
      { name: 'Black Coffee (250ml)',                carbs: 0, sugars: 0,   fiber: 0, protein: 0.3, fat: 0,   kcal: 2,  gi: 0,  sodium: 5,   potassium: 90  },
      { name: 'Unsweetened Tea (250ml)',             carbs: 0, sugars: 0,   fiber: 0, protein: 0,   fat: 0,   kcal: 0,  gi: 0,  sodium: 5,   potassium: 20  },
      { name: 'Green Tea (250ml)',                   carbs: 0, sugars: 0,   fiber: 0, protein: 0,   fat: 0,   kcal: 0,  gi: 0,  sodium: 0,   potassium: 20  },
      { name: 'Almond Milk unsweetened (200ml)',    carbs: 2, sugars: 0,   fiber: 1, protein: 1,   fat: 3,   kcal: 35, gi: 25, sodium: 150, potassium: 50  },
      { name: 'Kombucha (250ml)',                    carbs: 7, sugars: 4,   fiber: 0, protein: 0,   fat: 0,   kcal: 30, gi: 30, sodium: 10,  potassium: 50  },
    ],
    'Proteins & Dairy': [
      // 10 items
      { name: 'Grilled Chicken (100g)',        carbs: 0,   sugars: 0,   fiber: 0, protein: 25,  fat: 3,   kcal: 165, gi: 0,  sodium: 70,  potassium: 300 },
      { name: 'Baked Salmon (100g)',           carbs: 0,   sugars: 0,   fiber: 0, protein: 20,  fat: 13,  kcal: 208, gi: 0,  sodium: 60,  potassium: 380 },
      { name: 'Tuna in water (100g)',          carbs: 0,   sugars: 0,   fiber: 0, protein: 25,  fat: 1,   kcal: 116, gi: 0,  sodium: 300, potassium: 280 },
      { name: 'Turkey Breast (100g)',          carbs: 0,   sugars: 0,   fiber: 0, protein: 24,  fat: 2,   kcal: 135, gi: 0,  sodium: 60,  potassium: 300 },
      { name: 'Lean Beef (100g)',              carbs: 0,   sugars: 0,   fiber: 0, protein: 26,  fat: 8,   kcal: 180, gi: 0,  sodium: 70,  potassium: 350 },
      { name: 'Egg (1 large)',                 carbs: 0.6, sugars: 0.6, fiber: 0, protein: 6,   fat: 5,   kcal: 70,  gi: 0,  sodium: 70,  potassium: 70  },
      { name: 'Tofu firm (100g)',              carbs: 2,   sugars: 0,   fiber: 1, protein: 8,   fat: 4,   kcal: 80,  gi: 15, sodium: 10,  potassium: 150 },
      { name: 'Greek Yogurt plain (100g)',     carbs: 3,   sugars: 3,   fiber: 0, protein: 10,  fat: 0.4, kcal: 59,  gi: 35, sodium: 36,  potassium: 141 },
      { name: 'Cottage Cheese (100g)',         carbs: 3,   sugars: 3,   fiber: 0, protein: 11,  fat: 4,   kcal: 100, gi: 30, sodium: 400, potassium: 100 },
      { name: 'Shrimp cooked (100g)',          carbs: 0.9, sugars: 0,   fiber: 0, protein: 20,  fat: 1.7, kcal: 99,  gi: 0,  sodium: 190, potassium: 180 },
    ],
    'Grains & Legumes': [
      // 8 items
      { name: 'Quinoa (100g cooked)',          carbs: 21, sugars: 1,   fiber: 2.8, protein: 4.4, fat: 1.9, kcal: 120, gi: 53, sodium: 7,  potassium: 172 },
      { name: 'Brown Rice (100g cooked)',      carbs: 23, sugars: 0,   fiber: 2,   protein: 3,   fat: 1,   kcal: 110, gi: 50, sodium: 5,  potassium: 85  },
      { name: 'Oats rolled (50g dry)',         carbs: 27, sugars: 1,   fiber: 4,   protein: 5,   fat: 3,   kcal: 150, gi: 55, sodium: 1,  potassium: 150 },
      { name: 'Whole Wheat Bread (1 slice)',   carbs: 12, sugars: 2,   fiber: 2,   protein: 4,   fat: 1,   kcal: 80,  gi: 60, sodium: 150,potassium: 70  },
      { name: 'Lentils (100g cooked)',         carbs: 20, sugars: 2,   fiber: 8,   protein: 9,   fat: 0,   kcal: 120, gi: 30, sodium: 5,  potassium: 350 },
      { name: 'Chickpeas (100g cooked)',       carbs: 20, sugars: 3,   fiber: 6,   protein: 8,   fat: 2,   kcal: 130, gi: 28, sodium: 10, potassium: 250 },
      { name: 'Sweet Potato (100g cooked)',   carbs: 20, sugars: 6,   fiber: 3,   protein: 2,   fat: 0,   kcal: 90,  gi: 54, sodium: 40, potassium: 350 },
      { name: 'Barley (100g cooked)',          carbs: 28, sugars: 0,   fiber: 4,   protein: 2.3, fat: 0.4, kcal: 123, gi: 25, sodium: 3,  potassium: 110 },
    ],
    Vegetables: [
      // 5 items
      { name: 'Broccoli (100g)',               carbs: 4, sugars: 1,   fiber: 2.6, protein: 2.8, fat: 0.4, kcal: 34, gi: 10, sodium: 33, potassium: 316 },
      { name: 'Spinach (100g)',                carbs: 1, sugars: 0,   fiber: 2.2, protein: 2.9, fat: 0.4, kcal: 23, gi: 15, sodium: 79, potassium: 558 },
      { name: 'Bell Pepper (100g)',            carbs: 4, sugars: 2,   fiber: 1.5, protein: 1,   fat: 0,   kcal: 20, gi: 15, sodium: 3,  potassium: 200 },
      { name: 'Zucchini (100g)',               carbs: 3, sugars: 2.5, fiber: 1,   protein: 1.2, fat: 0.2, kcal: 17, gi: 15, sodium: 8,  potassium: 261 },
      { name: 'Mushrooms (100g)',              carbs: 2, sugars: 1,   fiber: 1,   protein: 3.1, fat: 0.3, kcal: 22, gi: 10, sodium: 5,  potassium: 318 },
    ],
    Snacks: [
      // 5 items
      { name: 'Almonds (30g)',                 carbs: 6,   sugars: 1,   fiber: 3,   protein: 6,   fat: 14,  kcal: 170, gi: 15, sodium: 0,   potassium: 200 },
      { name: 'Walnuts (30g)',                 carbs: 4,   sugars: 0.7, fiber: 2,   protein: 4.3, fat: 18,  kcal: 185, gi: 15, sodium: 1,   potassium: 125 },
      { name: 'Hummus (2 tbsp)',               carbs: 5,   sugars: 0,   fiber: 2,   protein: 2,   fat: 5,   kcal: 70,  gi: 10, sodium: 120, potassium: 100 },
      { name: 'Hard-Boiled Egg',               carbs: 0.6, sugars: 0.6, fiber: 0,   protein: 6,   fat: 5,   kcal: 70,  gi: 0,  sodium: 70,  potassium: 70  },
      { name: 'Dark Chocolate (20g)',          carbs: 12,  sugars: 8,   fiber: 2,   protein: 2,   fat: 7,   kcal: 110, gi: 23, sodium: 5,   potassium: 150 },
    ],
  },
  // MAINTAIN TOTAL: 7+10+8+5+5 = 35 ✓

  // ── LOWER — 35 items ──────────────────────────────────────────────────────
  lower: {
    Drinks: [
      // 8 items
      { name: 'Water (250ml)',                        carbs: 0, sugars: 0,   fiber: 0, protein: 0,   fat: 0, kcal: 0, gi: 0, sodium: 0, potassium: 0  },
      { name: 'Green Tea (250ml)',                    carbs: 0, sugars: 0,   fiber: 0, protein: 0,   fat: 0, kcal: 0, gi: 0, sodium: 0, potassium: 20 },
      { name: 'Matcha Tea (250ml)',                   carbs: 0, sugars: 0,   fiber: 0, protein: 1,   fat: 0, kcal: 5, gi: 0, sodium: 0, potassium: 30 },
      { name: 'Cinnamon Tea (250ml)',                 carbs: 0, sugars: 0,   fiber: 0, protein: 0,   fat: 0, kcal: 0, gi: 0, sodium: 0, potassium: 10 },
      { name: 'Ginger Tea (250ml)',                   carbs: 0, sugars: 0,   fiber: 0, protein: 0,   fat: 0, kcal: 0, gi: 0, sodium: 0, potassium: 10 },
      { name: 'Apple Cider Vinegar (1 tbsp + water)',carbs: 0, sugars: 0,   fiber: 0, protein: 0,   fat: 0, kcal: 1, gi: 0, sodium: 0, potassium: 15 },
      { name: 'Chamomile Tea (250ml)',                carbs: 0, sugars: 0,   fiber: 0, protein: 0,   fat: 0, kcal: 0, gi: 0, sodium: 0, potassium: 0  },
      { name: 'Peppermint Tea (250ml)',               carbs: 0, sugars: 0,   fiber: 0, protein: 0,   fat: 0, kcal: 0, gi: 0, sodium: 0, potassium: 0  },
    ],
    'Non-Starchy Vegetables': [
      // 12 items
      { name: 'Broccoli (100g)',          carbs: 4, sugars: 1,   fiber: 2.6, protein: 2.8, fat: 0.4, kcal: 34, gi: 10, sodium: 33, potassium: 316 },
      { name: 'Spinach (100g)',           carbs: 1, sugars: 0,   fiber: 2.2, protein: 2.9, fat: 0.4, kcal: 23, gi: 15, sodium: 79, potassium: 558 },
      { name: 'Cauliflower (100g)',       carbs: 3, sugars: 1.9, fiber: 2,   protein: 2,   fat: 0.3, kcal: 25, gi: 15, sodium: 30, potassium: 300 },
      { name: 'Zucchini (100g)',          carbs: 3, sugars: 2.5, fiber: 1,   protein: 1.2, fat: 0.2, kcal: 17, gi: 15, sodium: 8,  potassium: 261 },
      { name: 'Mushrooms (100g)',         carbs: 2, sugars: 1,   fiber: 1,   protein: 3.1, fat: 0.3, kcal: 22, gi: 10, sodium: 5,  potassium: 318 },
      { name: 'Asparagus (100g)',         carbs: 3, sugars: 1,   fiber: 2,   protein: 2.2, fat: 0.2, kcal: 20, gi: 15, sodium: 2,  potassium: 200 },
      { name: 'Kale (100g)',              carbs: 4, sugars: 1,   fiber: 2,   protein: 2.9, fat: 0.4, kcal: 35, gi: 15, sodium: 30, potassium: 350 },
      { name: 'Green Beans (100g)',       carbs: 4, sugars: 1,   fiber: 2.5, protein: 1.8, fat: 0.1, kcal: 30, gi: 15, sodium: 5,  potassium: 200 },
      { name: 'Cabbage (100g)',           carbs: 3, sugars: 2,   fiber: 2,   protein: 1.3, fat: 0.1, kcal: 25, gi: 10, sodium: 15, potassium: 200 },
      { name: 'Cucumber (100g)',          carbs: 2, sugars: 1,   fiber: 0.5, protein: 0.7, fat: 0.1, kcal: 8,  gi: 10, sodium: 2,  potassium: 150 },
      { name: 'Celery (100g)',            carbs: 3, sugars: 2,   fiber: 1.6, protein: 0.7, fat: 0.2, kcal: 14, gi: 15, sodium: 80, potassium: 260 },
      { name: 'Lettuce (100g)',           carbs: 1, sugars: 0,   fiber: 1,   protein: 1,   fat: 0.2, kcal: 15, gi: 10, sodium: 10, potassium: 200 },
    ],
    'Nuts & Seeds': [
      // 7 items
      { name: 'Avocado (half)',            carbs: 6, sugars: 0.3, fiber: 4.6, protein: 1.3, fat: 15,  kcal: 120, gi: 10, sodium: 5,  potassium: 485 },
      { name: 'Walnuts (30g)',             carbs: 4, sugars: 0.7, fiber: 2,   protein: 4.3, fat: 18,  kcal: 185, gi: 15, sodium: 1,  potassium: 125 },
      { name: 'Chia Seeds (10g)',          carbs: 4, sugars: 0,   fiber: 3.4, protein: 1.7, fat: 3,   kcal: 50,  gi: 1,  sodium: 5,  potassium: 115 },
      { name: 'Flaxseeds (10g)',           carbs: 3, sugars: 0.2, fiber: 2.8, protein: 1.8, fat: 4.3, kcal: 55,  gi: 1,  sodium: 5,  potassium: 85  },
      { name: 'Pumpkin Seeds (30g)',       carbs: 5, sugars: 0.5, fiber: 1,   protein: 9,   fat: 13,  kcal: 160, gi: 10, sodium: 5,  potassium: 260 },
      { name: 'Almond Butter (1 tbsp)',   carbs: 3, sugars: 1,   fiber: 1,   protein: 3,   fat: 9,   kcal: 100, gi: 10, sodium: 0,  potassium: 120 },
      { name: 'Hemp Seeds (10g)',          carbs: 1, sugars: 0,   fiber: 1,   protein: 3,   fat: 5,   kcal: 55,  gi: 0,  sodium: 0,  potassium: 100 },
    ],
    'Lean Proteins': [
      // 5 items
      { name: 'Grilled Chicken (100g)',        carbs: 0,   sugars: 0, fiber: 0, protein: 25,  fat: 3,   kcal: 165, gi: 0,  sodium: 70,  potassium: 300 },
      { name: 'Baked Salmon (100g)',           carbs: 0,   sugars: 0, fiber: 0, protein: 20,  fat: 13,  kcal: 208, gi: 0,  sodium: 60,  potassium: 380 },
      { name: 'Tuna in water (100g)',          carbs: 0,   sugars: 0, fiber: 0, protein: 25,  fat: 1,   kcal: 116, gi: 0,  sodium: 300, potassium: 280 },
      { name: 'Tofu firm (100g)',              carbs: 2,   sugars: 0, fiber: 1, protein: 8,   fat: 4,   kcal: 80,  gi: 15, sodium: 10,  potassium: 150 },
      { name: 'Greek Yogurt plain (100g)',     carbs: 3,   sugars: 3, fiber: 0, protein: 10,  fat: 0.4, kcal: 59,  gi: 35, sodium: 36,  potassium: 141 },
    ],
    'Low-GI Fruits': [
      // 8 items
      { name: 'Strawberries (100g)',      carbs: 8,  sugars: 5,  fiber: 2,   protein: 0.7, fat: 0.3, kcal: 32,  gi: 40, sodium: 1, potassium: 153 },
      { name: 'Blueberries (100g)',       carbs: 14, sugars: 10, fiber: 2.4, protein: 0.7, fat: 0.3, kcal: 57,  gi: 53, sodium: 1, potassium: 77  },
      { name: 'Raspberries (100g)',       carbs: 12, sugars: 4,  fiber: 6.5, protein: 1.2, fat: 0.7, kcal: 52,  gi: 32, sodium: 1, potassium: 151 },
      { name: 'Blackberries (100g)',      carbs: 10, sugars: 5,  fiber: 5,   protein: 1.4, fat: 0.5, kcal: 43,  gi: 25, sodium: 1, potassium: 162 },
      { name: 'Apple (1 medium)',         carbs: 25, sugars: 19, fiber: 4.4, protein: 0.5, fat: 0.3, kcal: 95,  gi: 36, sodium: 2, potassium: 195 },
      { name: 'Pear (1 medium)',          carbs: 28, sugars: 17, fiber: 5.5, protein: 0.6, fat: 0.2, kcal: 101, gi: 38, sodium: 2, potassium: 206 },
      { name: 'Grapefruit (half)',        carbs: 13, sugars: 12, fiber: 2,   protein: 0.9, fat: 0.1, kcal: 52,  gi: 25, sodium: 0, potassium: 166 },
      { name: 'Cherries (100g)',          carbs: 16, sugars: 13, fiber: 2.1, protein: 1,   fat: 0.2, kcal: 63,  gi: 22, sodium: 0, potassium: 222 },
    ],
  },
  // LOWER TOTAL: 8+12+7+5+8 = 40 ✓ (comfortably above 35)
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNow(): string {
  const now = new Date();
  const dd   = String(now.getDate()).padStart(2, '0');
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${dd}/${mm}/${now.getFullYear()} ${time}`;
}

function calcTotals(items: FoodItem[]): NutrientTotals {
  return items.reduce(
    (acc, i) => ({
      carbs:     acc.carbs     + i.carbs,
      sugars:    acc.sugars    + i.sugars,
      fiber:     acc.fiber     + i.fiber,
      protein:   acc.protein   + i.protein,
      fat:       acc.fat       + i.fat,
      kcal:      acc.kcal      + i.kcal,
      sodium:    acc.sodium    + i.sodium,
      potassium: acc.potassium + i.potassium,
    }),
    { carbs: 0, sugars: 0, fiber: 0, protein: 0, fat: 0, kcal: 0, sodium: 0, potassium: 0 }
  );
}

function estimatePostMeal(
  currentGlucose: number,
  currentUnit: string,
  items: MealItem[]
): { value: number; unit: string } | null {
  if (items.length === 0) return null;
  const mgDl       = currentUnit === 'mmol/L' ? currentGlucose * 18 : currentGlucose;
  const totalCarbs = items.reduce((s, i) => s + i.carbs, 0);
  const avgGI      = totalCarbs > 0
    ? items.reduce((s, i) => s + i.gi * i.carbs, 0) / totalCarbs
    : 0;
  // ΔBG ≈ carbs × (GI/100) × 10  mg/dL  (70 kg adult proxy)
  const estimated  = Math.round(mgDl + totalCarbs * (avgGI / 100) * 10);
  if (currentUnit === 'mmol/L') {
    return { value: parseFloat((estimated / 18).toFixed(1)), unit: 'mmol/L' };
  }
  return { value: estimated, unit: 'mg/dL' };
}

function statusColor(value: number, unit: string): string {
  if (unit === 'mg/dL') return value < 75 ? '#e53935' : value <= 150 ? '#2e7d32' : '#ef6c00';
  return value < 4.2 ? '#e53935' : value <= 8.3 ? '#2e7d32' : '#ef6c00';
}

function statusLabel(value: number, unit: string): string {
  if (unit === 'mg/dL') return value < 75 ? 'Low' : value <= 150 ? 'Normal' : 'High';
  return value < 4.2 ? 'Low' : value <= 8.3 ? 'Normal' : 'High';
}

// ─── NutrientGrid ─────────────────────────────────────────────────────────────

function NutrientGrid({ totals }: { totals: NutrientTotals }) {
  const { colors } = useTheme();
  const stats = [
    { label: 'Carbs',    value: `${totals.carbs.toFixed(1)}g` },
    { label: 'Sugars',   value: `${totals.sugars.toFixed(1)}g` },
    { label: 'Fiber',    value: `${totals.fiber.toFixed(1)}g` },
    { label: 'Protein',  value: `${totals.protein.toFixed(1)}g` },
    { label: 'Fat',      value: `${totals.fat.toFixed(1)}g` },
    { label: 'Kcal',     value: `${totals.kcal.toFixed(0)}` },
    { label: 'Sodium',   value: `${totals.sodium.toFixed(0)}mg` },
    { label: 'Potassium',value: `${totals.potassium.toFixed(0)}mg` },
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FoodGuideScreen() {
  const { glucoseValue, unit } = useGlucoseStore();
  const { colors } = useTheme();
  const router = useRouter();

  const [activeTab,      setActiveTab]      = useState<ActiveTab>('planner');
  const [foodAction,     setFoodAction]     = useState<FoodAction>('');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [searchFocused,  setSearchFocused]  = useState(false);
  const [expandedGroup,  setExpandedGroup]  = useState<string | null>(null);
  const [currentMeal,    setCurrentMeal]    = useState<MealItem[]>([]);
  const [savedMeals,     setSavedMeals]     = useState<SavedMeal[]>([]);
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);

  // Auto-scroll refs
  const scrollRef = useRef<ScrollView>(null);
  const mealYRef  = useRef<number>(0);

  const onMealSectionLayout = (e: LayoutChangeEvent) => {
    mealYRef.current = e.nativeEvent.layout.y;
  };

  const totals  = useMemo(() => calcTotals(currentMeal), [currentMeal]);
  const hasMeal = currentMeal.length > 0;

  const postMeal = useMemo(() => {
    if (glucoseValue === null || !hasMeal) return null;
    return estimatePostMeal(glucoseValue, unit ?? 'mg/dL', currentMeal);
  }, [glucoseValue, unit, currentMeal]);

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

  const addFoodToMeal = (item: FoodItem) => {
    setCurrentMeal((prev) => {
      const next = [...prev, { ...item, uniqueId: `${item.name}-${Date.now()}` }];
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: mealYRef.current, animated: true });
      }, 350);
      return next;
    });
  };

  const removeFromMeal = (uid: string) =>
    setCurrentMeal((prev) => prev.filter((i) => i.uniqueId !== uid));

  const saveMeal = () => {
    if (!hasMeal) return;
    setSavedMeals((prev) => [
      {
        id: Date.now().toString(),
        date: formatNow(),
        action: foodAction,
        items: currentMeal.map(({ uniqueId: _u, ...rest }) => rest),
        totals,
        estimatedGlycemia: postMeal?.value ?? null,
        currentGlucose: glucoseValue,
        unit: unit ?? 'mg/dL',
      },
      ...prev,
    ]);
    setCurrentMeal([]);
    setActiveTab('history');
  };

  const ACTION_OPTIONS = [
    { label: 'Lower',    value: 'lower'    as FoodAction, color: colors.normal },
    { label: 'Maintain', value: 'maintain' as FoodAction, color: colors.high },
    { label: 'Raise',    value: 'raise'    as FoodAction, color: colors.red },
  ];

  const renderFoodRow = (item: FoodItem, idx: number) => (
    <View key={`${item.name}-${idx}`} style={[s.foodRow, { backgroundColor: colors.bgCard }, idx > 0 && [s.foodRowBorder, { borderTopColor: colors.borderLight }]]}>
      <View style={s.foodInfo}>
        <Text style={[s.foodName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[s.foodMacros, { color: colors.textMuted }]}>
          Carbs {item.carbs}g · Sugars {item.sugars}g · Fiber {item.fiber}g
        </Text>
        <Text style={[s.foodMacros, { color: colors.textMuted }]}>
          Protein {item.protein}g · Fat {item.fat}g · {item.kcal} kcal · GI {item.gi}
        </Text>
      </View>
      <TouchableOpacity
        style={[s.addBtn, { borderColor: colors.red }]}
        onPress={() => addFoodToMeal(item)}
        activeOpacity={0.75}
      >
        <Text style={[s.addBtnText, { color: colors.red }]}>+ Add</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Planner ────────────────────────────────────────────────────────────────
  const renderPlanner = () => (
    <>
      {glucoseValue === null ? (
        <View style={[s.emptyCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={s.emptyIcon}>🩸</Text>
          <Text style={[s.emptyTitle, { color: colors.text }]}>No reading logged yet</Text>
          <Text style={[s.emptyText, { color: colors.textMuted }]}>
            Enter a blood sugar value on the Home tab to get personalised food recommendations.
          </Text>
        </View>
      ) : (
        <>
          {/* Current reading */}
          <View style={[s.readingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[s.readingLabel, { color: colors.textMuted }]}>Current glycemia</Text>
            <Text style={[s.readingValue, { color: colors.red }]}>{glucoseValue} {unit}</Text>
          </View>

          {/* Goal selector */}
          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>What would you like to do?</Text>
          <View style={s.pillRow}>
            {ACTION_OPTIONS.map((opt) => {
              const active = foodAction === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    s.pill,
                    { borderColor: opt.color },
                    active && { backgroundColor: opt.color },
                  ]}
                  onPress={() => {
                    setFoodAction(opt.value);
                    setExpandedGroup(null);
                    setSearchQuery('');
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[s.pillText, { color: active ? '#fff' : opt.color }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Skip meal — go straight to Meds */}
          <TouchableOpacity
            style={s.skipMealBtn}
            onPress={() => router.push('/medication')}
            activeOpacity={0.75}
          >
            <Text style={s.skipMealBtnText}>
              I'm not eating — go to Meds tab →
            </Text>
          </TouchableOpacity>

          {/* How it works — shown when no goal selected yet */}
          {foodAction === '' && (
            <View style={[s.howItWorksCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={[s.howItWorksTitle, { color: colors.text }]}>How it works</Text>
              <View style={s.howItWorksRow}>
                <Text style={[s.howItWorksStep, { backgroundColor: colors.red }]}>1</Text>
                <View style={s.howItWorksText}>
                  <Text style={[s.howItWorksLabel, { color: colors.text }]}>Pick a goal</Text>
                  <Text style={[s.howItWorksDesc, { color: colors.textMuted }]}>Choose whether you want to Lower, Maintain, or Raise your glycemia.</Text>
                </View>
              </View>
              <View style={s.howItWorksRow}>
                <Text style={[s.howItWorksStep, { backgroundColor: colors.red }]}>2</Text>
                <View style={s.howItWorksText}>
                  <Text style={[s.howItWorksLabel, { color: colors.text }]}>Browse foods</Text>
                  <Text style={[s.howItWorksDesc, { color: colors.textMuted }]}>Tap any category to expand it and explore recommended foods, drinks and snacks.</Text>
                </View>
              </View>
              <View style={s.howItWorksRow}>
                <Text style={[s.howItWorksStep, { backgroundColor: colors.red }]}>3</Text>
                <View style={s.howItWorksText}>
                  <Text style={[s.howItWorksLabel, { color: colors.text }]}>Build your meal</Text>
                  <Text style={[s.howItWorksDesc, { color: colors.textMuted }]}>Tap "+ Add" on any item. Your nutritional summary and estimated post-meal glycemia update live.</Text>
                </View>
              </View>
              <View style={s.howItWorksRow}>
                <Text style={[s.howItWorksStep, { backgroundColor: colors.red }]}>4</Text>
                <View style={s.howItWorksText}>
                  <Text style={[s.howItWorksLabel, { color: colors.text }]}>Save it</Text>
                  <Text style={[s.howItWorksDesc, { color: colors.textMuted }]}>Tap "Save Meal to History" to keep a record of what you ate and how it may affect your levels.</Text>
                </View>
              </View>
            </View>
          )}

          {/* Search bar */}
          {foodAction !== '' && (
            <View style={[s.searchBar, { borderColor: searchFocused ? colors.red : colors.border, backgroundColor: colors.inputBg }]}>
              <Text style={s.searchIcon}>🔍</Text>
              <TextInput
                style={[s.searchInput, { color: colors.text }]}
                placeholder="Search foods…"
                placeholderTextColor="#aaa"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                  <Text style={[s.searchClear, { color: colors.textFaint }]}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Lower tip */}
          {foodAction === 'lower' && !showSearch && (
            <View style={[s.noteCard, { backgroundColor: colors.normalBg, borderColor: '#c8e6c9' }]}>
              <Text style={[s.noteText, { color: colors.normal }]}>
                💡 Physical activity alongside low-GI foods helps lower blood sugar most effectively.
              </Text>
            </View>
          )}

          {/* Search results */}
          {showSearch && (
            <View style={[s.groupCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={s.groupHeader}>
                <Text style={[s.groupTitle, { color: colors.text }]}>Search Results</Text>
                <Text style={[s.groupCount, { color: colors.textMuted }]}>{searchResults.length} found</Text>
              </View>
              {searchResults.length === 0 ? (
                <Text style={[s.noResults, { color: colors.textMuted }]}>No foods match "{searchQuery}"</Text>
              ) : (
                searchResults.map((item, idx) => renderFoodRow(item, idx))
              )}
            </View>
          )}

          {/* Grouped food list */}
          {foodAction !== '' && !showSearch &&
            Object.entries(foodDatabase[foodAction]).map(([groupName, items]) => {
              const isOpen = expandedGroup === groupName;
              return (
                <View key={groupName} style={[s.groupCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={s.groupHeader}
                    onPress={() => setExpandedGroup(isOpen ? null : groupName)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.groupTitle, { color: colors.text }]}>{groupName}</Text>
                    <View style={s.groupHeaderRight}>
                      <Text style={[s.groupCount, { color: colors.textMuted }]}>{items.length} items</Text>
                      <Text style={[s.groupChevron, { color: colors.textMuted }]}>{isOpen ? '▲' : '▼'}</Text>
                    </View>
                  </TouchableOpacity>
                  {isOpen && items.map((item, idx) => renderFoodRow(item, idx))}
                </View>
              );
            })
          }

          {/* Meal builder */}
          {hasMeal && (
            <>
              <View style={s.divider} onLayout={onMealSectionLayout} />

              {/* Nutrition summary */}
              <View style={[s.statsCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <Text style={[s.statsTitle, { color: colors.textMuted }]}>Meal Nutrition Summary</Text>
                <NutrientGrid totals={totals} />
              </View>

              {/* Post-meal glycemia estimate */}
              {postMeal !== null && (() => {
                const col = statusColor(postMeal.value, postMeal.unit);
                return (
                  <View style={[s.glycemiaCard, { borderColor: col, backgroundColor: colors.bgCard }]}>
                    <View style={s.glycemiaRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.glycemiaLabel, { color: colors.text }]}>Estimated post-meal glycemia</Text>
                        <Text style={[s.glycemiaSub, { color: colors.textMuted }]}>
                          {totals.carbs.toFixed(1)}g carbs · current {glucoseValue} {unit}
                        </Text>
                      </View>
                      <View style={s.glycemiaRight}>
                        <Text style={[s.glycemiaValue, { color: col }]}>
                          {postMeal.value}
                        </Text>
                        <Text style={[s.glycemiaUnit, { color: col }]}>
                          {postMeal.unit}
                        </Text>
                        <Text style={[s.glycemiaStatus, { color: col }]}>
                          {statusLabel(postMeal.value, postMeal.unit)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[s.glycemiaDisclaimer, { color: colors.textFaint }]}>
                      ⚠️ Estimate only — individual response varies. Always verify with a reading.
                    </Text>
                  </View>
                );
              })()}

              {/* Selected items */}
              <View style={[s.groupCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <View style={s.groupHeader}>
                  <Text style={[s.groupTitle, { color: colors.text }]}>
                    Selected Items ({currentMeal.length})
                  </Text>
                  <TouchableOpacity
                    onPress={() => setCurrentMeal([])}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.clearAllText, { color: colors.red }]}>Clear all</Text>
                  </TouchableOpacity>
                </View>
                {currentMeal.map((item, idx) => (
                  <View
                    key={item.uniqueId}
                    style={[s.foodRow, idx > 0 && s.foodRowBorder]}
                  >
                    <Text style={[s.foodName, { flex: 1, color: colors.text }]}>{item.name}</Text>
                    <TouchableOpacity
                      onPress={() => removeFromMeal(item.uniqueId)}
                      style={[s.removeBtn, { borderColor: colors.border }]}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.removeBtnText, { color: colors.textMuted }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[s.saveMealBtn, { backgroundColor: colors.red }]}
                onPress={saveMeal}
                activeOpacity={0.75}
              >
                <Text style={s.saveMealBtnText}>Save Meal to History</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.backToListBtn, { borderColor: colors.red }]}
                onPress={() =>
                  scrollRef.current?.scrollTo({ y: 0, animated: true })
                }
                activeOpacity={0.75}
              >
                <Text style={[s.backToListBtnText, { color: colors.red }]}>↑ Back to food list</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </>
  );

  // ── History ────────────────────────────────────────────────────────────────
  const renderHistory = () => (
    <>
      {savedMeals.length === 0 ? (
        <>
          <View style={[s.emptyCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={s.emptyIcon}>🥗</Text>
            <Text style={[s.emptyTitle, { color: colors.text }]}>No meals saved yet</Text>
            <Text style={[s.emptyText, { color: colors.textMuted }]}>
              Build a meal in the Planner tab and tap "Save Meal to History".
            </Text>
          </View>
          <View style={[s.howItWorksCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[s.howItWorksTitle, { color: colors.text }]}>💡 Meal logging tips</Text>
            <View style={s.tipRow}>
              <Text style={[s.tipBullet, { color: colors.red }]}>•</Text>
              <Text style={[s.tipBody, { color: colors.textMuted }]}>Log meals consistently to spot patterns between what you eat and your glucose levels.</Text>
            </View>
            <View style={s.tipRow}>
              <Text style={[s.tipBullet, { color: colors.red }]}>•</Text>
              <Text style={[s.tipBody, { color: colors.textMuted }]}>High-GI foods raise blood sugar faster — use the GI value shown for each item as a guide.</Text>
            </View>
            <View style={s.tipRow}>
              <Text style={[s.tipBullet, { color: colors.red }]}>•</Text>
              <Text style={[s.tipBody, { color: colors.textMuted }]}>Fiber slows glucose absorption — meals higher in fiber generally cause a gentler rise.</Text>
            </View>
            <View style={s.tipRow}>
              <Text style={[s.tipBullet, { color: colors.red }]}>•</Text>
              <Text style={[s.tipBody, { color: colors.textMuted }]}>The post-meal estimate is a guide only. Always verify with an actual reading 1–2 hours after eating.</Text>
            </View>
            <View style={s.tipRow}>
              <Text style={[s.tipBullet, { color: colors.red }]}>•</Text>
              <Text style={[s.tipBody, { color: colors.textMuted }]}>Pair your meal plan with the Meds calculator for a complete picture of your insulin needs.</Text>
            </View>
          </View>
        </>
      ) : (
        savedMeals.map((meal) => {
          const isOpen      = expandedMealId === meal.id;
          const actionColor =
            meal.action === 'lower'    ? '#2e7d32' :
            meal.action === 'raise'    ? RED        : '#ef6c00';
          const estCol = meal.estimatedGlycemia !== null
            ? statusColor(meal.estimatedGlycemia, meal.unit)
            : '#888';

          return (
            <View key={meal.id} style={[s.groupCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <TouchableOpacity
                style={s.groupHeader}
                onPress={() => setExpandedMealId(isOpen ? null : meal.id)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <View style={s.mealHistoryTop}>
                    <Text style={[s.mealHistoryDate, { color: colors.text }]}>{meal.date}</Text>
                    <View style={[s.actionBadge, { borderColor: actionColor }]}>
                      <Text style={[s.actionBadgeText, { color: actionColor }]}>
                        {meal.action}
                      </Text>
                    </View>
                  </View>
                  <Text style={[s.mealHistorySub, { color: colors.textMuted }]}>
                    {meal.items.length} items ·{' '}
                    {meal.totals.carbs.toFixed(1)}g carbs ·{' '}
                    {meal.totals.kcal.toFixed(0)} kcal
                    {meal.estimatedGlycemia !== null
                      ? ` · est. ${meal.estimatedGlycemia} ${meal.unit}`
                      : ''}
                  </Text>
                </View>
                <Text style={[s.groupChevron, { marginLeft: 8 }]}>
                  {isOpen ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {isOpen && (
                <>
                  {meal.estimatedGlycemia !== null && (
                    <View style={[s.glycemiaCard, { margin: 10, marginTop: 0, borderColor: estCol, backgroundColor: colors.bgCard }]}>
                      <View style={s.glycemiaRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.glycemiaLabel, { color: colors.text }]}>Post-meal glycemia estimate</Text>
                          <Text style={[s.glycemiaSub, { color: colors.textMuted }]}>
                            Before meal: {meal.currentGlucose} {meal.unit}
                          </Text>
                        </View>
                        <View style={s.glycemiaRight}>
                          <Text style={[s.glycemiaValue, { color: estCol }]}>
                            {meal.estimatedGlycemia}
                          </Text>
                          <Text style={[s.glycemiaUnit, { color: estCol }]}>
                            {meal.unit}
                          </Text>
                          <Text style={[s.glycemiaStatus, { color: estCol }]}>
                            {statusLabel(meal.estimatedGlycemia, meal.unit)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  <View style={[s.statsCard, { margin: 10, marginTop: 0 }]}>
                    <Text style={[s.statsTitle, { color: colors.textMuted }]}>Nutritional Summary</Text>
                    <NutrientGrid totals={meal.totals} />
                  </View>

                  <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
                    <Text style={[s.groupTitle, { fontSize: 13, marginBottom: 6 }]}>
                      Items
                    </Text>
                    {meal.items.map((item, idx) => (
                      <Text key={idx} style={[s.historyItemName, { color: colors.textMuted }]}>
                        • {item.name}
                      </Text>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={s.deleteMealBtn}
                    onPress={() =>
                      setSavedMeals((prev) => prev.filter((m) => m.id !== meal.id))
                    }
                    activeOpacity={0.75}
                  >
                    <Text style={[s.deleteMealBtnText, { color: colors.textMuted }]}>Delete this meal</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          );
        })
      )}
    </>
  );

  // ── Root ───────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      ref={scrollRef}
      style={[s.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={s.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[s.title, { color: colors.text }]}>Meal Planner & Food Guide</Text>

      <View style={[s.tabRow, { borderColor: colors.red }]}>
        {(['planner', 'history'] as ActiveTab[]).map((t) => {
          const active = activeTab === t;
          return (
            <TouchableOpacity
              key={t}
              style={[s.tabBtn, { backgroundColor: active ? colors.red : colors.bg }]}
              onPress={() => setActiveTab(t)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabBtnText, { color: active ? '#fff' : colors.red }]}>
                {t === 'planner'
                  ? 'Planner'
                  : `History${savedMeals.length > 0 ? ` (${savedMeals.length})` : ''}`}
              </Text>
            </TouchableOpacity>
                      );
        })}
      </View>

      {activeTab === 'planner' ? renderPlanner() : renderHistory()}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#ffffff' },
  contentContainer: { padding: 16, paddingBottom: 48 },

  title: {
    fontSize: 18, fontWeight: '600', textAlign: 'center',
    color: '#222222', marginBottom: 12,
  },

  tabRow:           { flexDirection: 'row', borderRadius: 8, borderWidth: 1.5, borderColor: '#EC5557', overflow: 'hidden', marginBottom: 16 },
  tabBtn:           { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: '#ffffff' },
  tabBtnActive:     { backgroundColor: '#EC5557' },
  tabBtnText:       { fontSize: 14, fontWeight: '600', color: '#EC5557' },
  tabBtnTextActive: { color: '#fff' },

  emptyCard:  { minHeight: Dimensions.get('window').height - 280, borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#fafafa', padding: 24, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  emptyIcon:  { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#222222', marginBottom: 6 },
  emptyText:  { fontSize: 14, color: '#666666', textAlign: 'center', lineHeight: 20 },

  readingCard:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#fafafa', paddingHorizontal: 16, paddingVertical: 10, marginBottom: 14 },
  readingLabel: { fontSize: 13, color: '#666666' },
  readingValue: { fontSize: 16, fontWeight: '800' },

  sectionLabel: { fontSize: 13, color: '#666666', textAlign: 'center', marginBottom: 10, lineHeight: 18 },

  pillRow:  { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 14 },
  pill:     { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 6, borderWidth: 1.5, minWidth: 84, alignItems: 'center' },
  pillText: { fontSize: 14, fontWeight: '600' },

  searchBar:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 8 : 4, marginBottom: 12, backgroundColor: '#ffffff' },
  searchBarFocused: { borderColor: '#EC5557' },
  searchIcon:       { fontSize: 14, marginRight: 6 },
  searchInput:      { flex: 1, fontSize: 14, color: '#222222' },
  searchClear:      { fontSize: 13, color: '#aaaaaa', paddingLeft: 6 },
  noResults:        { fontSize: 13, color: '#666666', textAlign: 'center', padding: 14 },

  noteCard: { borderRadius: 10, borderWidth: 1, borderColor: '#c8e6c9', backgroundColor: '#f1f8f1', padding: 12, marginBottom: 12 },
  noteText: { fontSize: 13, color: '#2e7d32', lineHeight: 18 },

  groupCard:        { borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#fafafa', marginBottom: 10, overflow: 'hidden' },
  groupHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  groupHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupTitle:       { fontSize: 15, fontWeight: '700', color: '#222222' },
  groupChevron:     { fontSize: 12, color: '#666666' },
  groupCount:       { fontSize: 12, color: '#666666' },

  foodRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  foodRowBorder: { borderTopWidth: 1 },
  foodInfo:      { flex: 1, marginRight: 10 },
  foodName:      { fontSize: 13, fontWeight: '600', color: '#222222', marginBottom: 2 },
  foodMacros:    { fontSize: 11, color: '#666666', lineHeight: 16 },

  addBtn:     { paddingHorizontal: 12, paddingVertical: 5, backgroundColor: 'transparent', borderRadius: 5, borderWidth: 1.5 },
  addBtnText: { fontSize: 12, fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 14 },

  statsCard:  { borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#fafafa', padding: 12, marginBottom: 10 },
  statsTitle: { fontSize: 10, fontWeight: '700', color: '#666666', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center', marginBottom: 10 },
  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statItem:   { width: '25%', alignItems: 'center', marginBottom: 10 },
  statNumber: { fontSize: 13, fontWeight: '800', color: '#222222', marginBottom: 1 },
  statLabel:  { fontSize: 9, color: '#666666', fontWeight: '500' },

  glycemiaCard:       { borderRadius: 10, borderWidth: 1.5, padding: 12, marginBottom: 10 },
  glycemiaRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  glycemiaLabel:      { fontSize: 13, fontWeight: '700', color: '#222222' },
  glycemiaSub:        { fontSize: 11, color: '#666666', marginTop: 2 },
  glycemiaRight:      { alignItems: 'flex-end' },
  glycemiaValue:      { fontSize: 26, fontWeight: '900', lineHeight: 28 },
  glycemiaUnit:       { fontSize: 12, fontWeight: '600' },
  glycemiaStatus:     { fontSize: 12, fontWeight: '700', marginTop: 1 },
  glycemiaDisclaimer: { fontSize: 11, color: '#666666', lineHeight: 16 },

  clearAllText:  { fontSize: 12, color: '#EC5557', fontWeight: '600' },
  removeBtn:     { paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 5 },
  removeBtnText: { fontSize: 12, color: '#666666', fontWeight: '600' },

  saveMealBtn:     { borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  saveMealBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },

  backToListBtn:     { borderRadius: 8, paddingVertical: 11, alignItems: 'center', marginTop: 8, borderWidth: 1.5 },
  backToListBtnText: { fontSize: 14, fontWeight: '600' },

  skipMealBtn:     { alignItems: 'center', paddingVertical: 8, marginBottom: 10 },
  skipMealBtnText: { fontSize: 13, color: '#aaaaaa', textDecorationLine: 'underline' },

  // How it works card
  howItWorksCard:  { borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#fafafa', padding: 14, marginBottom: 12 },
  howItWorksTitle: { fontSize: 13, fontWeight: '700', color: '#222222', marginBottom: 12 },
  howItWorksRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  howItWorksStep:  { width: 24, height: 24, borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: '800', textAlign: 'center', lineHeight: 24, overflow: 'hidden' },
  howItWorksText:  { flex: 1 },
  howItWorksLabel: { fontSize: 13, fontWeight: '700', color: '#222222', marginBottom: 2 },
  howItWorksDesc:  { fontSize: 12, color: '#666666', lineHeight: 17 },

  // Tips
  tipRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  tipBullet: { fontSize: 14, fontWeight: '800', marginTop: 1 },
  tipBody:   { flex: 1, fontSize: 13, color: '#666666', lineHeight: 18 },

  mealHistoryTop:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  mealHistoryDate:   { fontSize: 13, fontWeight: '600', color: '#222222' },
  mealHistorySub:    { fontSize: 12, color: '#666666' },
  actionBadge:       { borderWidth: 1.5, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  actionBadgeText:   { fontSize: 11, fontWeight: '700' },
  historyItemName:   { fontSize: 13, color: '#666666', lineHeight: 20 },
  deleteMealBtn:     { margin: 10, marginTop: 0, paddingVertical: 8, borderRadius: 6, borderWidth: 1.5, borderColor: '#e0e0e0', alignItems: 'center' },
  deleteMealBtnText: { fontSize: 13, color: '#666666', fontWeight: '600' },
});