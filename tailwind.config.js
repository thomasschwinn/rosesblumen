const defaultTheme = require("tailwindcss/defaultTheme");
const colors = require("tailwindcss/colors");

module.exports = {
	mode: "jit",
	purge: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
	darkMode: "class", // or 'media' or 'class'
	theme: {
		extend: {
			colors: {
				trueGray: colors.trueGray,
				indigo: {
					500: "#E5006C",
					600: "#E5006C",
				},
			},
		},
		fontFamily: {
			sans: ["Inter", ...defaultTheme.fontFamily.sans],
			stock: [defaultTheme.fontFamily.sans],
		},
	},
	variants: {
		extend: {},
	},
	plugins: [require("@tailwindcss/aspect-ratio")],
};
