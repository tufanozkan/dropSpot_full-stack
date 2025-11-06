'use client'

import { useAuthStore } from '@/store/authStore'
import { 
  Box, 
  Button, 
  Container, 
  Flex, // Yatay hizalama için
  Heading, 
  Spacer, // Araya boşluk koymak için
  Text, 
  Link as ChakraLink // Next'in Link'i ile çakışmasın
} from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react' // Hydration hatasını önlemek için

export default function Navbar() {
  const router = useRouter()
  
  // Zustand store'undan 'user' ve 'logout' fonksiyonlarını al
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  // --- Hydration Hatası Çözümü ---
  // Sunucu (SSR) 'user'ı bilmez (localStorage'dadır).
  // Bu yüzden, sayfa yüklendikten (mount) sonra 'user'ı okumalıyız.
  const [isClient, setIsClient] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setIsClient(true), 0)
    return () => clearTimeout(t)
  }, [])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // Sadece client yüklendikten sonra render et
  if (!isClient) {
    return null // Veya bir yükleniyor ikonu
  }

  return (
    <Box bg="gray.100" py={4} shadow="sm">
      <Container maxW="container.lg">
        <Flex align="center">
          {/* Sol Taraf: Logo/Başlık */}
          <Heading as={Link} href="/" size="md" color="blue.600">
            DropSpot
          </Heading>
          
          <Spacer />
          
          {/* Sağ Taraf: Linkler ve Butonlar */}
          <Box>
            {user ? (
              // --- KULLANICI GİRİŞ YAPMIŞSA ---
              <Flex align="center" gap={4}>
                <Text fontSize="sm">
                  Hoş geldin, <Text as="b">{user.email}</Text>
                </Text>
                
                <ChakraLink as={Link} href="/drops" fontWeight="medium">
                  Drops
                </ChakraLink>
                
                {/* Sadece Admin ise Admin linkini göster */}
                {user.isAdmin && (
                  <ChakraLink as={Link} href="/admin" fontWeight="medium">
                    Admin
                  </ChakraLink>
                )}
                
                <Button colorScheme="red" size="sm" onClick={handleLogout}>
                  Çıkış Yap
                </Button>
              </Flex>
            ) : (
              // --- KULLANICI GİRİŞ YAPMAMIŞSA ---
              <Flex gap={4}>
                <Button as={Link} href="/login" size="sm" variant="ghost">
                  Giriş Yap
                </Button>
                <Button as={Link} href="/signup" colorScheme="blue" size="sm">
                  Kayıt Ol
                </Button>
              </Flex>
            )}
          </Box>
        </Flex>
      </Container>
    </Box>
  )
}