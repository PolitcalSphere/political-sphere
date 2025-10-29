import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Political Sphere',
  description: 'Platform engineering docs',
  ignoreDeadLinks: [
    'http://localhost:3000',
    'http://localhost:4000',
    'http://localhost:8025',
    './runbooks/README',
  ],
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Onboarding', link: '/onboarding' },
      { text: 'Architecture', link: '/architecture' },
    ],
    sidebar: [
      {
        text: 'Guides',
        items: [
          { text: 'Onboarding', link: '/onboarding' },
          { text: 'Architecture', link: '/architecture' },
          { text: 'Dev Autopilot', link: '/dev-autopilot' },
        ],
      },
      {
        text: 'Compliance',
        items: [
          { text: 'EU AI Act', link: '/compliance/eu-ai-act' },
          { text: 'Contract Testing', link: '/contract-testing' },
          { text: 'Risk Register', link: '/risk-register' },
          { text: 'Secrets Inventory', link: '/secrets-inventory' },
        ],
      },
      {
        text: 'AI Resources',
        items: [
          { text: 'Prompt Standards', link: '/ai-resources/prompt-standards' },
          { text: 'Knowledge Base', link: '/ai-resources/knowledge-base' },
          { text: 'Enhancement Framework', link: '/ai-enhancement-framework' },
        ],
      },
    ],
  },
});
