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

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
    await api.post('/auth/signup', { email, password })

    toast({
        title: 'Hesap oluşturuldu.',
        description: 'Başarıyla kayıt oldunuz. Şimdi giriş yapabilirsiniz.',
        status: 'success',
        duration: 3000,
        isClosable: true,
    })

  router.push('/auth/login')

    } catch (err: unknown) {

    const error = err as AxiosError<{ detail?: string }>

    toast({
        title: 'Bir hata oluştu.',
        description: error.response?.data?.detail || 'Kayıt başarısız.',
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
          Kayıt Ol
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
            Kayıt Ol
          </Button>
          <Box textAlign="center" mt={4}>
            <ChakraLink as={Link} href="/auth/login" color="blue.500">
              Zaten bir hesabın var mı? Giriş yap.
            </ChakraLink>
          </Box>
        </form>
      </Box>
    </Container>
  )
}