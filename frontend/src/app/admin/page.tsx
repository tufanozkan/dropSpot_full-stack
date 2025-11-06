// src/app/admin/page.tsx
'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import {
  Box,
  Button,
  Container,
  Heading,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useToast,
  IconButton, // <-- YENİ İKONLAR İÇİN
  Stack,      // <-- YENİ (Butonları yanyana koymak için)
  
  // Modal (Form)
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  NumberInput,
  NumberInputField,

  // --- YENİ (Silme Onayı için) ---
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  // ---------------------------------

} from '@chakra-ui/react'
import { DeleteIcon, EditIcon } from '@chakra-ui/icons'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Drop } from '@/types'
import React from 'react' // <-- YENİ (AlertDialog için)

// Tarihi 'datetime-local' input'unun anlayacağı formata çevirir
const toLocalISOString = (date: Date) => {
  const tzOffset = date.getTimezoneOffset() * 60000; //ms cinsinden ofset
  const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
  return localISOTime;
}

const initialFormState = {
  title: '',
  description: '',
  stock: 100,
  claim_window_start: toLocalISOString(new Date()),
  claim_window_end: toLocalISOString(new Date(new Date().getTime() + 3600000)), // 1 saat sonrası
}

export default function AdminPage() {
  const router = useRouter()
  const toast = useToast()
  
  // 1. Global State
  const { user } = useAuthStore()

  // 2. Sayfa State'leri
  const [drops, setDrops] = useState<Drop[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthChecking, setIsAuthChecking] = useState(true)

  // --- GÜNCELLENMİŞ STATE'LER ---
  const { isOpen, onOpen, onClose } = useDisclosure() // Form Modal'ı
  const [newDrop, setNewDrop] = useState(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // YENİ STATE (Update için): Hangi drop'u düzenlediğimizi tutar
  const [editingDrop, setEditingDrop] = useState<Drop | null>(null)
  
  // YENİ STATE (Delete için): Hangi drop'u sileceğimizi tutar
  const [dropToDelete, setDropToDelete] = useState<Drop | null>(null)
  const { 
    isOpen: isDeleteOpen, 
    onOpen: onDeleteOpen, 
    onClose: onDeleteClose 
  } = useDisclosure() // Delete Modal'ı
  const deleteCancelRef = React.useRef(null)
  // ------------------------------------

  // 3. Auth Guard (Değişiklik yok)
  useEffect(() => {
    useAuthStore.persist.rehydrate()
    const authUser = useAuthStore.getState().user
    if (!authUser) router.replace('/login')
    else if (!authUser.isAdmin) router.replace('/')
    else setIsAuthChecking(false)
  }, [router])

  // 4. Veri Çekme (Değişiklik yok)
  useEffect(() => {
    if (!isAuthChecking && user?.isAdmin) {
      const fetchDrops = async () => {
        setIsLoading(true)
        try {
          const response = await api.get<Drop[]>('/admin/drops')
          setDrops(response.data)
        } catch (error) {
          toast({ title: 'Hata', description: 'Drop verileri çekilemedi.', status: 'error' })
        } finally {
          setIsLoading(false)
        }
      }
      fetchDrops()
    }
  }, [isAuthChecking, user, toast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewDrop((prev) => ({ ...prev, [name]: value }))
  }

  // --- YENİ FONKSİYONLAR (Modal'ı açmak için) ---
  const openCreateModal = () => {
    setEditingDrop(null) // Düzenleme modunda değiliz
    setNewDrop(initialFormState) // Formu sıfırla
    onOpen()
  }

  const openEditModal = (drop: Drop) => {
    setEditingDrop(drop) // Düzenlenecek drop'u ayarla
    // Formu, mevcut drop'un bilgileriyle doldur
    setNewDrop({
      title: drop.title,
      description: drop.description || '',
      stock: drop.stock,
      // Tarihleri 'datetime-local' formatına çevir
      claim_window_start: toLocalISOString(new Date(drop.claim_window_start)),
      claim_window_end: toLocalISOString(new Date(drop.claim_window_end)),
    })
    onOpen()
  }

  const openDeleteModal = (drop: Drop) => {
    setDropToDelete(drop) // Silinecek drop'u ayarla
    onDeleteOpen()
  }
  // ------------------------------------------

  // --- GÜNCELLENMİŞ Form Submit (Create & Update) ---
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const dropData = {
      ...newDrop,
      stock: Number(newDrop.stock),
      claim_window_start: new Date(newDrop.claim_window_start).toISOString(),
      claim_window_end: new Date(newDrop.claim_window_end).toISOString(),
    }
    
    try {
      if (editingDrop) {
        // --- GÜNCELLEME (UPDATE) ---
        const response = await api.put<Drop>(`/admin/drops/${editingDrop.id}`, dropData)
        // Listedeki eski drop'u yeni veriyle değiştir
        setDrops((prev) => 
          prev.map((d) => (d.id === editingDrop.id ? response.data : d))
        )
        toast({ title: 'Drop güncellendi!', status: 'success' })
      } else {
        // --- YENİ OLUŞTURMA (CREATE) ---
        const response = await api.post<Drop>('/admin/drops', dropData)
        setDrops((prev) => [...prev, response.data]) // Listeye ekle
        toast({ title: 'Drop oluşturuldu!', status: 'success' })
      }
      onClose() // Modal'ı kapat
      
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
      setIsSubmitting(false)
    }
  }

  // --- YENİ FONKSİYON (Delete) ---
  const handleDeleteDrop = async () => {
    if (!dropToDelete) return
    setIsSubmitting(true)
    
    try {
      await api.delete(`/admin/drops/${dropToDelete.id}`)
      // Listeden silinen drop'u filtrele
      setDrops((prev) => prev.filter((d) => d.id !== dropToDelete.id))
      toast({ title: 'Drop silindi!', status: 'success' })
      onDeleteClose() // Silme modal'ını kapat
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
      setDropToDelete(null)
      setIsSubmitting(false)
    }
  }


  if (isAuthChecking || isLoading) {
    return <Container centerContent><Spinner size="xl" mt={20} /></Container>
  }

  return (
    <Container maxW="container.lg" py={10}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Heading as="h1">Admin Paneli - Drop Yönetimi</Heading>
        <Button colorScheme="blue" onClick={openCreateModal}> {/* <-- onClick güncellendi */}
          + Yeni Drop Ekle
        </Button>
      </Box>

      {/* --- GÜNCELLENMİŞ TABLO --- */}
      <TableContainer>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Başlık</Th>
              <Th>Stok</Th>
              <Th>Claim Başlangıç (UTC)</Th>
              <Th>İşlemler</Th>
            </Tr>
          </Thead>
          <Tbody>
            {drops.map((drop) => (
              <Tr key={drop.id}>
                <Td>{drop.id}</Td>
                <Td>{drop.title}</Td>
                <Td>{drop.stock}</Td>
                <Td>{new Date(drop.claim_window_start).toLocaleString()}</Td>
                <Td>
                  {/* YENİ BUTONLAR */}
                  <Stack direction="row" spacing={2}>
                    <IconButton 
                      aria-label="Düzenle" 
                      icon={<EditIcon />} 
                      colorScheme="yellow"
                      onClick={() => openEditModal(drop)}
                    />
                    <IconButton 
                      aria-label="Sil" 
                      icon={<DeleteIcon />} 
                      colorScheme="red"
                      onClick={() => openDeleteModal(drop)}
                    />
                  </Stack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      {/* --- GÜNCELLENMİŞ FORM MODAL'I (Create & Update) --- */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <form onSubmit={handleFormSubmit}>
            <ModalHeader>
              {/* Başlık artık dinamik */}
              {editingDrop ? 'Drop Düzenle' : 'Yeni Drop Oluştur'}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              {/* Formun geri kalanı (inputlar) aynı, 'min' kuralı hariç */}
              <FormControl isRequired>
                <FormLabel>Başlık</FormLabel>
                <Input name="title" value={newDrop.title} onChange={handleInputChange} />
              </FormControl>
              {/* ... (description ve stock inputları aynı) ... */}
              <FormControl mt={4}>
                <FormLabel>Açıklama</FormLabel>
                <Textarea name="description" value={newDrop.description} onChange={handleInputChange} />
              </FormControl>
              <FormControl mt={4} isRequired>
                <FormLabel>Stok</FormLabel>
                <NumberInput 
                  value={newDrop.stock} // value eklendi
                  min={0}
                  onChange={(_, valueAsNumber) => setNewDrop((prev) => ({ ...prev, stock: valueAsNumber }))}
                >
                  <NumberInputField name="stock" />
                </NumberInput>
              </FormControl>

              <FormControl mt={4} isRequired>
                <FormLabel>Claim Başlangıç Zamanı</FormLabel>
                <Input
                  name="claim_window_start"
                  value={newDrop.claim_window_start}
                  onChange={handleInputChange}
                  type="datetime-local"
                />
              </FormControl>
              <FormControl mt={4} isRequired>
                <FormLabel>Claim Bitiş Zamanı</FormLabel>
                <Input
                  name="claim_window_end"
                  value={newDrop.claim_window_end}
                  onChange={handleInputChange}
                  type="datetime-local"
                  min={newDrop.claim_window_start} // Bitiş, başlangıçtan sonra olmalı
                />
              </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button type="submit" colorScheme="blue" mr={3} isLoading={isSubmitting}>
                Kaydet
              </Button>
              <Button onClick={onClose}>İptal</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* --- YENİ SİLME MODAL'I (Alert) --- */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={deleteCancelRef}
        onClose={onDeleteClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Drop Sil
            </AlertDialogHeader>
            <AlertDialogBody>
              {dropToDelete?.title} başlıklı drop silmek istediğinizden emin misiniz? 
              Bu işlem geri alınamaz.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={deleteCancelRef} onClick={onDeleteClose}>
                İptal
              </Button>
              <Button 
                colorScheme="red" 
                onClick={handleDeleteDrop} 
                ml={3}
                isLoading={isSubmitting}
              >
                Sil
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

    </Container>
  )
}