/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#071018",
          900: "#0b1220",
          800: "#111b2e"
        },
        aurora: {
          300: "#8be7d4",
          400: "#49d3c6",
          500: "#16b8ba",
          600: "#0a8f9d"
        },
        ember: {
          400: "#f5b37b",
          500: "#f08a4b",
          600: "#cf5f2b"
        }
      },
      boxShadow: {
        panel: "0 24px 80px rgba(0, 0, 0, 0.28)"
      },
      backgroundImage: {
        "dashboard-glow":
          "radial-gradient(circle at top left, rgba(73, 211, 198, 0.24), transparent 36%), radial-gradient(circle at top right, rgba(245, 179, 123, 0.16), transparent 30%), linear-gradient(180deg, rgba(11, 18, 32, 0.82), rgba(7, 16, 24, 0.96))"
      }
    }
  },
  plugins: []
};