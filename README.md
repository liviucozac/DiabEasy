DiabEasy

A responsive diabetes tracking app built with React, Redux, and custom CSS.

How to Run

1. Download or clone the repo
2. Open `index.html` with **Live Server** in VS Code
3. Make sure `app.js` and `styles.css` are in the same folder

Uses CDN for React, Redux, and Babel. No build tools required.

Features:
- Glucose input with interpretation
- History tracking and filters
- Food guide with nutritional data
- Insulin logging
- Emergency hospital locator
- Dark/Light mode support

Tech Stack:
- React (via CDN)
- Redux
- CSS3 (no frameworks)
- Babel (for JSX)

How the App works:
## How It Works

1. **Enter Glucose Value**  
   - Input your blood sugar level and press **Submit**
   - The result will be color-coded and interpreted (Low, Normal, High)
2. **View Recommendations**  
   - Based on your level, specific advice appears
3. **Track History**  
   - See past entries filtered by date or level
4. **Explore Food Guide**  
   - Browse foods that raise, lower, or stabilize glucose
5. **Log Insulin**  
   - Add dosage and time taken for daily insulin logs
6. **Use Emergency Tab**  
   - Search for nearby hospitals using your location
