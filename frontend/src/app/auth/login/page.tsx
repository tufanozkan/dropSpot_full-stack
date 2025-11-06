'use client'

import { useState } from 'react'
import { AxiosError } from "axios"
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Heading,
  useToast,
  Container,
  Link as ChakraLink,
} from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()
  const router = useRouter()
  
  const setAuth = useAuthStore((state) => state.setAuth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
    const formData = new URLSearchParams()
    formData.append("username", email)
    formData.append("password", password)

    const loginResponse = await api.post('/auth/login', formData)
    const { access_token } = loginResponse.data

    const user = {
        email,
        isAdmin: email === 'admin@test.com',
    }

    setAuth(access_token, user)

    toast({
        title: 'Giriş başarılı.',
        status: 'success',
        duration: 3000,
        isClosable: true,
    })

    setTimeout(() => {
        router.push(user.isAdmin ? '/admin' : '/')
      }, 50)

    router.push(user.isAdmin ? '/admin' : '/')
    
    } catch (err: unknown) {

    const error = err as AxiosError<{ detail?: string }>

    toast({
        title: 'Giriş başarısız.',
        description: error.response?.data?.detail || 'E-posta veya parola hatalı.',
        status: 'error',
        duration: 5000,
        isClosable: true,
    })

    } finally {
    setIsLoading(false)
    }
  }

  return (
    <Container centerContent>
      <Box w="100%" maxW="md" p={8} mt={20} borderWidth={1} borderRadius="lg" shadow="md">
        <Heading as="h1" size="lg" textAlign="center" mb={6}>
          Giriş Yap
        </Heading>
        <form onSubmit={handleSubmit}>
          <FormControl isRequired mb={4}>
            <FormLabel>E-posta</FormLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@test.com"
            />
          </FormControl>
          <FormControl isRequired mb={6}>
            <FormLabel>Parola</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormControl>
          <Button
            type="submit"
            colorScheme="blue"
            width="full"
            isLoading={isLoading}
          >
            Giriş Yap
          </Button>
          <Box textAlign="center" mt={4}>
            <ChakraLink as={Link} href="/auth/signup" color="blue.500">
              Hesabın yok mu? Kayıt ol.
            </ChakraLink>
          </Box>
        </form>
      </Box>
    </Container>
  )
}