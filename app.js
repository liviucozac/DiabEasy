const App = () => {
 const getCurrentTab = () => {
  const hash = window.location.hash.substring(1); // Remove #
  return [
   "Home",
   "History",
   "Food Guide",
   "Medication",
   "Emergency",
   "Profile"
  ].includes(hash)
   ? hash
   : "Home";
 };

 // State declarations
 const [activeTab, setActiveTab] = React.useState("Home");
 const [unit, setUnit] = React.useState("mg/dL");
 const [inputValue, setInputValue] = React.useState("");
 const [glucoseValue, setGlucoseValue] = React.useState(null);
 const [history, setHistory] = React.useState([]);
 const [fasting, setFasting] = React.useState("");
 const [symptoms, setSymptoms] = React.useState("");
 const [filterDateFrom, setFilterDateFrom] = React.useState("");
 const [filterDateTo, setFilterDateTo] = React.useState("");
 const [filterMin, setFilterMin] = React.useState("");
 const [filterMax, setFilterMax] = React.useState("");
 const [unitFilter, setUnitFilter] = React.useState("");
 const [foodAction, setFoodAction] = React.useState("");
 const [selectedFoods, setSelectedFoods] = React.useState([]);
 const [currentMeal, setCurrentMeal] = React.useState([]);
 const totalCarbs = currentMeal.reduce((sum, item) => sum + item.carbs, 0);
 const totalSugars = currentMeal.reduce((sum, item) => sum + item.sugars, 0);
 const [address, setAddress] = React.useState("");
 const [isf, setIsf] = React.useState("");
 const [carbRatio, setCarbRatio] = React.useState("");
 const [targetGlycemia, setTargetGlycemia] = React.useState("");
 const [insulinType, setInsulinType] = React.useState("Rapid-acting");
 const [customName, setCustomName] = React.useState("");
 const [units, setUnits] = React.useState("");
 const [unitType, setUnitType] = React.useState("mg/dL");
 const [timeTaken, setTimeTaken] = React.useState("");
 const [entries, setEntries] = React.useState([]);
 const [showHypoPopup, setShowHypoPopup] = React.useState(false);
 const [showHyperPopup, setShowHyperPopup] = React.useState(false);
 const [showRecommendationPopup, setShowRecommendationPopup] = React.useState(
  false
 );
 const [showHyperRecPopup, setShowHyperRecPopup] = React.useState(false);
 const [theme, setTheme] = React.useState("light");
 {
  /* dark theme logo switcher */
 }
 const [defaultGlucoseUnit, setDefaultGlucoseUnit] = React.useState("mg/dL");
 const [insulinUnits, setInsulinUnits] = React.useState(0);
 const [authMode, setAuthMode] = React.useState("signIn");

 const addToMeal = (item) => {
  setSelectedFoods((prev) => [...prev, item]);
 };

 // Form submission handler
 const handleSubmit = () => {
  if (inputValue) {
   const value = Number(inputValue);
   const now = new Date();
   const timestamp = `${String(now.getDate()).padStart(2, "0")}/${String(
    now.getMonth() + 1
   ).padStart(2, "0")}/${now.getFullYear()} ${now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
   })}`;

   const interpretation = getInterpretation(value, unit);
   setGlucoseValue(value);

   const colorClass = getColorClass(value, unit);

   if (colorClass === "low") {
    setShowRecommendationPopup(true);
   } else if (colorClass === "high") {
    setShowHyperRecPopup(true); // 🔥 trigger hyperglycemia popup
   }

   setHistory((prev) => [
    ...prev,
    {
     value,
     unit,
     timestamp,
     interpretation,
     fasting,
     symptoms
    }
   ]);
   setInputValue("");
   setSymptoms("");
  }
 };

 // Clear all filters
 const clearFilters = () => {
  setFilterDateFrom("");
  setFilterDateTo("");
  setFilterMin("");
  setFilterMax("");
  setUnitFilter("");
 };

 // Determine CSS class based on glucose value
 const getColorClass = (value, unit) => {
  if (unit === "mg/dL") {
   if (value < 75) return "low";
   if (value <= 150) return "normal";
   return "high";
  } else {
   if (value < 4.2) return "low";
   if (value <= 8.3) return "normal";
   return "high";
  }
 };

 // Get interpretation text for glucose value
 const getInterpretation = (value, unit) => {
  if (unit === "mg/dL") {
   if (value < 75) return "Low";
   if (value <= 150) return "Normal";
   return "High";
  } else {
   if (value < 4.2) return "Low";
   if (value <= 8.3) return "Normal";
   return "High";
  }
 };

 const filteredHistory = history.filter((entry) => {
  // Unit filtering
  if (unitFilter && entry.unit !== unitFilter) return false;

  // Date filtering
  const entryDate = entry.timestamp.split(" ")[0]; // dd/mm/yyyy
  const [d, m, y] = entryDate.split("/");
  const formattedEntryDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`; // yyyy-mm-dd

  let matchesDateRange = true;
  if (filterDateFrom && filterDateTo) {
   matchesDateRange =
    formattedEntryDate >= filterDateFrom && formattedEntryDate <= filterDateTo;
  } else if (filterDateFrom) {
   matchesDateRange = formattedEntryDate >= filterDateFrom;
  } else if (filterDateTo) {
   matchesDateRange = formattedEntryDate <= filterDateTo;
  }

  // Value range filtering
  const matchesMin = !filterMin || entry.value >= parseFloat(filterMin);
  const matchesMax = !filterMax || entry.value <= parseFloat(filterMax);

  return matchesDateRange && matchesMin && matchesMax;
 });

 const foodDatabase = {
  raise: {
   Drinks: [
    {
     name: "Orange Juice (200ml)",
     carbs: 22,
     sugars: 20,
     fiber: 0.5,
     protein: 1.7,
     fat: 0.3,
     kcal: 85,
     gi: 50,
     sodium: 2,
     potassium: 400
    },
    {
     name: "Apple Juice (200ml)",
     carbs: 24,
     sugars: 22,
     fiber: 0.2,
     protein: 0.2,
     fat: 0.1,
     kcal: 96,
     gi: 44,
     sodium: 10,
     potassium: 250
    },
    {
     name: "Gatorade (250ml)",
     carbs: 14,
     sugars: 14,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 56,
     gi: 78,
     sodium: 160,
     potassium: 45
    },
    {
     name: "Whole Milk (200ml)",
     carbs: 10,
     sugars: 10,
     fiber: 0,
     protein: 7,
     fat: 8,
     kcal: 150,
     gi: 41,
     sodium: 120,
     potassium: 380
    },
    {
     name: "Sweetened Iced Tea (250ml)",
     carbs: 26,
     sugars: 25,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 104,
     gi: 65,
     sodium: 15,
     potassium: 30
    },
    {
     name: "Coconut Water (250ml)",
     carbs: 9,
     sugars: 6,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 45,
     gi: 55,
     sodium: 30,
     potassium: 600
    },
    {
     name: "Hot Chocolate (200ml)",
     carbs: 26,
     sugars: 20,
     fiber: 1,
     protein: 4,
     fat: 3,
     kcal: 140,
     gi: 60,
     sodium: 120,
     potassium: 200
    },
    {
     name: "Lemonade (250ml)",
     carbs: 27,
     sugars: 26,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 110,
     gi: 54,
     sodium: 10,
     potassium: 20
    },
    {
     name: "Soy Milk (200ml)",
     carbs: 12,
     sugars: 8,
     fiber: 1,
     protein: 7,
     fat: 4,
     kcal: 120,
     gi: 44,
     sodium: 100,
     potassium: 300
    },
    {
     name: "Mango Lassi (200ml)",
     carbs: 30,
     sugars: 28,
     fiber: 0.5,
     protein: 5,
     fat: 3,
     kcal: 170,
     gi: 60,
     sodium: 50,
     potassium: 250
    },
    {
     name: "Pineapple Juice (200ml)",
     carbs: 26,
     sugars: 24,
     fiber: 0.5,
     protein: 0.5,
     fat: 0.2,
     kcal: 110,
     gi: 58,
     sodium: 2,
     potassium: 300
    },
    {
     name: "Grape Juice (200ml)",
     carbs: 36,
     sugars: 34,
     fiber: 0.2,
     protein: 0.5,
     fat: 0.1,
     kcal: 150,
     gi: 55,
     sodium: 10,
     potassium: 200
    },
    {
     name: "Chocolate Milk (200ml)",
     carbs: 26,
     sugars: 24,
     fiber: 1,
     protein: 8,
     fat: 5,
     kcal: 180,
     gi: 45,
     sodium: 150,
     potassium: 400
    },
    {
     name: "Energy Drink (250ml)",
     carbs: 28,
     sugars: 27,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 110,
     gi: 68,
     sodium: 200,
     potassium: 60
    },
    {
     name: "Sweetened Almond Milk (200ml)",
     carbs: 16,
     sugars: 15,
     fiber: 1,
     protein: 1,
     fat: 3,
     kcal: 90,
     gi: 50,
     sodium: 150,
     potassium: 50
    }
   ],
   Foods: [
    {
     name: "White Bread (1 slice)",
     carbs: 15,
     sugars: 2,
     fiber: 0.8,
     protein: 3,
     fat: 1,
     kcal: 80,
     gi: 75,
     sodium: 150,
     potassium: 30
    },
    {
     name: "White Rice (100g cooked)",
     carbs: 28,
     sugars: 0,
     fiber: 0.4,
     protein: 2.7,
     fat: 0.3,
     kcal: 130,
     gi: 70,
     sodium: 1,
     potassium: 35
    },
    {
     name: "Cornflakes (30g)",
     carbs: 26,
     sugars: 3,
     fiber: 1,
     protein: 2,
     fat: 0.2,
     kcal: 110,
     gi: 81,
     sodium: 290,
     potassium: 35
    },
    {
     name: "Mashed Potato (100g)",
     carbs: 17,
     sugars: 1,
     fiber: 1.5,
     protein: 2,
     fat: 4,
     kcal: 110,
     gi: 85,
     sodium: 300,
     potassium: 300
    },
    {
     name: "Pancake (1 medium)",
     carbs: 22,
     sugars: 5,
     fiber: 1,
     protein: 4,
     fat: 3,
     kcal: 130,
     gi: 67,
     sodium: 250,
     potassium: 90
    },
    {
     name: "Bagel (1 medium)",
     carbs: 50,
     sugars: 6,
     fiber: 2,
     protein: 10,
     fat: 1,
     kcal: 250,
     gi: 72,
     sodium: 400,
     potassium: 100
    },
    {
     name: "Pasta (100g cooked)",
     carbs: 30,
     sugars: 1,
     fiber: 2,
     protein: 5,
     fat: 1,
     kcal: 150,
     gi: 65,
     sodium: 5,
     potassium: 50
    },
    {
     name: "French Fries (100g)",
     carbs: 35,
     sugars: 0,
     fiber: 3,
     protein: 3,
     fat: 15,
     kcal: 270,
     gi: 75,
     sodium: 200,
     potassium: 400
    },
    {
     name: "Doughnut (1 medium)",
     carbs: 30,
     sugars: 15,
     fiber: 1,
     protein: 3,
     fat: 10,
     kcal: 220,
     gi: 76,
     sodium: 250,
     potassium: 60
    },
    {
     name: "Waffle (1 medium)",
     carbs: 25,
     sugars: 5,
     fiber: 1,
     protein: 4,
     fat: 5,
     kcal: 150,
     gi: 70,
     sodium: 300,
     potassium: 80
    },
    {
     name: "Couscous (100g cooked)",
     carbs: 23,
     sugars: 0,
     fiber: 1.5,
     protein: 4,
     fat: 0.3,
     kcal: 110,
     gi: 65,
     sodium: 10,
     potassium: 60
    },
    {
     name: "Biscuit (1 medium)",
     carbs: 20,
     sugars: 5,
     fiber: 1,
     protein: 2,
     fat: 5,
     kcal: 140,
     gi: 70,
     sodium: 300,
     potassium: 40
    },
    {
     name: "Croissant (1 medium)",
     carbs: 26,
     sugars: 6,
     fiber: 1.5,
     protein: 5,
     fat: 12,
     kcal: 230,
     gi: 67,
     sodium: 350,
     potassium: 70
    },
    {
     name: "Granola (50g)",
     carbs: 32,
     sugars: 12,
     fiber: 3,
     protein: 5,
     fat: 10,
     kcal: 240,
     gi: 60,
     sodium: 100,
     potassium: 150
    },
    {
     name: "Oatmeal (instant, 1 packet)",
     carbs: 32,
     sugars: 12,
     fiber: 3,
     protein: 5,
     fat: 2,
     kcal: 160,
     gi: 79,
     sodium: 200,
     potassium: 120
    }
   ],
   Snacks: [
    {
     name: "Gummy Bears (30g)",
     carbs: 24,
     sugars: 18,
     fiber: 0,
     protein: 2,
     fat: 0,
     kcal: 104,
     gi: 78,
     sodium: 25,
     potassium: 0
    },
    {
     name: "Raisins (30g)",
     carbs: 22,
     sugars: 18,
     fiber: 1,
     protein: 1,
     fat: 0.2,
     kcal: 90,
     gi: 64,
     sodium: 5,
     potassium: 250
    },
    {
     name: "Honey (1 tbsp)",
     carbs: 17,
     sugars: 17,
     fiber: 0,
     protein: 0.1,
     fat: 0,
     kcal: 64,
     gi: 58,
     sodium: 1,
     potassium: 10
    },
    {
     name: "Granola Bar (1 bar)",
     carbs: 20,
     sugars: 10,
     fiber: 2,
     protein: 3,
     fat: 5,
     kcal: 140,
     gi: 66,
     sodium: 80,
     potassium: 100
    },
    {
     name: "Dried Mango (30g)",
     carbs: 23,
     sugars: 20,
     fiber: 1,
     protein: 0.5,
     fat: 0.3,
     kcal: 95,
     gi: 60,
     sodium: 2,
     potassium: 200
    },
    {
     name: "Jelly Beans (30g)",
     carbs: 28,
     sugars: 25,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 110,
     gi: 80,
     sodium: 20,
     potassium: 0
    },
    {
     name: "Chocolate Bar (30g)",
     carbs: 18,
     sugars: 16,
     fiber: 1,
     protein: 2,
     fat: 9,
     kcal: 160,
     gi: 55,
     sodium: 30,
     potassium: 100
    },
    {
     name: "Caramel Popcorn (30g)",
     carbs: 22,
     sugars: 15,
     fiber: 1,
     protein: 1,
     fat: 5,
     kcal: 140,
     gi: 65,
     sodium: 150,
     potassium: 50
    },
    {
     name: "Fruit Leather (1 piece)",
     carbs: 20,
     sugars: 15,
     fiber: 1,
     protein: 0,
     fat: 0,
     kcal: 80,
     gi: 60,
     sodium: 10,
     potassium: 50
    },
    {
     name: "Rice Cakes (2 cakes)",
     carbs: 28,
     sugars: 2,
     fiber: 1,
     protein: 2,
     fat: 1,
     kcal: 120,
     gi: 82,
     sodium: 50,
     potassium: 30
    },
    {
     name: "Pretzels (30g)",
     carbs: 23,
     sugars: 1,
     fiber: 1,
     protein: 3,
     fat: 1,
     kcal: 110,
     gi: 83,
     sodium: 350,
     potassium: 50
    },
    {
     name: "Candy Corn (30g)",
     carbs: 26,
     sugars: 22,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 110,
     gi: 70,
     sodium: 25,
     potassium: 0
    },
    {
     name: "Maple Syrup (1 tbsp)",
     carbs: 13,
     sugars: 12,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 52,
     gi: 65,
     sodium: 2,
     potassium: 40
    },
    {
     name: "Fruit Yogurt (100g)",
     carbs: 20,
     sugars: 18,
     fiber: 0,
     protein: 4,
     fat: 2,
     kcal: 110,
     gi: 50,
     sodium: 60,
     potassium: 200
    },
    {
     name: "Sweetened Cereal (30g)",
     carbs: 25,
     sugars: 12,
     fiber: 1,
     protein: 2,
     fat: 1,
     kcal: 120,
     gi: 77,
     sodium: 200,
     potassium: 50
    }
   ]
  },
  maintain: {
   Drinks: [
    {
     name: "Water (250ml)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 0,
     gi: 0,
     sodium: 0,
     potassium: 0
    },
    {
     name: "Black Coffee (250ml)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 0.3,
     fat: 0,
     kcal: 2,
     gi: 0,
     sodium: 5,
     potassium: 90
    },
    {
     name: "Unsweetened Tea (250ml)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 0,
     gi: 0,
     sodium: 5,
     potassium: 20
    },
    {
     name: "Almond Milk (unsweetened, 200ml)",
     carbs: 2,
     sugars: 0,
     fiber: 1,
     protein: 1,
     fat: 3,
     kcal: 35,
     gi: 25,
     sodium: 150,
     potassium: 50
    },
    {
     name: "Sparkling Water (250ml)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 0,
     gi: 0,
     sodium: 0,
     potassium: 0
    },
    {
     name: "Coconut Water (unsweetened, 250ml)",
     carbs: 9,
     sugars: 6,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 45,
     gi: 55,
     sodium: 30,
     potassium: 600
    },
    {
     name: "Herbal Tea (250ml)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 0,
     gi: 0,
     sodium: 0,
     potassium: 0
    },
    {
     name: "Kombucha (250ml)",
     carbs: 7,
     sugars: 4,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 30,
     gi: 30,
     sodium: 10,
     potassium: 50
    },
    {
     name: "Vegetable Juice (low-sodium, 250ml)",
     carbs: 10,
     sugars: 7,
     fiber: 1,
     protein: 2,
     fat: 0,
     kcal: 50,
     gi: 40,
     sodium: 50,
     potassium: 400
    },
    {
     name: "Soy Milk (unsweetened, 200ml)",
     carbs: 4,
     sugars: 1,
     fiber: 1,
     protein: 7,
     fat: 4,
     kcal: 80,
     gi: 30,
     sodium: 90,
     potassium: 300
    },
    {
     name: "Oat Milk (unsweetened, 200ml)",
     carbs: 7,
     sugars: 0,
     fiber: 1,
     protein: 2,
     fat: 3,
     kcal: 60,
     gi: 35,
     sodium: 100,
     potassium: 100
    },
    {
     name: "Green Tea (250ml)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 0,
     gi: 0,
     sodium: 0,
     potassium: 20
    },
    {
     name: "Lemon Water (250ml)",
     carbs: 1,
     sugars: 0.5,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 5,
     gi: 0,
     sodium: 1,
     potassium: 30
    },
    {
     name: "Chamomile Tea (250ml)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 0,
     gi: 0,
     sodium: 0,
     potassium: 0
    },
    {
     name: "Peppermint Tea (250ml)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 0,
     gi: 0,
     sodium: 0,
     potassium: 0
    }
   ],
   Foods: [
    {
     name: "Grilled Chicken (100g)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 25,
     fat: 3,
     kcal: 165,
     gi: 0,
     sodium: 70,
     potassium: 300
    },
    {
     name: "Salmon (100g)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 20,
     fat: 13,
     kcal: 208,
     gi: 0,
     sodium: 60,
     potassium: 380
    },
    {
     name: "Greek Yogurt (100g)",
     carbs: 3,
     sugars: 3,
     fiber: 0,
     protein: 10,
     fat: 0.4,
     kcal: 59,
     gi: 35,
     sodium: 36,
     potassium: 141
    },
    {
     name: "Quinoa (100g cooked)",
     carbs: 21,
     sugars: 1,
     fiber: 2.8,
     protein: 4.4,
     fat: 1.9,
     kcal: 120,
     gi: 53,
     sodium: 7,
     potassium: 172
    },
    {
     name: "Egg (1 large)",
     carbs: 0.6,
     sugars: 0.6,
     fiber: 0,
     protein: 6,
     fat: 5,
     kcal: 70,
     gi: 0,
     sodium: 70,
     potassium: 70
    },
    {
     name: "Turkey Breast (100g)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 24,
     fat: 2,
     kcal: 135,
     gi: 0,
     sodium: 60,
     potassium: 300
    },
    {
     name: "Tofu (100g)",
     carbs: 2,
     sugars: 0,
     fiber: 1,
     protein: 8,
     fat: 4,
     kcal: 80,
     gi: 15,
     sodium: 10,
     potassium: 150
    },
    {
     name: "Lean Beef (100g)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 26,
     fat: 8,
     kcal: 180,
     gi: 0,
     sodium: 70,
     potassium: 350
    },
    {
     name: "Brown Rice (100g cooked)",
     carbs: 23,
     sugars: 0,
     fiber: 2,
     protein: 3,
     fat: 1,
     kcal: 110,
     gi: 50,
     sodium: 5,
     potassium: 85
    },
    {
     name: "Sweet Potato (100g cooked)",
     carbs: 20,
     sugars: 6,
     fiber: 3,
     protein: 2,
     fat: 0,
     kcal: 90,
     gi: 54,
     sodium: 40,
     potassium: 350
    },
    {
     name: "Whole Wheat Bread (1 slice)",
     carbs: 12,
     sugars: 2,
     fiber: 2,
     protein: 4,
     fat: 1,
     kcal: 80,
     gi: 60,
     sodium: 150,
     potassium: 70
    },
    {
     name: "Lentils (100g cooked)",
     carbs: 20,
     sugars: 2,
     fiber: 8,
     protein: 9,
     fat: 0,
     kcal: 120,
     gi: 30,
     sodium: 5,
     potassium: 350
    },
    {
     name: "Chickpeas (100g cooked)",
     carbs: 20,
     sugars: 3,
     fiber: 6,
     protein: 8,
     fat: 2,
     kcal: 130,
     gi: 28,
     sodium: 10,
     potassium: 250
    },
    {
     name: "Oats (50g dry)",
     carbs: 27,
     sugars: 1,
     fiber: 4,
     protein: 5,
     fat: 3,
     kcal: 150,
     gi: 55,
     sodium: 1,
     potassium: 150
    },
    {
     name: "Black Beans (100g cooked)",
     carbs: 20,
     sugars: 0,
     fiber: 8,
     protein: 8,
     fat: 0,
     kcal: 120,
     gi: 30,
     sodium: 5,
     potassium: 350
    }
   ],
   Snacks: [
    {
     name: "Almonds (30g)",
     carbs: 6,
     sugars: 1,
     fiber: 3,
     protein: 6,
     fat: 14,
     kcal: 170,
     gi: 15,
     sodium: 0,
     potassium: 200
    },
    {
     name: "Celery Sticks (100g)",
     carbs: 3,
     sugars: 2,
     fiber: 1.6,
     protein: 0.7,
     fat: 0.2,
     kcal: 14,
     gi: 15,
     sodium: 80,
     potassium: 260
    },
    {
     name: "Cucumber (100g)",
     carbs: 2,
     sugars: 1,
     fiber: 0.5,
     protein: 0.7,
     fat: 0.1,
     kcal: 8,
     gi: 10,
     sodium: 2,
     potassium: 150
    },
    {
     name: "Cheese Cubes (30g)",
     carbs: 1,
     sugars: 0,
     fiber: 0,
     protein: 7,
     fat: 9,
     kcal: 110,
     gi: 0,
     sodium: 180,
     potassium: 30
    },
    {
     name: "Hard-Boiled Egg (1 large)",
     carbs: 0.6,
     sugars: 0.6,
     fiber: 0,
     protein: 6,
     fat: 5,
     kcal: 70,
     gi: 0,
     sodium: 70,
     potassium: 70
    },
    {
     name: "Walnuts (30g)",
     carbs: 4,
     sugars: 0.7,
     fiber: 2,
     protein: 4.3,
     fat: 18,
     kcal: 185,
     gi: 15,
     sodium: 1,
     potassium: 125
    },
    {
     name: "Peanut Butter (1 tbsp)",
     carbs: 3,
     sugars: 1,
     fiber: 1,
     protein: 4,
     fat: 8,
     kcal: 95,
     gi: 14,
     sodium: 75,
     potassium: 105
    },
    {
     name: "Hummus (2 tbsp)",
     carbs: 5,
     sugars: 0,
     fiber: 2,
     protein: 2,
     fat: 5,
     kcal: 70,
     gi: 10,
     sodium: 120,
     potassium: 100
    },
    {
     name: "Edamame (50g)",
     carbs: 5,
     sugars: 1,
     fiber: 3,
     protein: 7,
     fat: 3,
     kcal: 80,
     gi: 15,
     sodium: 10,
     potassium: 250
    },
    {
     name: "Pumpkin Seeds (30g)",
     carbs: 5,
     sugars: 0.5,
     fiber: 1,
     protein: 9,
     fat: 13,
     kcal: 160,
     gi: 10,
     sodium: 5,
     potassium: 260
    },
    {
     name: "Sunflower Seeds (30g)",
     carbs: 6,
     sugars: 1,
     fiber: 2,
     protein: 6,
     fat: 14,
     kcal: 165,
     gi: 20,
     sodium: 1,
     potassium: 240
    },
    {
     name: "Cottage Cheese (100g)",
     carbs: 3,
     sugars: 3,
     fiber: 0,
     protein: 11,
     fat: 4,
     kcal: 100,
     gi: 30,
     sodium: 400,
     potassium: 100
    },
    {
     name: "Olives (30g)",
     carbs: 2,
     sugars: 0,
     fiber: 1,
     protein: 0,
     fat: 5,
     kcal: 50,
     gi: 15,
     sodium: 300,
     potassium: 10
    },
    {
     name: "Bell Pepper (100g)",
     carbs: 4,
     sugars: 2,
     fiber: 1.5,
     protein: 1,
     fat: 0,
     kcal: 20,
     gi: 15,
     sodium: 3,
     potassium: 200
    },
    {
     name: "Baby Carrots (100g)",
     carbs: 8,
     sugars: 5,
     fiber: 2,
     protein: 1,
     fat: 0,
     kcal: 40,
     gi: 20,
     sodium: 70,
     potassium: 250
    }
   ]
  },
  lower: {
   Drinks: [
    {
     name: "Green Tea (250ml)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 0,
     gi: 0,
     sodium: 0,
     potassium: 20
    },
    {
     name: "Lemon Water (250ml)",
     carbs: 1,
     sugars: 0.5,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 5,
     gi: 0,
     sodium: 1,
     potassium: 30
    },
    {
     name: "Apple Cider Vinegar (1 tbsp in water)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 1,
     gi: 0,
     sodium: 0,
     potassium: 15
    },
    {
     name: "Cinnamon Tea (250ml)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 0,
     gi: 0,
     sodium: 0,
     potassium: 10
    },
    {
     name: "Chamomile Tea (250ml)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 0,
     gi: 0,
     sodium: 0,
     potassium: 0
    },
    {
     name: "Ginger Tea (250ml)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 0,
     gi: 0,
     sodium: 0,
     potassium: 10
    },
    {
     name: "Hibiscus Tea (250ml)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 0,
     gi: 0,
     sodium: 0,
     potassium: 20
    },
    {
     name: "Dandelion Tea (250ml)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 0,
     gi: 0,
     sodium: 0,
     potassium: 0
    },
    {
     name: "Peppermint Tea (250ml)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 0,
     gi: 0,
     sodium: 0,
     potassium: 0
    },
    {
     name: "White Tea (250ml)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 0,
     gi: 0,
     sodium: 0,
     potassium: 10
    },
    {
     name: "Rooibos Tea (250ml)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 0,
     gi: 0,
     sodium: 0,
     potassium: 0
    },
    {
     name: "Turmeric Tea (250ml)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 0,
     gi: 0,
     sodium: 0,
     potassium: 0
    },
    {
     name: "Fennel Tea (250ml)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 0,
     gi: 0,
     sodium: 0,
     potassium: 0
    },
    {
     name: "Matcha Tea (250ml)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 1,
     fat: 0,
     kcal: 5,
     gi: 0,
     sodium: 0,
     potassium: 30
    },
    {
     name: "Rosehip Tea (250ml)",
     carbs: 0,
     sugars: 0,
     fiber: 0,
     protein: 0,
     fat: 0,
     kcal: 0,
     gi: 0,
     sodium: 0,
     potassium: 0
    }
   ],
   Foods: [
    {
     name: "Broccoli (100g)",
     carbs: 4,
     sugars: 1,
     fiber: 2.6,
     protein: 2.8,
     fat: 0.4,
     kcal: 34,
     gi: 10,
     sodium: 33,
     potassium: 316
    },
    {
     name: "Spinach (100g)",
     carbs: 1,
     sugars: 0,
     fiber: 2.2,
     protein: 2.9,
     fat: 0.4,
     kcal: 23,
     gi: 15,
     sodium: 79,
     potassium: 558
    },
    {
     name: "Cauliflower (100g)",
     carbs: 3,
     sugars: 1.9,
     fiber: 2,
     protein: 2,
     fat: 0.3,
     kcal: 25,
     gi: 15,
     sodium: 30,
     potassium: 300
    },
    {
     name: "Zucchini (100g)",
     carbs: 3,
     sugars: 2.5,
     fiber: 1,
     protein: 1.2,
     fat: 0.2,
     kcal: 17,
     gi: 15,
     sodium: 8,
     potassium: 261
    },
    {
     name: "Mushrooms (100g)",
     carbs: 2,
     sugars: 1,
     fiber: 1,
     protein: 3.1,
     fat: 0.3,
     kcal: 22,
     gi: 10,
     sodium: 5,
     potassium: 318
    },
    {
     name: "Asparagus (100g)",
     carbs: 3,
     sugars: 1,
     fiber: 2,
     protein: 2.2,
     fat: 0.2,
     kcal: 20,
     gi: 15,
     sodium: 2,
     potassium: 200
    },
    {
     name: "Brussels Sprouts (100g)",
     carbs: 5,
     sugars: 1,
     fiber: 3.5,
     protein: 3.4,
     fat: 0.3,
     kcal: 40,
     gi: 15,
     sodium: 25,
     potassium: 400
    },
    {
     name: "Kale (100g)",
     carbs: 4,
     sugars: 1,
     fiber: 2,
     protein: 2.9,
     fat: 0.4,
     kcal: 35,
     gi: 15,
     sodium: 30,
     potassium: 350
    },
    {
     name: "Green Beans (100g)",
     carbs: 4,
     sugars: 1,
     fiber: 2.5,
     protein: 1.8,
     fat: 0.1,
     kcal: 30,
     gi: 15,
     sodium: 5,
     potassium: 200
    },
    {
     name: "Cabbage (100g)",
     carbs: 3,
     sugars: 2,
     fiber: 2,
     protein: 1.3,
     fat: 0.1,
     kcal: 25,
     gi: 10,
     sodium: 15,
     potassium: 200
    },
    {
     name: "Eggplant (100g)",
     carbs: 5,
     sugars: 2,
     fiber: 3,
     protein: 1,
     fat: 0.2,
     kcal: 25,
     gi: 15,
     sodium: 2,
     potassium: 230
    },
    {
     name: "Artichoke (100g)",
     carbs: 5,
     sugars: 1,
     fiber: 5,
     protein: 3,
     fat: 0.2,
     kcal: 50,
     gi: 15,
     sodium: 50,
     potassium: 400
    },
    {
     name: "Radish (100g)",
     carbs: 2,
     sugars: 1,
     fiber: 1.5,
     protein: 0.7,
     fat: 0.1,
     kcal: 15,
     gi: 15,
     sodium: 40,
     potassium: 250
    },
    {
     name: "Lettuce (100g)",
     carbs: 1,
     sugars: 0,
     fiber: 1,
     protein: 1,
     fat: 0.2,
     kcal: 15,
     gi: 10,
     sodium: 10,
     potassium: 200
    },
    {
     name: "Okra (100g)",
     carbs: 4,
     sugars: 1,
     fiber: 2,
     protein: 2,
     fat: 0.2,
     kcal: 30,
     gi: 20,
     sodium: 10,
     potassium: 300
    }
   ],
   Snacks: [
    {
     name: "Avocado (half)",
     carbs: 6,
     sugars: 0.3,
     fiber: 4.6,
     protein: 1.3,
     fat: 15,
     kcal: 120,
     gi: 10,
     sodium: 5,
     potassium: 485
    },
    {
     name: "Walnuts (30g)",
     carbs: 4,
     sugars: 0.7,
     fiber: 2,
     protein: 4.3,
     fat: 18,
     kcal: 185,
     gi: 15,
     sodium: 1,
     potassium: 125
    },
    {
     name: "Chia Seeds (10g)",
     carbs: 4,
     sugars: 0,
     fiber: 3.4,
     protein: 1.7,
     fat: 3,
     kcal: 50,
     gi: 1,
     sodium: 5,
     potassium: 115
    },
    {
     name: "Flaxseeds (10g)",
     carbs: 3,
     sugars: 0.2,
     fiber: 2.8,
     protein: 1.8,
     fat: 4.3,
     kcal: 55,
     gi: 1,
     sodium: 5,
     potassium: 85
    },
    {
     name: "Pumpkin Seeds (30g)",
     carbs: 5,
     sugars: 0.5,
     fiber: 1,
     protein: 9,
     fat: 13,
     kcal: 160,
     gi: 10,
     sodium: 5,
     potassium: 260
    },
    {
     name: "Sunflower Seeds (30g)",
     carbs: 6,
     sugars: 1,
     fiber: 2,
     protein: 6,
     fat: 14,
     kcal: 165,
     gi: 20,
     sodium: 1,
     potassium: 240
    },
    {
     name: "Almond Butter (1 tbsp)",
     carbs: 3,
     sugars: 1,
     fiber: 1,
     protein: 3,
     fat: 9,
     kcal: 100,
     gi: 10,
     sodium: 0,
     potassium: 120
    },
    {
     name: "Brazil Nuts (30g)",
     carbs: 3,
     sugars: 1,
     fiber: 2,
     protein: 4,
     fat: 19,
     kcal: 185,
     gi: 10,
     sodium: 1,
     potassium: 200
    },
    {
     name: "Macadamia Nuts (30g)",
     carbs: 4,
     sugars: 1,
     fiber: 2,
     protein: 2,
     fat: 21,
     kcal: 200,
     gi: 10,
     sodium: 1,
     potassium: 100
    },
    {
     name: "Pecans (30g)",
     carbs: 4,
     sugars: 1,
     fiber: 3,
     protein: 3,
     fat: 20,
     kcal: 200,
     gi: 10,
     sodium: 0,
     potassium: 120
    },
    {
     name: "Pistachios (30g)",
     carbs: 8,
     sugars: 2,
     fiber: 3,
     protein: 6,
     fat: 13,
     kcal: 160,
     gi: 15,
     sodium: 0,
     potassium: 300
    },
    {
     name: "Hemp Seeds (10g)",
     carbs: 1,
     sugars: 0,
     fiber: 1,
     protein: 3,
     fat: 5,
     kcal: 55,
     gi: 0,
     sodium: 0,
     potassium: 100
    },
    {
     name: "Sesame Seeds (10g)",
     carbs: 2,
     sugars: 0,
     fiber: 1,
     protein: 2,
     fat: 5,
     kcal: 55,
     gi: 0,
     sodium: 1,
     potassium: 50
    },
    {
     name: "Coconut Flakes (unsweetened, 10g)",
     carbs: 2,
     sugars: 1,
     fiber: 1,
     protein: 1,
     fat: 4,
     kcal: 45,
     gi: 10,
     sodium: 5,
     potassium: 50
    },
    {
     name: "Pine Nuts (10g)",
     carbs: 2,
     sugars: 0.5,
     fiber: 1,
     protein: 2,
     fat: 7,
     kcal: 70,
     gi: 15,
     sodium: 1,
     potassium: 100
    }
   ]
  }
 };

 const addFoodToMeal = (foodItem) => {
  setCurrentMeal((prev) => [
   ...prev,
   {
    ...foodItem,
    uniqueId: `${foodItem.name}-${Date.now()}`
   }
  ]);
 };

 const removeFromMeal = (uniqueId) => {
  setCurrentMeal((prev) => prev.filter((item) => item.uniqueId !== uniqueId));
 };

 const handleSearch = () => {
  if (!address.trim()) return;
  const query = `hospitals near ${encodeURIComponent(address)}`;
  const mapsUrl = `https://www.google.com/maps/search/${query}`;
  window.open(mapsUrl, "_blank");
 };

 const handleUseMyLocation = () => {
  if (!navigator.geolocation) {
   alert("Geolocation is not supported by your browser.");
   return;
  }

  navigator.geolocation.getCurrentPosition(
   (position) => {
    const { latitude, longitude } = position.coords;
    const mapsUrl = `https://www.google.com/maps/search/hospital/@${latitude},${longitude},14z`;
    window.open(mapsUrl, "_blank");
   },
   (error) => {
    alert("Unable to retrieve your location.");
   }
  );
 };

 const handleSearchWithCoordinates = async (lat, lon) => {
  try {
   const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
   );
   const data = await response.json();
   const address = data.display_name || "Unknown location";
   setAddress(address); // Optional, for display
   handleSearch(lat, lon); // pass coords to your hospital search
  } catch (err) {
   console.error("Error fetching address:", err);
  }
 };

 const handleAddEntry = () => {

  if (!insulinUnits || !timeTaken || !insulinType) return;

  const newEntry = {

    units: insulinUnits,

    time: timeTaken,

    type: insulinType,

  };

  setEntries((prevEntries) => [...prevEntries, newEntry]);

};

 const handleReset = () => {
  setInsulinType("Rapid-acting");
  setCustomName("");
  setUnits("");
  setTimeTaken("");
 };

 const handleClearLog = () => {
  setEntries([]);
 };

 {
  /* dark theme logo switcher */
 }
 React.useEffect(() => {
  const observer = new MutationObserver(() => {
   setTheme(document.documentElement.getAttribute("data-theme") || "light");
  });

  observer.observe(document.documentElement, {
   attributes: true,
   attributeFilter: ["data-theme"]
  });

  return () => observer.disconnect();
 }, []);
 {
  /* dark theme logo switcher */
 }

 // Main render
 return (
  <div id="container">
   {/* Header section */}
   <div className="logo">
    <div className="logo">
     <img
      src="https://imgur.com/XRrP3SM.png"
      alt="DiabEasy Logo"
      className="logo-img"
     />
     <div className="diabeasy">DiabEasy</div>
    </div>
   </div>
   <p id="appDescription">
    Your simple and helpful companion for tracking <br />{" "}
    <span className="highlight">type 1 diabetes</span>
   </p>

   {/* Navigation tabs */}
   <nav className="tabs">
    {[
     "Home",
     "History",
     "Food Guide",
     "Medication",
     "Emergency",
     "Profile"
    ].map((tab) => (
     <button
      key={tab}
      className={`tab ${activeTab === tab ? "active" : ""}`}
      onClick={() => setActiveTab(tab)}
     >
      {tab}
     </button>
    ))}
   </nav>

   {/* Home tab content */}
   {activeTab === "Home" && (
    <div className="glycemia-input">
     <p className="textAboveInput">
      Please select a measuring type, then enter the value.
     </p>
     <div className="unit-toggle">
      <label
       className={`unit-label ${unit === "mg/dL" ? "active" : ""}`}
       onClick={() => setUnit("mg/dL")}
      >
       mg/dL
      </label>
      <div className={`slider ${unit === "mmol/L" ? "right" : "left"}`}>
       <div className="knob" />
      </div>
      <label
       className={`unit-label ${unit === "mmol/L" ? "active" : ""}`}
       onClick={() => setUnit("mmol/L")}
      >
       mmol/L
      </label>
     </div>

     <input
      id="glycemiaValue"
      type="number"
      placeholder="Enter glycemia value"
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
     />

     <div className="fasting-group">
      <label>
       <input
        type="radio"
        name="fasting"
        value="Fasting"
        onChange={(e) => setFasting(e.target.value)}
       />{" "}
       Fasting
      </label>
      <label>
       <input
        type="radio"
        name="fasting"
        value="Pre-meal"
        onChange={(e) => setFasting(e.target.value)}
       />{" "}
       Pre-meal
      </label>
      <label>
       <input
        type="radio"
        name="fasting"
        value="Post-meal"
        onChange={(e) => setFasting(e.target.value)}
       />{" "}
       Post-meal
      </label>
      <label>
       <input
        type="radio"
        name="fasting"
        value="Random"
        onChange={(e) => setFasting(e.target.value)}
       />{" "}
       Random
      </label>
      <label>
       <input
        type="radio"
        name="fasting"
        value="Bedtime"
        onChange={(e) => setFasting(e.target.value)}
       />{" "}
       Bedtime
      </label>
      <label>
       <input
        type="radio"
        name="fasting"
        value="Exercise-related"
        onChange={(e) => setFasting(e.target.value)}
       />{" "}
       Post-exercise
      </label>
     </div>

     <div className="symptoms-input">
      <label className="symptomsText">Notes, if any:</label>
      <br />
      <input
       className="symptoms"
       type="text"
       maxLength={30}
       placeholder="e.g. dizziness, insulin intake"
       value={symptoms}
       onChange={(e) => setSymptoms(e.target.value)}
      />
     </div>

     <button id="submit-button" onClick={handleSubmit}>
      Submit
     </button>

     {showRecommendationPopup && (
      <div className="popup-blur-overlay">
       <div className="popup-mini-window">
        <button
         className="close-btn"
         onClick={() => setShowRecommendationPopup(false)}
        >
         Close
        </button>
        <p>
         Your glycemia is low: <span>{glucoseValue}</span> {unit}
        </p>
        <h3>Quick Fixes for Low Blood Sugar</h3>
        <p>Eat 3–4 glucose tablets (the fastest solution)</p>
        <p>Drink a small glass of juice (orange or apple works best)</p>
        <p>Have a spoonful of honey (just swallow it straight)</p>
        <p>Munch on a few candies (about 6–7 gummies or hard sweets)</p>
        <p>Try a handful of raisins (if you prefer something natural)</p>

        <hr />
        <h4>After the First Boost</h4>
        <p>Wait 15 minutes, then check again – if still low, repeat.</p>
        <p>Eat something small like a cracker with cheese or yogurt.</p>

        <hr />
        <h4>If You Feel Really Bad</h4>
        <p>Don't walk it off – sit down and rest.</p>
        <p>If you can't swallow, use a glucagon shot or call for help.</p>

        <hr />
        <h4>Smart Habits</h4>
        <p>Always keep glucose tabs or candy in your bag.</p>
        <p>Tell someone nearby if you're feeling shaky.</p>
       </div>
      </div>
     )}

     {showHyperRecPopup && (
      <div className="popup-blur-overlay">
       <div className="popup-mini-window">
        <p>
         Your glycemia is high: <span>{glucoseValue}</span> {unit}
        </p>
        <h3>What to Do When Blood Sugar Is High</h3>
        <p>Drink plenty of water – helps flush out excess sugar.</p>
        <p>Take a short walk – gentle movement helps lower levels.</p>
        <p>Check for ketones if over 13.9 mmol/L (250 mg/dL).</p>
        <hr />
        <p>Insulin adjustment:</p>
        <p>Use correction doses if prescribed.</p>
        <p>For pump users: consider temporary basal rate increase.</p>
        <p>Never double-dose without medical advice.</p>
        <p>Avoid sugary foods until levels normalize.</p>
        <hr />
        <h4>If Levels Stay High</h4>
        <p>Test again in 2–3 hours to monitor progress.</p>
        <p>Consult your healthcare provider if levels remain high.</p>
        <p>Check injection sites for issues.</p>
        <hr />
        <h4>When to Seek Help</h4>
        <p>If over 16.7 mmol/L (300 mg/dL) for several hours.</p>
        <p>If experiencing nausea, vomiting, or confusion – possible DKA.</p>

        <button
         className="close-btn"
         onClick={() => setShowHyperRecPopup(false)}
        >
         Close
        </button>
       </div>
      </div>
     )}

     {glucoseValue !== null && (
      <div className="result">
       <p id="value" className="glucose-value">
        {glucoseValue} {unit}
       </p>
       <p
        id="lowOrHigh"
        className={`interpretation ${getColorClass(glucoseValue, unit)}`}
       >
        {getInterpretation(glucoseValue, unit)}
       </p>
      </div>
     )}
    </div>
   )}

   {/* HISTORY TAB START */}

   {activeTab === "History" && (
    <div className="history-tab">
     <h3 className="history-title">Past Measurements</h3>

     {/* Filter controls */}
     <p className="filtervalues">Filter values</p>
     <div className="history-filters">
      <div className="filter-group">
       <label className="filter-label">From Date:</label>
       <input
        type="date"
        className="filter-input date-input"
        value={filterDateFrom}
        onChange={(e) => setFilterDateFrom(e.target.value)}
       />
      </div>

      <div className="filter-group">
       <label className="filter-label">To Date:</label>
       <input
        type="date"
        className="filter-input date-input"
        value={filterDateTo}
        onChange={(e) => setFilterDateTo(e.target.value)}
       />
      </div>
     </div>

     <div className="numberandtext">
      <div className="filter-group">
       <label className="filter-label">Min Value:</label>
       <input
        type="number"
        className="filter-input number-input"
        value={filterMin}
        onChange={(e) => setFilterMin(e.target.value)}
        placeholder="Min"
       />
      </div>

      <div className="filter-group">
       <label className="filter-label">Max Value:</label>
       <input
        type="number"
        className="filter-input number-input"
        value={filterMax}
        onChange={(e) => setFilterMax(e.target.value)}
        placeholder="Max"
       />
      </div>
     </div>

     <p className="filtervaluetext">Filter by measuring unit:</p>
     <div className="unit-filter">
      <label>
       <input
        type="radio"
        name="unitFilter"
        value="mg/dL"
        checked={unitFilter === "mg/dL"}
        onChange={() => setUnitFilter("mg/dL")}
       />
       <span>mg/dL</span>
      </label>
      <label>
       <input
        type="radio"
        name="unitFilter"
        value="mmol/L"
        checked={unitFilter === "mmol/L"}
        onChange={() => setUnitFilter("mmol/L")}
       />
       <span>mmol/L</span>
      </label>
      <label>
       <input
        type="radio"
        name="unitFilter"
        value=""
        checked={unitFilter === ""}
        onChange={() => setUnitFilter("")}
       />
       <span>All</span>
      </label>
     </div>

     <div className="filter-buttons">
      <button className="filter-btn" onClick={clearFilters}>
       Clear Filters
      </button>
     </div>

     {/* History list */}
     {history.length === 0 ? (
      <p className="no-history">No data recorded yet.</p>
     ) : (
      <>
       {filteredHistory.length === 0 ? (
        <p className="no-results">No entries match your filter criteria.</p>
       ) : (
        <ul className="history-list">
         {filteredHistory.map((entry, index) => (
          <li
           key={index}
           className={`history-item ${getColorClass(entry.value, entry.unit)}`}
          >
           <strong>
            {entry.value} {entry.unit}
           </strong>{" "}
           ({entry.interpretation})
           <span className="timestamp"> {entry.timestamp}</span>
           {entry.fasting && (
            <span className="fasting-label"> – {entry.fasting}</span>
           )}
           {entry.symptoms && (
            <div className="symptoms-display">
             <p className="notes">Notes: {entry.symptoms}</p>
            </div>
           )}
          </li>
         ))}
        </ul>
       )}
      </>
     )}
    </div>
   )}

   {/* HISTORY TAB END */}

   {/* FOOD GUIDE TAB START */}

   {/* MEAL PLANNER START */}

   {activeTab === "Food Guide" && (
    <div className="foodguide-tab">
     <h3 className="foodguide-title">Meal Planner and Food Recommendations</h3>

     {glucoseValue ? (
      <div>
       <p className="simplep">
        Your glycemia value is{" "}
        <strong>
         {glucoseValue} {unit}
        </strong>
       </p>
       <p className="simplep">
        Would you like to lower, maintain or raise your glycemia level?
       </p>

       <div className="lrm">
        <label>
         <input
          type="radio"
          name="action"
          value="lower"
          checked={foodAction === "lower"}
          onChange={() => setFoodAction("lower")}
          hidden
         />
         <span>Lower</span>
        </label>
        <label>
         <input
          type="radio"
          name="action"
          value="maintain"
          checked={foodAction === "maintain"}
          onChange={() => setFoodAction("maintain")}
          hidden
         />
         <span>Maintain</span>
        </label>
        <label>
         <input
          type="radio"
          name="action"
          value="raise"
          checked={foodAction === "raise"}
          onChange={() => setFoodAction("raise")}
          hidden
         />
         <span>Raise</span>
        </label>
       </div>

       {foodAction && (
        <div className="food-suggestions">
         <p id="suggested-foods">
          Suggested Foods, Drinks and Snacks
          <br />
          In order for glycemia level to be lowered, <br />
          physical activity is also required
         </p>
         <div className="food-scroll-area">
          {Object.entries(foodDatabase[foodAction]).map(
           ([groupName, items]) => (
            <div key={groupName}>
             <p id="foodfamily">
              {groupName.charAt(0).toUpperCase() + groupName.slice(1)}
             </p>
             <ul>
              {items.map((item, index) => (
               <li key={index}>
                <div className="foodnameandadd">
                 <strong>{item.name}</strong>
                 <button
                  className="addtomeal"
                  onClick={() => addFoodToMeal(item)}
                 >
                  Add to meal
                 </button>
                </div>
                <br />
                <span>
                 Carbs: {item.carbs}g | Sugars: {item.sugars}g | Fiber:{" "}
                 {item.fiber}g | Protein: {item.protein}g | Fat: {item.fat}g |
                 Kcal: {item.kcal} | GI: {item.gi} | Sodium: {item.sodium}mg |
                 Potassium: {item.potassium}mg
                </span>
               </li>
              ))}
             </ul>
            </div>
           )
          )}
         </div>
        </div>
       )}
      </div>
     ) : (
      <p className="no-input-message">
       No glycemia input. Enter a value on the Home tab.
      </p>
     )}

     {currentMeal.length > 0 && (
      <div className="meal-section">
       <div class="horizontalbar"></div>
       <p className="nutrifacts">Your meal's nutritional facts:</p>
       <div className="meal-totals">
        <div>
         Total Carbs:{" "}
         {currentMeal.reduce((sum, item) => sum + item.carbs, 0).toFixed(0)} g
        </div>
        <div>
         Of which sugars:{" "}
         {currentMeal.reduce((sum, item) => sum + item.sugars, 0).toFixed(0)} g
        </div>
        <div>
         Fiber:{" "}
         {currentMeal.reduce((sum, item) => sum + item.fiber, 0).toFixed(0)} g
        </div>
        <div>
         Protein:{" "}
         {currentMeal.reduce((sum, item) => sum + item.protein, 0).toFixed(0)} g
        </div>
        <div>
         Fat: {currentMeal.reduce((sum, item) => sum + item.fat, 0).toFixed(0)}{" "}
         g
        </div>
        <div>
         Kcal:{" "}
         {currentMeal.reduce((sum, item) => sum + item.kcal, 0).toFixed(0)}
        </div>
        <div>
         Sodium:{" "}
         {currentMeal.reduce((sum, item) => sum + item.sodium, 0).toFixed(0)} g
        </div>
        <div>
         Potassium:{" "}
         {currentMeal.reduce((sum, item) => sum + item.potassium, 0).toFixed(0)}{" "}
         mg
        </div>
        <div>
         Gi: {currentMeal.reduce((sum, item) => sum + item.gi, 0).toFixed(0)} mg
        </div>
       </div>
       <div class="horizontalbar"></div>
       <div className="meal-display">
        <p className="selectedItems">Your meal's selected items</p>
        <ul className="meal-items">
         {currentMeal.map((item) => (
          <li key={item.uniqueId}>
           {item.name}
           <button
            onClick={() => removeFromMeal(item.uniqueId)}
            className="remove-btn"
           >
            Remove
           </button>
          </li>
         ))}
        </ul>
       </div>
      </div>
     )}
    </div>
   )}

   {/* FOOD GUIDE TAB END */}

   {/* MEDICATION TAB START */}

   {activeTab === "Medication" && (
    <div className="medication-tab">
     <h3 className="medication-title">Insulin Dose Calculator</h3>
     <p className="explanation">
      Use this tool to calculate how much insulin you may need based on your
      current blood sugar and carbohydrate intake.
     </p>

     <div className="insulin-inputs">
      {glucoseValue === null ? (
       <p className="error-message">
        No glycemia value entered. Please enter it in the Home tab.
       </p>
      ) : (
       <>
        <p>
         Current glycemia:{" "}
         <strong>
          {glucoseValue} {unit}
         </strong>
         <br />
        </p>
        <p>
         Planned meal carbs intake:{" "}
         <strong>
          {totalCarbs !== null ? `${totalCarbs} g` : "Not entered"}
         </strong>
        </p>
        <div>Target glycemia:</div>
        <div className="targetglycemia-reset">
         <label>
          <input
           id="target-glycemia"
           type="number"
           value={targetGlycemia}
           onChange={(e) => {
            setTargetGlycemia(e.target.value);
            // Reset any derived calculations if needed
           }}
           placeholder="e.g. 100"
          />
         </label>
         <button
          className="reset-btn"
          onClick={() => {
           setTargetGlycemia("");
          }}
         >
          Reset
         </button>
        </div>
       </>
      )}
     </div>

     {/* MEDICATION TAB START */}

     {activeTab === "Medication" && (
      <div className="medication-tab">
       {/* ... (keep previous header and explanation) ... */}

       {glucoseValue === null ? (
        <div className="insulin-result">
         <p>⛔ Cannot calculate insulin dose</p>
         <p>Please enter your current blood sugar in the Home tab first.</p>
        </div>
       ) : targetGlycemia === "" || totalCarbs === null ? (
        <div className="insulin-result">
         <p>ℹ️ Fill in the target glycemia field above</p>
        </div>
       ) : (
        (() => {
         // Convert everything to mg/dL for calculations
         const ISF = 50; // mg/dL per unit
         const carbRatio = 10; // grams per unit
         const currentMgDl =
          unit === "mmol/L" ? glucoseValue * 18 : glucoseValue;
         const targetMgDl =
          unit === "mmol/L" ? targetGlycemia * 18 : Number(targetGlycemia);

         // Perform calculations in mg/dL
         const mealInsulin = totalCarbs / carbRatio;
         const correctionInsulin = Math.max(
          (currentMgDl - targetMgDl) / ISF,
          0
         );
         const totalDose = Math.round(mealInsulin + correctionInsulin);
         const predictedRise = (totalCarbs / carbRatio) * ISF;
         const predictedMgDl = currentMgDl + predictedRise;

         // Convert back to display units if needed
         const displayValue = (value) =>
          unit === "mmol/L" ? (value / 18).toFixed(1) : value.toFixed(0);
         const displayUnit = unit === "mmol/L" ? "mmol/L" : "mg/dL";

         if (currentMgDl < 75) {
          // 75 mg/dL ≈ 4.2 mmol/L
          if (predictedMgDl < 75) {
           const neededCarbs = Math.ceil(
            ((75 - currentMgDl) / ISF) * carbRatio
           );
           return (
            <div className="insulin-result warning">
             <p>⚠️ Dangerously low blood sugar</p>
             <p>
              With planned meal, you'll still be at{" "}
              {displayValue(predictedMgDl)} {displayUnit}
             </p>
             <p>
              Eat <strong>{neededCarbs} g</strong> more carbs immediately
             </p>
             <p>Do NOT take insulin now</p>
            </div>
           );
          }
          return (
           <div className="insulin-result">
            <p>⚠️ Low blood sugar warning</p>
            <p>
             Your blood sugar will rise to ~{displayValue(predictedMgDl)}{" "}
             {displayUnit}
            </p>
            <p>
             Do not use Insulin unless glycemia level rises at a normal level
            </p>
           </div>
          );
         }

         if (currentMgDl > 250) {
          // 250 mg/dL ≈ 13.9 mmol/L
          return (
           <div className="insulin-result warning">
            <p>⚠️ High blood sugar alert</p>
            <p>
             Correction dose only:{" "}
             <strong>{correctionInsulin.toFixed(0)} units</strong>
            </p>
            <p>
             Consider delaying food until glucose is below{" "}
             {unit === "mmol/L" ? "11.1" : "200"} {displayUnit}
            </p>
           </div>
          );
         }

         return (
          <div className="insulin-result">
           <p className="total-dose">
            Insulin units to be injected:{" "}
            <strong>{totalDose.toFixed(0)} units</strong>
           </p>
           <p className="prediction">
            (Predicted post-meal glycemia without the insulin intake: ~
            {displayValue(predictedMgDl)} {displayUnit})
           </p>
          </div>
         );
        })()
       )}
       <div className="insulin-log">
        <div className="insulin-log-main-p">Insulin Log Entry</div>
        <div className="insulin-log-p">
         Please select the insuline type injected
        </div>
        <button
         id="rapid-long-acting"
         className={insulinType === "Rapid-acting" ? "active" : ""}
         onClick={() => setInsulinType("Rapid-acting")}
        >
         Rapid-acting
        </button>
        <button
         id="rapid-long-acting"
         className={insulinType === "Long-acting" ? "active" : ""}
         onClick={() => setInsulinType("Long-acting")}
        >
         Long-acting
        </button>
        <div className="insulin-log-p-mother">
         <div className="insulin-log-p">
          Units:
          <div id="insulin-units">
            <button id="decrease-units" onClick={() => setInsulinUnits(insulinUnits - 1)}>-</button>
            <span id="units-display">{insulinUnits}</span>
            <button id="increase-units" onClick={() => setInsulinUnits(insulinUnits + 1)}>+</button>
          </div>
        </div>

        <div className="insulin-log-p">
          Time Taken:
          <div id="insulin-time">
            <button onClick={() => setTimeTaken("08:00")}>Morning</button>
            <button onClick={() => setTimeTaken("12:00")}>Noon</button>
            <button onClick={() => setTimeTaken("20:00")}>Evening</button>
            <input
              type="text"
              placeholder="Custom"
              value={timeTaken}
              onChange={(e) => setTimeTaken(e.target.value)}
            />
          </div>
        </div>
        </div>
        <div className = "add-reset-clear" style={{ marginTop: "1rem" }}>
         <button id="add-entry" onClick={handleAddEntry}>
          Add Entry
         </button>{" "}
         <button id="reset-entry" onClick={handleReset}>
          Reset
         </button>
         <button id="clear-log" onClick={handleClearLog}>
          Clear Log
         </button>
        </div>

        <hr />
        <h4>📋 Log:</h4>
        <ul>
         {entries.map((entry, index) => (
          <li key={index}>
           {entry.units} units of {entry.type} insulin at {entry.time}
          </li>
         ))}
        </ul>
       </div>
      </div>
     )}
    </div>
   )}

   {/* MEDICATION TAB END */}

   {/* EMERGENCY TAB START */}

   {activeTab === "Emergency" && (
    <div className="emergency-symptoms">
     <div className="emergency-call-box">
      <h3>Need Immediate Help?</h3>
      <p id="if-condition">
       If your condition doesn’t improve or you feel it’s an emergency, please
       contact emergency services.
      </p>
      <a href="tel:112" className="emergency-call-button">
       Call 112 (Emergency Services)
      </a>
      <p>Never ignore the warning signs of an emergency.</p>
     </div>
     <div className="hospital-locator">
      <h3>Find Nearby Hospitals</h3>
      <input
       type="text"
       value={address}
       placeholder="Enter your location"
       onChange={(e) => setAddress(e.target.value)}
      />
      <br />
      <button onClick={handleSearch}>Search</button>
      <div className="uselocation">Or use your current location</div>
      <button onClick={handleUseMyLocation}>Use My Location</button>
     </div>
     <div className="checksymp">
      Check for Symptoms of <span>Hypoglycemia</span>
     </div>

     <button className="find-out-btn" onClick={() => setShowHypoPopup(true)}>
      Find out more
     </button>

     {showHypoPopup && (
      <div className="popup-blur-overlay">
       <div className="popup-mini-window">
        <h3>Hypoglycemia Symptoms</h3>
        <div className="symptom-columns">
         <div>
          <p>• Shakiness</p>
          <p>• Sweating</p>
          <p>• Dizziness</p>
          <p>• Hunger</p>
         </div>
         <div>
          <p>• Irritability</p>
          <p>• Blurry vision</p>
          <p>• Confusion</p>
          <p>• Weakness</p>
         </div>
        </div>
        <hr />
        <p>If you experience any of the symptoms listed above:</p>
        <p>• Eat or drink 15–20g of fast-acting carbohydrates</p>
        <p>• Wait 15 minutes, then recheck your blood sugar</p>
        <p>• If still low, repeat and prepare to seek emergency help</p>

        <button className="close-btn" onClick={() => setShowHypoPopup(false)}>
         Close
        </button>
       </div>
      </div>
     )}
     <div class="horizontalbar"></div>
     <div className="checksymptwo">
      Check for Symptoms of <span>Hyperglycemia</span>
     </div>

     <button className="find-out-btn" onClick={() => setShowHyperPopup(true)}>
      Find out more
     </button>

     {showHyperPopup && (
      <div className="popup-blur-overlay">
       <div className="popup-mini-window">
        <h3>Hyperglycemia Symptoms</h3>

        <div className="symptom-columns">
         <div>
          <p>• Thirst</p>
          <p>• Urination</p>
          <p>• Fatigue</p>
          <p>• Headache</p>
         </div>
         <div>
          <p>• Dryness</p>
          <p>• Nausea</p>
          <p>• Focus</p>
          <p>• Breathlessness</p>
         </div>
        </div>

        <hr />

        <p>If you experience any of the symptoms listed above:</p>
        <p>
         Drink plenty of water to stay hydrated and help flush out excess
         glucose.
        </p>
        <p>
         Engage in light physical activity (like walking), if safe and
         appropriate.
        </p>
        <p>
         If your blood sugar doesn't improve, repeat the treatment and prepare
         to seek emergency help.
        </p>
        <button className="close-btn" onClick={() => setShowHyperPopup(false)}>
         Close
        </button>
       </div>
      </div>
     )}
    </div>
   )}

   {activeTab === "Profile" && (
    <div className="profile-tab">
     <h3 className="profile-title">User Profile</h3>

     <p className="simplep">Choose your preferred theme:</p>
     <div className="theme-options">
      <button
       onClick={() =>
        document.documentElement.setAttribute("data-theme", "light")
       }
      >
       ☀️ Light
      </button>
      <button
       onClick={() =>
        document.documentElement.setAttribute("data-theme", "dark")
       }
      >
       🌙 Dark
      </button>
     </div>
     <p className="simplep">Preferred glucose unit:</p>
     <div className="profile-unit-toggle">
      <button 
       className="defaultGlucoseSelector"
       onClick={() => setDefaultGlucoseUnit("mg/dL")}
      >
       mg/dL
      </button>
      <button
       className="defaultGlucoseSelector"
       onClick={() => setDefaultGlucoseUnit("mmol/L")}
      >
       mmol/L
      </button>
     </div>
     <div id="auth-container">
  <h2>{authMode === "signIn" ? "Sign In" : "Sign Up"}</h2>

  <form>
    {authMode === "signUp" && (
      <>
        <input type="text" placeholder="Name" />
        <input type="text" placeholder="Surname" />
      </>
    )}
    <input type="email" placeholder="Email" />
    <input type="password" placeholder="Password" />
    {authMode === "signUp" && (
      <input type="password" placeholder="Confirm Password" />
    )}
    <button type="submit">
      {authMode === "signIn" ? "Sign In" : "Sign Up"}
    </button>
  </form>

  <p>
    {authMode === "signIn" ? "Don't have an account?" : "Already have an account?"}
    <button
      type="button"
      onClick={() =>
        setAuthMode(authMode === "signIn" ? "signUp" : "signIn")
      }
    >
      {authMode === "signIn" ? "Sign Up" : "Sign In"}
    </button>
    <p className="forgot-link">
      <button type="button" onClick={() => alert("Password reset not implemented yet")}>
        Forgot password?
      </button>
    </p>
  </p>
</div>

    </div>
   )}

   {/* EMERGENCY TAB END */}
  </div>
 );
};

ReactDOM.render(<App />, document.getElementById("root"));
