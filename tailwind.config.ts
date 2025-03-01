import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "muted-foreground": "var(--muted-foreground)",
        border: "var(--border)",
        primary: "var(--primary)",
        "primary-focus": "var(--primary-focus)",
        "primary-content": "var(--primary-content)",
        secondary: "var(--secondary)",
        "secondary-focus": "var(--secondary-focus)",
        "secondary-content": "var(--secondary-content)",
        accent: "var(--accent)",
        "accent-focus": "var(--accent-focus)",
        "accent-content": "var(--accent-content)",
        neutral: "var(--neutral)",
        "neutral-focus": "var(--neutral-focus)",
        "neutral-content": "var(--neutral-content)",
        "base-100": "var(--base-100)",
        "base-200": "var(--base-200)",
        "base-300": "var(--base-300)",
        "base-content": "var(--base-content)",
        info: "var(--info)",
        success: "var(--success)",
        warning: "var(--warning)",
        error: "var(--error)",
      },
      borderRadius: {
        'default': 'var(--radius)',
      },
      spacing: {
        'xs': 'var(--spacing-xs)',
        'sm': 'var(--spacing-sm)',
        'md': 'var(--spacing-md)',
        'lg': 'var(--spacing-lg)',
        'xl': 'var(--spacing-xl)',
        '2xl': 'var(--spacing-2xl)',
      },
      screens: {
        'xs': '360px',
      },
    },
  },
  plugins: [
    require('daisyui')
  ],
  daisyui: {
    themes: false, // true: use default themes, false: use custom themes from CSS
    darkTheme: "dark",
    base: true, // applies default base styles
    styled: true, // apply DaisyUI component styles
    utils: true, // apply DaisyUI utility classes
    prefix: "", // prefix for daisyui classes
    logs: false, // console logs info
    themeRoot: ":root", // The element that receives theme color CSS variables
  }
} satisfies Config;
