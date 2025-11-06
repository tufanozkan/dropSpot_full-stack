// src/app/drops/page.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Heading,
  Spinner,
  Stack,
  Text,
  useToast,
  LinkBox,
  LinkOverlay,
  Tag, // <-- 1. YENİ İMPORT
} from '@chakra-ui/react'
import Link from 'next/link'
import api from '@/lib/api'
import { Drop } from '@/types'

// --- YENİ YARDIMCI FONKSİYON ---
// Drop durumunu hesaplamak için
const getDropStatus = (start: string, end: string): { 
  status: 'AÇIK' | 'KAPANDI' | 'YAKINDA', 
  color: string 
} => {
  const now = new Date().getTime();
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  if (now >= startTime && now <= endTime) {
    return { status: 'AÇIK', color: 'green' };
  }
  if (now < startTime) {
    return { status: 'YAKINDA', color: 'blue' };
  }
  return { status: 'KAPANDI', color: 'red' };
};
// -------------------------------

export default function DropsPage() {
  const [drops, setDrops] = useState<Drop[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()

  // Veri çekme kısmı (useEffect) aynı, değişiklik yok...
  useEffect(() => {
    const fetchDrops = async () => {
      try {
        const response = await api.get('/drops')
        setDrops(response.data)
      } catch (error) {
        toast({
          title: 'Hata',
          description: 'Drop verileri çekilemedi.',
          status: 'error',
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchDrops()
  }, [toast]) 

  if (isLoading) {
    return (
      <Container centerContent>
        <Spinner size="xl" mt={20} />
      </Container>
    )
  }

  return (
    <Container maxW="container.md" py={10}>
      <Heading as="h1" mb={6}>
        Aktif Drops
      </Heading>
      <Stack spacing={4}>
        {drops.length === 0 ? (
          <Text>Şu anda aktif bir drop bulunmuyor.</Text>
        ) : (
          // --- GÜNCELLENMİŞ MAP FONKSİYONU ---
          drops.map((drop) => {
            // Her drop için durumu hesapla
            const { status, color } = getDropStatus(
              drop.claim_window_start, 
              drop.claim_window_end
            );
            
            return (
              <LinkBox
                key={drop.id}
                p={5}
                shadow="md"
                borderWidth="1px"
                borderRadius="md"
                position="relative" // <-- Tag'i konumlandırmak için GEREKLİ
              >
                {/* YENİ TAG (DURUM ETİKETİ) */}
                <Tag 
                  position="absolute" 
                  top={2} 
                  right={2} 
                  colorScheme={color}
                  size="sm"
                >
                  {status}
                </Tag>
                
                <Heading size="md" my={2}>
                  <LinkOverlay as={Link} href={`/drops/${drop.id}`}>
                    {drop.title}
                  </LinkOverlay>
                </Heading>
                <Text mb={2}>{drop.description}</Text>
                <Text fontSize="sm" color="gray.600">
                  Stok: {drop.stock}
                </Text>
              </LinkBox>
            )
          })
          // --- GÜNCELLENMİŞ MAP BİTTİ ---
        )}
      </Stack>
    </Container>
  )
}