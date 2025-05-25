// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  // Enable class-based dark mode
  darkMode: 'class',

  // Ensure all paths where you use Tailwind classes are included.
  // Adjust these paths to accurately reflect your project structure.
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",        // For Next.js 13+ `app` directory (you had this)
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",     // Add if you also use the `pages` directory
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}", // Add if you have a common `components` directory in `src`
    // Add any other specific paths if necessary, e.g., "./src/layouts/**/*.{js,ts,jsx,tsx,mdx}"
  ],

  theme: {
    extend: { // This 'extend' object was not correctly closed in the previous example
      // Your existing font family definitions
      fontFamily: {
        sans: "var(--font-geist-sans)",
        mono: "var(--font-geist-mono)",
      },
      // You can add custom colors here if needed for your theme.
      // For example, if you want to define Nartex Green globally:
      colors: {
        // 'nartex-green': {
        //   DEFAULT: '#10B981', // Corresponds to emerald-500
        //   '50': '#ecfdf5',
        //   '100': '#d1fae5',
        //   // ... other shades if needed
        // },
        // You could also define your light/dark mode base colors here
        // for more semantic usage in your components if you prefer over direct slate/gray.
      },
      // ... any other theme extensions for Tailwind could go here
      // e.g., spacing, borderRadius, keyframes, etc.
    }, // Correctly closing the 'extend' object
  },

  plugins: [
    // ... any Tailwind CSS plugins you are using or plan to use
    // E.g., require('@tailwindcss/forms'), require('@tailwindcss/typography')
  ],
};