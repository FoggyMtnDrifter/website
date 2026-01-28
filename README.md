# foggymtndrifter.com

Michael Kinder's personal website and blog.

This site features a quirky, developer-focused aesthetic with deep customization, local content management, and integrated features for reader interaction.

## ✨ Features

- **Terminal Aesthetic**: Heavily themed UI including a terminal-style interface.
- **Content Management**:
  - **Blog**: Technical articles writing in MDX with Expressive Code syntax highlighting.
  - **CV/Resume**: A dedicated "About" page formatted as a professional CV.
  - **Legal Pages**: Privacy Policy and Terms of Use (queried from local markdown).
- **Interactive Elements**:
  - **Cookie Consent**: Minimalist, non-intrusive popup.
  - **Comments**: GitHub-powered comments via [Giscus](https://giscus.app).
  - **Donations**: Custom "Buy Me a Coffee" modal integrated with Stripe for easy support.
- **Tech Stack**:
  - Built with [Astro v5](https://astro.build)
  - Styled with [Tailwind CSS v4](https://tailwindcss.com)
  - Deployed on [Vercel](https://vercel.com)

## 🚀 Local Development

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/FoggyMtnDrifter/website.git
    cd website
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start the dev server**:
    ```bash
    npm run dev
    ```

4.  **Build for production**:
    ```bash
    npm run build
    ```

## 🛠️ Configuration

Site configuration is centralized in `src/site.config.ts`. This file controls:
- SEO metadata (Title, Description, Author)
- Navigation links
- Theme settings
- Social links & Giscus configuration

## 📄 License

This project is licensed under the [MIT License](LICENSE.txt).

## Acknowledgments

- Based on the [MultiTerm Astro](https://github.com/stelcodes/multiterm-astro) theme by [Stel](https://github.com/stelcodes).
