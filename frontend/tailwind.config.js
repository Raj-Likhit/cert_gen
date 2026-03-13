/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                bg: 'var(--color-bg)',
                surface: {
                    DEFAULT: 'var(--color-surface)',
                    hover: 'var(--color-surface-hover)',
                },
                border: {
                    DEFAULT: 'var(--color-border)',
                    heavy: 'var(--color-border-heavy)',
                },
                primary: {
                    DEFAULT: 'var(--color-primary)',
                    dim: 'var(--color-primary-dim)',
                },
                accent: {
                    DEFAULT: 'var(--color-accent)',
                    glow: 'var(--color-accent-glow)',
                },
                success: 'var(--color-success)',
                error: 'var(--color-error)',
            }
        },
    },
    plugins: [],
}
