module.exports = {
  purge: [],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: false, 
  theme: {
    extend: {
      colors: {
        primary: '#FF69B4',
        secondary: '#39FF14',
        accent: '#00FFFF',
        neutral: '#FFFFFF',
        black: {
            DEFAULT: "#000"
        },
        white: {
            DEFAULT: "#fff"
        }
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}


