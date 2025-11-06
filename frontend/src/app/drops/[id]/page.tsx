'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Container,
  Heading,
  Spinner,
  Text,
  useToast,
  Stack,
  Tag,
} from '@chakra-ui/react'
import { useRouter, useParams } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import axios from 'axios'
import { Drop } from '@/types'


type DropStatus = 'OPEN' | 'CLOSED' | 'UPCOMING'

export default function DropDetailPage() {
  const params = useParams()
  const id = params.id as string

  const router = useRouter()
  const toast = useToast()
  
  const user = useAuthStore((state) => state.user)

  const [drop, setDrop] = useState<Drop | null>(null)
  const [status, setStatus] = useState<DropStatus>('CLOSED')
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)


  useEffect(() => {
    if (!id) return;

    const fetchDropDetails = async () => {
      try {
        const response = await api.get('/drops')
        const foundDrop = response.data.find((d: Drop) => d.id.toString() === id)
        
        if (foundDrop) {
          setDrop(foundDrop)
          const now = new Date().getTime()
          const start = new Date(foundDrop.claim_window_start).getTime()
          const end = new Date(foundDrop.claim_window_end).getTime()
          
          if (now >= start && now <= end) {
            setStatus('OPEN')
          } else if (now < start) {
            setStatus('UPCOMING')
          } else {
            setStatus('CLOSED')
          }
        } else {
          toast({ title: 'Drop bulunamadı', status: 'error' })
          router.push('/drops')
        }
      } catch (error) {
        toast({ title: 'Veri çekilemedi', status: 'error' })
      } finally {
        setIsLoading(false)
      }
    }
    fetchDropDetails()
  }, [id, router, toast])

  const handleAction = async (action: 'join' | 'leave' | 'claim') => {
    if (!user) {
      router.push('/login')
      return
    }
    
    setIsActionLoading(true)
    try {
      const response = await api.post(`/drops/${id}/${action}`)
      
      let toastTitle = ''
      if (action === 'join') toastTitle = 'Bekleme listesine katıldınız!'
      if (action === 'leave') toastTitle = 'Listeden ayrıldınız.'
      if (action === 'claim') toastTitle = `Hak talebi başarılı! Kodunuz: ${response.data.code}`
      
      toast({ title: toastTitle, status: 'success' })
      
    } catch (error: unknown) {
  let message = 'Bir hata oluştu.'

  if (axios.isAxiosError(error)) {
    message = error.response?.data?.detail ?? message
  }

  toast({
    title: 'İşlem başarısız',
    description: message,
    status: 'error',
  })
} finally {
  setIsActionLoading(false)
}
  }

  if (isLoading) {
    return <Container centerContent><Spinner size="xl" mt={20} /></Container>
  }
  
  if (!drop) {
    return <Container centerContent><Text mt={20}>Drop bulunamadı.</Text></Container>
  }

  return (
    <Container maxW="container.md" py={10}>
      <Stack spacing={4}>
        <Heading>{drop.title}</Heading>
        
        {status === 'OPEN' && <Tag size="lg" colorScheme="green">ŞU AN AÇIK</Tag>}
        {status === 'UPCOMING' && <Tag size="lg" colorScheme="blue">YAKINDA</Tag>}
        {status === 'CLOSED' && <Tag size="lg" colorScheme="red">KAPANDI</Tag>}
        
        <Text fontSize="lg">{drop.description}</Text>
        <Text>Stok: {drop.stock}</Text>
        <Text fontSize="sm" color="gray.500">
          Pencere: {new Date(drop.claim_window_start).toLocaleString()} - {new Date(drop.claim_window_end).toLocaleString()}
        </Text>
        
        {/* --- GÜNCELLENMİŞ BUTON BÖLÜMÜ --- */}
        <Box>
          {status === 'OPEN' ? (
            // 1. Claim penceresi AÇIKSA
            <Button 
              colorScheme="green" 
              size="lg"
              onClick={() => handleAction('claim')}
              isLoading={isActionLoading}
              isDisabled={drop.stock === 0}
            >
              {drop.stock === 0 ? 'Stok Tükendi' : 'ŞİMDİ HAK TALEP ET (CLAIM)'}
            </Button>
          ) : (
            // 2. Claim penceresi AÇIK DEĞİLSE (Yakında veya Kapalı)
            <Stack direction="row" spacing={4}>
              <Button 
                colorScheme="blue" 
                onClick={() => handleAction('join')}
                isLoading={isActionLoading}
                isDisabled={status === 'CLOSED'} // Kapandıysa butonu kitle
              >
                Bekleme Listesine Katıl
              </Button>
              
              {/* YENİ EKLENEN "LEAVE" BUTONU */}
              <Button 
                variant="outline"
                colorScheme="red" 
                onClick={() => handleAction('leave')}
                isLoading={isActionLoading}
                isDisabled={status === 'CLOSED'} // Kapandıysa butonu kitle
              >
                Listeden Ayrıl
              </Button>
            </Stack>
          )}
        </Box>
        {/* --- GÜNCELLENMİŞ BUTON BÖLÜMÜ BİTTİ --- */}

      </Stack>
    </Container>
  )
}