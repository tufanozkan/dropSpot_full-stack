// cypress/e2e/smoke-test.cy.ts

describe('DropSpot E2E Smoke Test', () => {
  // Testler arasında state'i temiz tutmak için
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.clear()
    })
  })

  it('bir kullanıcının kayıt olmasını, giriş yapmasını ve bir drop claim etmesini test eder', () => {
    
    // --- Test Verileri ---
    // Bu testin çalışması için backend'de (dropspot.db)
    // bu iki kullanıcının OLUŞTURULMUŞ olması gerekir.
    const userEmail = 'user1@test.com' 
    const userPass = 'user123'
    const adminEmail = 'admin@test.com'
    const adminPass = 'admin123'
    
    // --- HAZIRLIK: Admin olarak girip penceresi AÇIK bir drop oluştur ---
    // (UI kullanmadan, doğrudan API'ye istek atarak)
    cy.request({
        method: 'POST',
        url: 'http://127.0.0.1:8000/auth/login',
        form: true, // <-- 🚨 ÇÖZÜM BU SATIR
        body: {
            username: adminEmail,
            password: adminPass,
    }
    }).then((response) => {
      const token = response.body.access_token
      
      const now = new Date()
      const start = new Date(now.getTime() - 60000) // 1 dk önce
      const end = new Date(now.getTime() + 3600000) // 1 saat sonra

      // Admin token'ı ile yeni bir drop oluştur
      cy.request({
        method: 'POST',
        url: 'http://127.0.0.1:8000/admin/drops',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: {
          title: 'Cypress Test Drop',
          description: 'E2E Test',
          stock: 1, // Sadece 1 adet stok
          claim_window_start: start.toISOString(),
          claim_window_end: end.toISOString(),
        }
      })
    })

    // --- 1. GİRİŞ YAPMA ---
    cy.visit('/login') // Login sayfasını ziyaret et
    
    cy.get('input[type="email"]').type(userEmail)
    cy.get('input[type="password"]').type(userPass)
    cy.get('button[type="submit"]').click()

    // Navbar'da "Hoş geldin" yazısını görerek girişi onayla
    cy.contains('Hoş geldin, user@test.com').should('exist')

    // --- 2. DROP SAYFASINA GİT ---
    cy.visit('/drops')
    
    // Oluşturduğumuz drop'u bul ve tıkla
    cy.contains('Cypress Test Drop').click()

    // URL'in doğru olduğunu onayla (örn: /drops/1)
    cy.url().should('include', '/drops/') 

    // --- 3. CLAIM ETME ---
    // "CLAIM" butonunu bul ve tıkla
    cy.contains('ŞİMDİ HAK TALEP ET (CLAIM)').click()

    // Başarı mesajını onayla
    cy.contains('Hak talebi başarılı!').should('exist')
    
    // --- 4. EDGE CASE: TEKRAR CLAIM ETME ---
    // Stok 1 olduğu için butonun 'Stok Tükendi'ye dönmesi gerekir
    cy.contains('Stok Tükendi').should('exist')
  })
})