// src/app/page.tsx
'use client' 
        
import { Box, Heading, Text, VStack, Link as ChakraLink, Container } from '@chakra-ui/react'
import Link from 'next/link'

export default function Home() {
  return (
    <Container centerContent py={20}>
      <VStack spacing={6} textAlign="center">
        <Heading as="h1" size="2xl">
          DropSpots Hoş Geldiniz!
        </Heading>
        <Text fontSize="lg" color="gray.600">
          İlgilendiğiniz drops için bekleme listesine katılın veya kendi drops yönetin.
        </Text>
        <VStack spacing={3} pt={5}>
          <ChakraLink as={Link} href="/drops" color="blue.500" fontSize="xl">
            → Aktif Drops Gör
          </ChakraLink>
          <ChakraLink as={Link} href="/admin" color="blue.500" fontSize="xl">
            → Admin Paneli
          </ChakraLink>
        </VStack>
      </VStack>
    </Container>
  )
}