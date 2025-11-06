// frontend/cypress.config.ts
import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    // Testlerimizin çalışacağı ana URL'i buraya yazıyoruz
    baseUrl: 'http://localhost:3000',

    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
})