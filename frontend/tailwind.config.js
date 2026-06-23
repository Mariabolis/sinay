/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream:        '#F4EEE8',
        'cream-deep': '#ECE3D9',
        'dusty-pink': '#EBCFD2',
        sage:         '#B9C0AE',
        'sky-blue':   '#C9D8E8',
        mocha:        '#8B7568',
        ink:          '#4A3F38',
      },
      fontFamily: {
        logo: ['"Cormorant Garamond"', 'serif'],
        body: ['"Quicksand"', 'sans-serif'],
      },
      letterSpacing: {
        brand: '0.25em',
        wide2: '0.15em',
      },
    },
  },
  plugins: [],
}
