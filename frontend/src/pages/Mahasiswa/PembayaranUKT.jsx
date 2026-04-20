// PembayaranUKT.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from 'react-router-dom';
import api from '../../services/api'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import QRCode from "react-qr-code";
import { 
  FaPlus, FaReceipt, FaCheckCircle, FaClock, FaTimesCircle, 
  FaQrcode, FaExchangeAlt, FaMoneyBillWave, FaExclamationTriangle, 
  FaSync, FaExternalLinkAlt, FaInfoCircle, FaPercentage, 
  FaMoneyBill, FaCalendarAlt, FaCreditCard, FaCopy,
  FaBuilding, FaUser, FaCheck, FaUniversity, FaFileInvoice,
  FaFilter, FaHistory, FaTrash, FaBell, FaBan, FaSpinner,
  FaCalculator, FaWallet, FaShieldAlt, FaBell as FaBellIcon,
  FaRocket, // Tambahkan ini untuk animasi di notifikasi sukses
  FaChevronDown // Tambahkan ini untuk ikon dropdown
} from 'react-icons/fa'

const PembayaranUKT = () => {
  const { user, loading: authLoading, error: authError, logout } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [amountFormatted, setAmountFormatted] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('qris')
  const [paymentDetails, setPaymentDetails] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState('all') // Filter status pembayaran
  const [confirmData, setConfirmData] = useState(null)
  const [showWebhookSuccess, setShowWebhookSuccess] = useState(false)
  const [webhookMessage, setWebhookMessage] = useState('')
  const [webhookData, setWebhookData] = useState(null)
  const [activePaymentUUID, setActivePaymentUUID] = useState(null)
  const [fastPollingActive, setFastPollingActive] = useState(false)
  const [webhookAnimation, setWebhookAnimation] = useState('enter')
  const fastPollingRef = useRef(null)
  const webhookTimeoutRef = useRef(null)

  // State untuk tracking pembayaran yang sudah ditampilkan notifikasi
  const [processedInvoices, setProcessedInvoices] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('processedInvoices')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })

  // Format input dengan titik
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  }

  const parseNumber = (str) => {
    return parseInt(str.replace(/\./g, '')) || 0
  }

  // Handle amount input
  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    const numericValue = parseInt(value) || 0
    setAmount(numericValue)
    setAmountFormatted(formatNumber(value))
  }

  // Get sisa UKT
  const { 
    data: sisaUKTData, 
    isLoading: sisaLoading, 
    error: sisaError,
    refetch: refetchSisaUKT 
  } = useQuery({
    queryKey: ['sisaUKT'],
    queryFn: () => api.getSisaUKT().then(res => res.data.data),
    enabled: !!user && !authLoading,
    retry: 2,
    staleTime: 5000, // Data dianggap fresh selama 5 detik
  })

  // Get riwayat pembayaran dengan filter - TIDAK auto-refresh
  const { 
    data: riwayat, 
    isLoading: riwayatLoading, 
    error: riwayatError,
    refetch: refetchRiwayat 
  } = useQuery({
    queryKey: ['riwayatPembayaran', filter],
    queryFn: () => api.getRiwayatPembayaran(filter).then(res => res.data.data),
    enabled: !!user && !authLoading,
    retry: 2,
    staleTime: 5000,
  })

  // Simpan processed invoices ke sessionStorage
  const saveProcessedInvoice = useCallback((invoiceUUID) => {
    const updated = [...processedInvoices, invoiceUUID]
    setProcessedInvoices(updated)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('processedInvoices', JSON.stringify(updated))
    }
  }, [processedInvoices])

  // Cek jika ada pembayaran sukses yang baru di riwayat
  useEffect(() => {
    if (riwayat && Array.isArray(riwayat) && !fastPollingActive) {
      const newSuccessPayment = riwayat.find(p => 
        p.status === 'success' && 
        !processedInvoices.includes(p.invoice_uuid)
      )
      if (newSuccessPayment) {
        // Ini hanya backup mechanism jika fast polling gagal
        // Biarkan fast polling sebagai primary detection
        console.log('Backup webhook detection:', newSuccessPayment.invoice_uuid)
      }
    }
  }, [riwayat, processedInvoices, fastPollingActive])

  // FAST POLLING untuk pembayaran yang sedang aktif
  const startFastPolling = useCallback((invoiceUUID) => {
    setActivePaymentUUID(invoiceUUID)
    setFastPollingActive(true)
    // Hentikan polling sebelumnya jika ada
    if (fastPollingRef.current) {
      clearInterval(fastPollingRef.current)
    }
    console.log('🚀 Starting fast polling for:', invoiceUUID)
    // Mulai polling cepat (500ms untuk respons ultra-cepat)
    fastPollingRef.current = setInterval(() => {
      api.checkPaymentStatus(invoiceUUID)
        .then(response => {
          const status = response.data.data.status
          console.log('Fast polling check:', invoiceUUID, 'Status:', status)
          // Jika pembayaran berhasil
          if (status === 'success') {
            console.log('✅ Payment success detected via fast polling!')
            handlePaymentSuccess(invoiceUUID, response.data.data)
          }
          // Jika expired atau failed, hentikan polling
          if (status === 'expired' || status === 'failed') {
            console.log('⏹️ Stopping fast polling due to status:', status)
            stopFastPolling()
          }
        })
        .catch(err => {
          console.error('Fast polling error:', err)
        })
    }, 800) // Polling setiap 800ms untuk respons < 2 detik
  }, [])

  const stopFastPolling = useCallback(() => {
    if (fastPollingRef.current) {
      clearInterval(fastPollingRef.current)
      fastPollingRef.current = null
    }
    setFastPollingActive(false)
    setActivePaymentUUID(null)
  }, [])

  const handlePaymentSuccess = useCallback((invoiceUUID, paymentData) => {
    // Hentikan semua polling
    stopFastPolling()
    // Cek apakah sudah diproses
    if (processedInvoices.includes(invoiceUUID)) {
      console.log('Invoice already processed:', invoiceUUID)
      return
    }
    // Tandai sebagai diproses
    saveProcessedInvoice(invoiceUUID)
    // Tutup semua modal dengan animasi
    setWebhookAnimation('exit')
    setTimeout(() => {
      setShowPaymentModal(false)
      setShowConfirmModal(false)
      setPaymentDetails(null)
      // Tampilkan notifikasi webhook dengan animasi masuk
      setWebhookAnimation('enter')
      const message = `🎉 Pembayaran Berhasil! UKT telah dibayar sebesar ${formatRupiah(paymentData.nominal || paymentData.total_dibayar)}`
      setWebhookMessage(message)
      setWebhookData({
        ...paymentData,
        invoice_uuid: invoiceUUID
      })
      setShowWebhookSuccess(true)
    }, 300)
    // Auto-refresh data
    queryClient.invalidateQueries({ queryKey: ['sisaUKT'] })
    queryClient.invalidateQueries({ queryKey: ['riwayatPembayaran'] })
    setTimeout(() => {
      refetchSisaUKT()
      refetchRiwayat()
    }, 1000)
    // Auto hide notifikasi setelah 8 detik
    if (webhookTimeoutRef.current) clearTimeout(webhookTimeoutRef.current)
    webhookTimeoutRef.current = setTimeout(() => {
      setWebhookAnimation('exit')
      setTimeout(() => {
        setShowWebhookSuccess(false)
      }, 300)
    }, 8000)
  }, [processedInvoices, saveProcessedInvoice, stopFastPolling, queryClient, refetchSisaUKT, refetchRiwayat])

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: (data) => api.createPayment(data),
    onSuccess: (response) => {
      const paymentData = response.data.data
      setPaymentDetails(paymentData)
      setShowPaymentModal(true)
      setShowConfirmModal(false)
      setSuccessMessage('Pembayaran berhasil dibuat! Silakan selesaikan pembayaran.')
      // JANGAN refresh data otomatis saat pembayaran dibuat
      // Biarkan user tetap di halaman tanpa perubahan
      setAmount('')
      setAmountFormatted('')
      setErrorMessage('')
      // Mulai fast polling untuk pembayaran ini
      setTimeout(() => {
        startFastPolling(paymentData.uuid)
      }, 1000) // Tunggu 1 detik sebelum mulai polling
    },
    onError: (error) => {
      let errorMsg = 'Gagal membuat pembayaran. Silakan coba lagi.'
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error
      } else if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMsg = error.response.data
        } else {
          errorMsg = JSON.stringify(error.response.data)
        }
      } else if (error.message) {
        errorMsg = error.message
      }
      setErrorMessage(`Error ${error.response?.status || ''}: ${errorMsg}`)
      setShowConfirmModal(false)
      if (error.response?.status === 401) {
        logout()
        navigate('/login')
      }
    }
  })

  // Cancel payment mutation
  const cancelPaymentMutation = useMutation({
    mutationFn: (uuid) => api.cancelPayment(uuid),
    onSuccess: () => {
      refetchRiwayat()
      refetchSisaUKT()
      setSuccessMessage('Pembayaran berhasil dibatalkan')
      setShowPaymentModal(false)
      setPaymentDetails(null)
      stopFastPolling()
    },
    onError: (error) => {
      let errorMsg = 'Gagal membatalkan pembayaran'
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error
      }
      setErrorMessage(errorMsg)
      if (error.response?.status === 401) {
        logout()
        navigate('/login')
      }
    }
  })

  // Cleanup semua interval dan timeout saat komponen unmount
  useEffect(() => {
    return () => {
      if (fastPollingRef.current) clearInterval(fastPollingRef.current)
      if (webhookTimeoutRef.current) clearTimeout(webhookTimeoutRef.current)
    }
  }, [])

  const handleShowConfirm = (e) => {
    e.preventDefault()
    const nominal = amount
    if (!nominal || isNaN(nominal) || nominal < 100) {
      setErrorMessage('Nominal minimal Rp 100')
      return
    }
    if (sisaUKTData && nominal > sisaUKTData.sisa_ukt) {
      setErrorMessage(`Nominal melebihi sisa UKT. Sisa: Rp ${formatNumber(sisaUKTData.sisa_ukt?.toString() || '0')}`)
      return
    }
    if (nominal > 10000000) {
      setErrorMessage('Nominal maksimal Rp 10.000.000')
      return
    }
    // Validasi khusus untuk QRIS (500 - 250.000)
    if (paymentMethod === 'qris') {
      if (nominal > 250000) {
        setErrorMessage('Untuk QRIS maksimal Rp 250.000')
        return
      }
      if (nominal < 500) {
        setErrorMessage('Untuk QRIS minimal Rp 500')
        return
      }
    } else {
      // Validasi khusus untuk transfer (minimal 50.000)
      if (nominal < 50000) {
        setErrorMessage('Untuk transfer minimal Rp 50.000')
        return
      }
    }
    setConfirmData({
      nominal,
      paymentMethod
    })
    setErrorMessage('')
    setSuccessMessage('')
    setShowConfirmModal(true)
  }

  const handleConfirmPayment = () => {
    createPaymentMutation.mutate({ 
      nominal: confirmData.nominal, 
      metode: confirmData.paymentMethod 
    })
  }

  const handleCancelPayment = (invoiceUUID) => {
    if (window.confirm('Apakah Anda yakin ingin membatalkan pembayaran ini?')) {
      cancelPaymentMutation.mutate(invoiceUUID)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <FaCheckCircle className="text-lp-green text-lg" />
      case 'pending': return <FaClock className="text-yellow-500 text-lg" />
      case 'failed': return <FaBan className="text-lp-text3 font-light text-lg" />
      case 'expired': return <FaTimesCircle className="text-red-500 text-lg" />
      default: return <FaTimesCircle className="text-red-500 text-lg" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-lp-surface text-lp-text border-lp-border'
      case 'pending': return 'bg-lp-surface text-lp-text border-lp-border'
      case 'failed': return 'bg-lp-surface text-lp-text border-lp-border'
      case 'expired': return 'bg-lp-surface text-lp-text border-lp-border'
      default: return 'bg-lp-surface text-lp-text border-lp-border'
    }
  }

  const getMethodButtonClass = (method) => {
    const isActive = paymentMethod === method
    return `p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 transition-colors ${
      isActive
        ? 'border-lp-text bg-lp-bg text-lp-text'
        : 'border-lp-border bg-white text-lp-text2 hover:border-lp-text2'
    }`
  }

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(number)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return 'Tanggal tidak valid'
      }
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Tanggal tidak valid'
    }
  }

  const calculateTimeLeft = (expiredAt) => {
    if (!expiredAt) return ''
    try {
      const now = new Date()
      const expired = new Date(expiredAt)
      if (isNaN(expired.getTime())) return 'Tanggal tidak valid'
      const diff = expired - now
      if (diff <= 0) return 'Expired'
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      if (hours > 0) {
        return `${hours} jam ${minutes} menit`
      } else {
        return `${minutes} menit`
      }
    } catch (error) {
      return 'Waktu tidak valid'
    }
  }

  const getBankName = (paymentMethod) => {
    switch (paymentMethod) {
      case 'bri_va': return 'BRI Virtual Account'
      case 'bni_va': return 'BNI Virtual Account'
      case 'mandiri_va': return 'Mandiri Virtual Account'
      case 'bca_va': return 'BCA Virtual Account'
      case 'cimb_niaga_va': return 'CIMB Niaga Virtual Account'
      case 'sampoerna_va': return 'Bank Sampoerna Virtual Account'
      case 'bnc_va': return 'BNC Virtual Account'
      case 'maybank_va': return 'Maybank Virtual Account'
      case 'permata_va': return 'Permata Virtual Account'
      case 'atm_bersama_va': return 'ATM Bersama Virtual Account'
      case 'artha_graha_va': return 'Artha Graha Virtual Account'
      default: return 'Transfer Bank'
    }
  }

  // Webhook Success Notification Component dengan animasi yang diperbaiki
  const WebhookSuccessNotification = () => {
    if (!showWebhookSuccess || !webhookData) return null

    const animationClasses = {
      enter: 'animate-[fadeIn_0.4s_ease-out,slideIn_0.4s_ease-out]',
      exit: 'animate-[fadeOut_0.3s_ease-in,slideOut_0.3s_ease-in]'
    }

    return (
      <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
        {/* Backdrop dengan blur */}
        <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          webhookAnimation === 'enter' ? 'opacity-100' : 'opacity-0'
        }`} />

        {/* Notification Card */}
        <div className={`relative ${animationClasses[webhookAnimation]} transform transition-all duration-300`}>
          <div className="bg-lp-bg rounded-3xl p-1 max-w-md w-full shadow-2xl border border-lp-border">
            <div className="relative bg-lp-surface rounded-2xl p-6 overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-lp-bg rounded-full opacity-20"></div>
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-lp-surface rounded-full opacity-20"></div>

              <div className="relative text-center">
                {/* Animated success icon */}
                <div className="relative inline-block mb-5">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border">
                    <div className="absolute inset-0 bg-lp-bg rounded-full animate-ping opacity-20"></div>
                    <FaCheckCircle className="text-lp-text text-4xl z-10 animate-[bounce_1s_ease-in-out]" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-10 h-10 bg-lp-text rounded-full flex items-center justify-center animate-pulse">
                    <FaRocket className="text-white text-sm" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-lp-text font-semibold tracking-tight mb-3 bg-lp-bg bg-clip-text text-transparent">
                  💰 Pembayaran Berhasil!
                </h3>
                <p className="text-lp-text2 mb-6 text-lg font-medium">{webhookMessage}</p>

                {/* Payment Details Card */}
                <div className="bg-lp-bg border border-lp-border rounded-2xl p-5 mb-5 backdrop-blur-sm">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lp-text2 font-light font-medium">Invoice:</span>
                      <span className="font-mono text-sm bg-white border border-lp-border px-2 py-1 rounded">
                        {webhookData.invoice_uuid?.substring(0, 8) || webhookData.uuid?.substring(0, 8)}...
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lp-text2 font-light font-medium">Nominal:</span>
                      <span className="font-bold text-2xl text-lp-text animate-[pulse_2s_ease-in-out_infinite]">
                        {formatRupiah(webhookData.nominal || webhookData.total_dibayar)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lp-text2 font-light font-medium">Metode:</span>
                      <span className="font-bold text-lp-text bg-white border border-lp-border px-3 py-1 rounded-full">
                        {webhookData.payment_method === 'qris' ? 'QRIS' : getBankName(webhookData.payment_method)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Card */}
                <div className="bg-lp-bg border border-lp-border rounded-2xl p-4 mb-5">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-10 h-10 bg-white border border-lp-border rounded-full flex items-center justify-center">
                      <FaBellIcon className="text-lp-text2 text-lg" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-lp-text font-semibold">
                        ✅ <span className="font-bold">Webhook Pakasir.com Aktif!</span>
                      </p>
                      <p className="text-xs text-lp-text2">
                        Sisa UKT telah diperbarui secara otomatis
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <div className="inline-flex items-center space-x-2 text-xs text-lp-text2 bg-white border border-lp-border px-3 py-1 rounded-full">
                      <FaSync className="animate-spin" />
                      <span>Status terdeteksi dalam 1-2 detik</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => {
                      setWebhookAnimation('exit')
                      setTimeout(() => {
                        setShowWebhookSuccess(false)
                        // Hanya refetch data, tidak refresh halaman
                        refetchSisaUKT()
                        refetchRiwayat()
                      }, 300)
                    }}
                    className="flex-1 bg-lp-text text-white border-none px-5 py-3 rounded-xl font-semibold hover:bg-lp-atext transition-all duration-300 transform hover:scale-105 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border"
                  >
                    Tutup & Refresh Data
                  </button>
                  <button
                    onClick={() => {
                      setWebhookAnimation('exit')
                      setTimeout(() => {
                        setShowWebhookSuccess(false)
                        // Navigasi tanpa refresh
                        navigate(`/mahasiswa/invoice/${webhookData.invoice_uuid || webhookData.uuid}`)
                      }, 300)
                    }}
                    className="flex-1 bg-lp-text text-white border-none px-5 py-3 rounded-xl font-semibold hover:bg-lp-atext transition-all duration-300 transform hover:scale-105 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border"
                  >
                    Lihat Detail Invoice
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom animation styles dalam style tag biasa */}
        <style>
          {`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes fadeOut {
              from { opacity: 1; }
              to { opacity: 0; }
            }
            @keyframes slideIn {
              from { transform: translateY(-20px) scale(0.95); }
              to { transform: translateY(0) scale(1); }
            }
            @keyframes slideOut {
              from { transform: translateY(0) scale(1); }
              to { transform: translateY(-20px) scale(0.95); }
            }
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.8; }
            }
          `}
        </style>
      </div>
    )
  }

  // Confirm Modal Component
  const ConfirmModal = () => {
    if (!confirmData || !showConfirmModal) return null
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-lp-surface rounded-2xl max-w-md w-full animate-[fadeIn_0.3s_ease-out] border border-lp-border">
          {/* Header */}
            <div className="p-6 border-b border-lp-border">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-white border border-lp-border rounded-xl flex items-center justify-center">
                  <FaShieldAlt className="text-lp-text2 text-xl" />
                </div>
              <div>
                <h2 className="text-xl font-bold text-lp-text font-semibold tracking-tight">Konfirmasi Pembayaran</h2>
                <p className="text-lp-text2 font-light text-sm">Tinjau rincian sebelum melanjutkan</p>
              </div>
            </div>
          </div>
          {/* Body */}
            <div className="p-6">
             <div className="bg-lp-bg border border-lp-border rounded-xl p-5 mb-4">
              <h3 className="font-semibold text-lp-text font-semibold tracking-tight mb-3 flex items-center">
                 <FaCalculator className="mr-2 text-lp-text2" />
                Rincian Pembayaran
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-lp-text2 font-light">Metode</span>
                  <span className="font-bold text-lp-text font-semibold tracking-tight capitalize">
                    {confirmData.paymentMethod === 'qris' ? 'QRIS' : getBankName(confirmData.paymentMethod)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lp-text2 font-light">Nominal UKT</span>
                  <span className="font-bold text-lp-text font-semibold tracking-tight">{formatRupiah(confirmData.nominal)}</span>
                </div>
                 <div className="pt-3 border-t border-lp-border">
                  <p className="text-sm text-lp-text2 font-light mb-2">
                    Biaya admin akan ditentukan oleh Pakasir.com
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-lp-text font-semibold tracking-tight font-bold">Total yang akan dibayar</span>
                     <span className="font-bold text-lp-text text-lg">
                       {formatRupiah(confirmData.nominal)} + biaya admin
                     </span>
                   </div>
                 </div>
               </div>
               <div className="mt-4 p-3 bg-white border border-lp-border rounded-lg">
                 <p className="text-sm text-lp-text2 flex items-center">
                  <FaInfoCircle className="mr-2 flex-shrink-0" />
                  Biaya admin dari Pakasir akan ditambahkan otomatis. Total akhir akan ditampilkan setelah pembayaran dibuat.
                </p>
              </div>
            </div>
            <div className="text-sm text-lp-text2 font-light mb-4">
               <p className="flex items-center">
                 <FaCheck className="text-lp-text2 mr-2" />
                 Data yang dimasukkan akan dikirim ke server Pakasir.com
               </p>
             </div>
           </div>
           {/* Footer */}
           <div className="p-6 border-t border-lp-border">
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-gray-200 text-lp-text font-semibold tracking-tight py-3 px-4 rounded-xl font-medium hover:bg-gray-300 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={createPaymentMutation.isPending}
                className="flex-1 bg-lp-text text-white border-none py-3 px-4 rounded-xl font-medium hover:bg-lp-atext transition-colors flex items-center justify-center"
              >
                {createPaymentMutation.isPending ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <FaCheck className="mr-2" />
                    Konfirmasi & Bayar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Payment Modal Component
  const PaymentModal = () => {
    if (!paymentDetails || !showPaymentModal) return null

    // Cek expired dengan benar
    let isExpired = false
    if (paymentDetails.expired_time) {
      try {
        const expiredDate = new Date(paymentDetails.expired_time)
        const now = new Date()
        if (!isNaN(expiredDate.getTime())) {
          isExpired = expiredDate < now
        }
      } catch (error) {}
    }

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-lp-surface rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-[fadeIn_0.3s_ease-out] border border-lp-border">
          {/* Header */}
          <div className="sticky top-0 bg-lp-surface p-6 border-b border-lp-border rounded-t-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-lp-text font-semibold tracking-tight">
                Instruksi Pembayaran
              </h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setPaymentDetails(null)
                  stopFastPolling()
                }}
                className="text-lp-text3 font-light hover:text-lp-text2 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-lp-text2 font-light">
                Selesaikan pembayaran sebelum {paymentDetails.expired_time ? formatDate(paymentDetails.expired_time) : '24 jam'}
              </p>
              {isExpired && (
                <span className="px-3 py-1 bg-lp-bg text-lp-text text-sm font-medium rounded-full border border-lp-border">
                  Expired
                </span>
              )}
            </div>
            {!isExpired && paymentDetails.expired_time && (
              <div className="mt-2">
                <div className="flex items-center text-lp-text2">
                  <FaClock className="mr-2" />
                  <span className="text-sm">
                    Sisa waktu: {calculateTimeLeft(paymentDetails.expired_time)}
                  </span>
                </div>
              </div>
            )}
            {/* Fast Polling Indicator */}
            {fastPollingActive && !isExpired && (
              <div className="mt-2 flex items-center text-lp-text2 bg-lp-bg border border-lp-border p-2 rounded-lg">
                <FaSync className="animate-spin mr-2" />
                <span className="text-sm font-medium">
                  🔥 <span className="font-bold">FAST POLLING AKTIF:</span> Memantau status pembayaran secara real-time (deteksi dalam 1-2 detik)
                </span>
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div className="p-6">
            {/* Payment Summary */}
            <div className="bg-lp-bg rounded-xl p-5 mb-6 border border-lp-border">
              <h3 className="font-semibold text-lp-text font-semibold tracking-tight mb-4 flex items-center">
                <FaFileInvoice className="mr-2 text-lp-text2" />
                Rincian Pembayaran dari Pakasir.com
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-lp-text2 font-light text-sm">Metode</p>
                  <p className="font-bold text-lp-text font-semibold tracking-tight capitalize">
                    {paymentDetails.payment_method === 'qris' ? 'QRIS' : getBankName(paymentDetails.payment_method)}
                  </p>
                </div>
                <div>
                  <p className="text-lp-text2 font-light text-sm">Nominal UKT</p>
                  <p className="font-bold text-lp-text font-semibold tracking-tight">{formatRupiah(paymentDetails.nominal)}</p>
                </div>
                <div>
                  <p className="text-lp-text2 font-light text-sm">Biaya Admin Pakasir</p>
                  <p className="font-bold text-lp-text">{formatRupiah(paymentDetails.biaya_admin)}</p>
                </div>
                <div>
                  <p className="text-lp-text2 font-light text-sm">Total Bayar</p>
                  <p className="font-bold text-lp-text">{formatRupiah(paymentDetails.total_dibayar)}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-lp-border">
                <p className="text-lp-text2 font-light text-sm">ID Transaksi</p>
                <div className="flex items-center justify-between">
                  <code className="font-mono text-lp-text font-semibold tracking-tight text-sm">{paymentDetails.uuid}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(paymentDetails.uuid)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    className="text-lp-text2 hover:text-lp-text"
                  >
                    <FaCopy />
                  </button>
                </div>
                {copied && <span className="text-lp-text2 text-xs mt-1">Disalin!</span>}
              </div>
            </div>

            {/* QRIS Payment */}
            {paymentDetails.payment_method === 'qris' && paymentDetails.qrcode && !isExpired && (
              <div className="mb-6">
                <h3 className="font-semibold text-lp-text font-semibold tracking-tight mb-4 flex items-center">
                  <FaQrcode className="mr-2 text-lp-text2" />
                  Pembayaran QRIS
                </h3>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="bg-white p-4 rounded-lg border border-lp-border shadow-sm">
                    <QRCode
                      value={paymentDetails.qrcode}
                      size={200}
                      level="H"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="bg-lp-bg border border-lp-border rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-lp-text mb-2">Instruksi Pembayaran:</h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-lp-text2">
                        <li>Scan QR Code di atas menggunakan aplikasi e-wallet atau mobile banking</li>
                        <li>Atau klik link pembayaran di bawah untuk membuka halaman Pakasir</li>
                        <li>Pastikan nominal sesuai: {formatRupiah(paymentDetails.total_dibayar)}</li>
                        <li>Konfirmasi dan selesaikan pembayaran</li>
                        <li className="font-bold text-lp-text">Status akan otomatis terupdate via webhook Pakasir dalam 1-5 menit</li>
                      </ol>
                    </div>
                    <div className="mt-4">
                      {paymentDetails.payment_url && (
                        <a
                          href={paymentDetails.payment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 bg-lp-text text-white px-4 py-2 rounded-lg hover:bg-lp-atext transition-colors"
                        >
                          <FaExternalLinkAlt />
                          <span>Buka Halaman Pembayaran Pakasir</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transfer Payment */}
            {paymentDetails.payment_method !== 'qris' && !isExpired && (
              <div className="mb-6">
                <h3 className="font-semibold text-lp-text font-semibold tracking-tight mb-4 flex items-center">
                  <FaBuilding className="mr-2 text-lp-text2" />
                  {getBankName(paymentDetails.payment_method)}
                </h3>
                <div className="bg-lp-bg border border-lp-border rounded-xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white p-4 rounded-lg border border-lp-border">
                      <p className="text-lp-text2 font-light text-sm">Bank</p>
                      <p className="font-bold text-lp-text font-semibold tracking-tight text-lg">
                        {getBankName(paymentDetails.payment_method)}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-lp-border">
                      <p className="text-lp-text2 font-light text-sm">Nomor Virtual Account</p>
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-lp-text font-semibold tracking-tight text-lg font-mono">
                          {paymentDetails.payment_number || 'Sedang diproses...'}
                        </p>
                        {paymentDetails.payment_number && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(paymentDetails.payment_number)
                              setCopied(true)
                              setTimeout(() => setCopied(false), 2000)
                            }}
                            className="text-lp-text2 hover:text-lp-text ml-2"
                          >
                            <FaCopy />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-lp-border">
                      <p className="text-lp-text2 font-light text-sm">Nama Penerima</p>
                      <p className="font-bold text-lp-text font-semibold tracking-tight text-lg">Student Hub</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-lp-border">
                      <p className="text-lp-text2 font-light text-sm">Total Transfer</p>
                      <p className="font-bold text-lp-text text-lg">{formatRupiah(paymentDetails.total_dibayar)}</p>
                    </div>
                  </div>
                  <div className="bg-white border border-lp-border rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-lp-text mb-2 flex items-center">
                      <FaInfoCircle className="mr-2" />
                      Instruksi Transfer:
                    </h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-lp-text2">
                      <li>Buka aplikasi mobile banking atau internet banking Anda</li>
                      <li>Pilih menu "Transfer" → "Transfer ke Virtual Account"</li>
                      <li>Masukkan nomor Virtual Account di atas</li>
                      <li>Bank penerima: {getBankName(paymentDetails.payment_method)}</li>
                      <li>Masukkan nominal: {formatRupiah(paymentDetails.total_dibayar)}</li>
                      <li>Konfirmasi dan selesaikan transfer</li>
                      <li className="font-bold text-lp-text">Status akan otomatis terupdate via webhook Pakasir dalam 1-5 menit</li>
                    </ol>
                  </div>
                  {paymentDetails.payment_url && (
                    <div className="mt-4">
                      <a
                        href={paymentDetails.payment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 bg-lp-text text-white px-4 py-2 rounded-lg hover:bg-lp-atext transition-colors"
                      >
                        <FaExternalLinkAlt />
                        <span>Buka Halaman Pembayaran Pakasir</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Expired Message */}
            {isExpired && (
              <div className="mb-6 p-4 bg-lp-bg border border-lp-border rounded-xl">
                <div className="flex items-center space-x-3 text-lp-text">
                  <FaExclamationTriangle className="flex-shrink-0 text-xl" />
                  <div>
                    <h4 className="font-bold">Pembayaran Telah Kadaluarsa</h4>
                    <p className="mt-1">
                      Waktu pembayaran telah habis. Silakan buat pembayaran baru.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Note */}
            <div className="bg-lp-bg border border-lp-border rounded-lg p-4">
              <p className="text-lp-text2 text-sm">
                <span className="font-semibold">Catatan Penting:</span> Setelah menyelesaikan pembayaran, sistem akan otomatis menerima webhook dari Pakasir.com dan memperbarui status pembayaran serta sisa UKT Anda.
              </p>
              <p className="text-lp-text2 text-sm mt-2">
                <span className="font-semibold">Status Real-time:</span> Sistem sedang memantau status pembayaran ini. Jika pembayaran berhasil, modal ini akan otomatis tertutup dalam 1-2 detik.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-lp-surface p-6 border-t border-lp-border rounded-b-2xl">
            <div className="flex flex-col md:flex-row gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setPaymentDetails(null)
                  stopFastPolling()
                  // TIDAK melakukan refresh data saat tombol tutup ditekan
                }}
                className="flex-1 bg-lp-text text-white border-none py-3 px-6 rounded-xl font-semibold hover:bg-lp-atext transition-all duration-300"
              >
                Tutup
              </button>
              {/* Tombol Cancel hanya untuk pembayaran pending dan belum expired */}
              {!isExpired && paymentDetails.status === 'pending' && (
                <button
                  onClick={() => {
                    if (window.confirm('Apakah Anda yakin ingin membatalkan pembayaran ini?')) {
                      cancelPaymentMutation.mutate(paymentDetails.uuid)
                    }
                  }}
                  disabled={cancelPaymentMutation.isPending}
                  className="flex-1 bg-lp-text text-white border-none py-3 px-6 rounded-xl font-semibold hover:bg-lp-atext transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  {cancelPaymentMutation.isPending ? <FaSpinner className="animate-spin" /> : <FaBan />}
                  <span>{cancelPaymentMutation.isPending ? 'Membatalkan...' : 'Batalkan Pembayaran'}</span>
                </button>
              )}
            </div>
            {isExpired && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setShowPaymentModal(false)
                    setPaymentDetails(null)
                    stopFastPolling()
                    document.getElementById('payment-form')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="text-lp-text2 hover:text-lp-text font-medium"
                >
                  Buat Pembayaran Baru →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-lp-bg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lp-text mx-auto mb-4"></div>
            <p className="text-lp-text2 font-light">Memuat halaman pembayaran...</p>
          </div>
      </div>
    )
  }

  return (
    <>
      <WebhookSuccessNotification />
      <ConfirmModal />
      <PaymentModal />
      <div className="flex min-h-screen bg-lp-bg">
        <Sidebar role={user?.role} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-lp-text font-semibold tracking-tight mb-2">
                  {user?.role === 'orangtua' ? 'Pembayaran UKT Anak' : 'Pembayaran UKT'}
                </h1>
                <p className="text-lp-text2 font-light">
                  {user?.role === 'orangtua' 
                    ? 'Bayar UKT anak Anda dengan mudah'
                    : 'Bayar UKT Anda dengan mudah'
                  }
                </p>
                {fastPollingActive && (
                  <div className="mt-2 flex items-center text-lp-text2 bg-lp-surface border border-lp-border p-2 rounded-lg inline-flex animate-pulse">
                    <FaSync className="animate-spin mr-2" />
                    <span className="text-sm font-medium">🔥 Sedang memantau pembayaran secara real-time...</span>
                  </div>
                )}
              </div>

              {/* Error Display */}
              {errorMessage && (
                <div className="mb-6 p-4 bg-lp-bg border border-lp-border rounded-xl animate-[fadeIn_0.3s_ease-out]">
                  <div className="flex items-center space-x-3 text-lp-text">
                    <FaExclamationTriangle className="flex-shrink-0" />
                    <div>
                      <span className="font-medium">Error:</span>
                      <span className="ml-2">{errorMessage}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Display */}
              {successMessage && (
                <div className="mb-6 p-4 bg-lp-bg border border-lp-border rounded-xl animate-[fadeIn_0.3s_ease-out]">
                  <div className="flex items-center space-x-3 text-lp-text">
                    <FaCheckCircle className="flex-shrink-0" />
                    <div>
                      <span className="font-medium">Sukses:</span>
                      <span className="ml-2">{successMessage}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sisa UKT Card */}
              <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border p-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-lp-surface rounded-xl border border-lp-border flex items-center justify-center">
                      <FaUniversity className="text-lp-text2 text-lg" />
                    </div>
                    <h3 className="text-lg font-semibold text-lp-text font-semibold tracking-tight">Informasi UKT</h3>
                  </div>
                    <button
                    onClick={() => {
                      refetchSisaUKT()
                      refetchRiwayat()
                    }}
                    className="flex items-center space-x-2 text-lp-text2 hover:text-lp-text transition-colors"
                    disabled={sisaLoading}
                  >
                    <FaSync className={`${sisaLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-lp-surface p-4 rounded-xl border border-lp-border">
                    <p className="text-lp-text2 text-sm font-medium">Total UKT</p>
                    <p className="text-2xl font-bold text-lp-text font-semibold tracking-tight">Rp 7.000.000</p>
                  </div>
                  <div className="bg-lp-surface p-4 rounded-xl border border-lp-border">
                    <p className="text-lp-text2 text-sm font-medium">Sisa UKT</p>
                    <p className="text-2xl font-bold text-lp-text font-semibold tracking-tight">
                      {sisaLoading ? 'Loading...' : formatRupiah(sisaUKTData?.sisa_ukt || 0)}
                    </p>
                    <p className="text-xs text-lp-text3 font-light mt-1">
                      ✅ Auto-update via webhook Pakasir saat pembayaran berhasil
                    </p>
                  </div>
                  <div className="bg-lp-surface p-4 rounded-xl border border-lp-border">
                    <p className="text-lp-text2 text-sm font-medium">Progress</p>
                    <p className="text-2xl font-bold text-lp-text font-semibold tracking-tight">
                      {sisaLoading ? '0%' : `${Math.round(((7000000 - (sisaUKTData?.sisa_ukt || 0)) / 7000000) * 100)}%`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Create Payment Card */}
              <div id="payment-form" className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border p-6 mb-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-lp-surface border border-lp-border rounded-xl flex items-center justify-center">
                    <FaWallet className="text-lp-text2 text-lg" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight">
                      {user?.role === 'orangtua' ? 'Bayar UKT Anak' : 'Bayar UKT'}
                    </h3>
                  </div>
                </div>
                <form onSubmit={handleShowConfirm} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-lp-text2 mb-2">
                      Jumlah Pembayaran
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-lp-text3 font-light font-medium">Rp</span>
                      <input
                        type="text"
                        value={amountFormatted}
                        onChange={handleAmountChange}
                        className="
                          w-full pl-12 pr-4 py-3 border border-lp-border rounded-xl
                          focus:outline-none focus:ring-2 focus:ring-lp-text/20 focus:border-transparent
                          transition-all duration-300
                          bg-lp-surface focus:bg-white text-lg font-medium
                        "
                        placeholder="Masukan Nominal"
                        required
                        disabled={createPaymentMutation.isPending}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <p className="text-sm text-lp-text3 font-light">
                        Sisa UKT: <span className="font-semibold">{formatRupiah(sisaUKTData?.sisa_ukt || 0)}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (sisaUKTData?.sisa_ukt) {
                            setAmount(sisaUKTData.sisa_ukt)
                            setAmountFormatted(formatNumber(sisaUKTData.sisa_ukt.toString()))
                          }
                        }}
                        className="text-sm text-lp-text2 hover:text-lp-text font-medium"
                      >
                        Bayar Semua
                      </button>
                    </div>
                  </div>

                  {/* Payment Method Selection */}
                  <div>
                    <label className="block text-sm font-medium text-lp-text2 mb-2">
                      Metode Pembayaran
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('qris')}
                        className={getMethodButtonClass('qris')}
                      >
                        <FaQrcode className="text-2xl" />
                        <span className="text-sm font-medium">QRIS</span>
                        <span className="text-xs text-lp-text3 font-light">Rp 500 - 250k</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('bri_va')}
                        className={getMethodButtonClass('bri_va')}
                      >
                        <FaBuilding className="text-2xl" />
                        <span className="text-sm font-medium">BRI VA</span>
                        <span className="text-xs text-lp-text3 font-light">Min. Rp 50k</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('bni_va')}
                        className={getMethodButtonClass('bni_va')}
                      >
                        <FaBuilding className="text-2xl" />
                        <span className="text-sm font-medium">BNI VA</span>
                        <span className="text-xs text-lp-text3 font-light">Min. Rp 50k</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('mandiri_va')}
                        className={getMethodButtonClass('mandiri_va')}
                      >
                        <FaBuilding className="text-2xl" />
                        <span className="text-sm font-medium">Mandiri VA</span>
                        <span className="text-xs text-lp-text3 font-light">Min. Rp 50k</span>
                      </button>
                    </div>
                  </div>

                  {/* Payment Preview */}
                  {amount >= 500 && (
                    <div className="bg-lp-bg rounded-xl p-5 border border-lp-border">
                      <h4 className="font-semibold text-lp-text font-semibold tracking-tight mb-4 flex items-center">
                        <FaCalculator className="mr-2 text-lp-text2" />
                        Preview Pembayaran:
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-lp-text2 font-light">Metode Pembayaran</span>
                          <span className="font-semibold capitalize">
                            {paymentMethod === 'qris' ? 'QRIS' : getBankName(paymentMethod)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-lp-text2 font-light">Nominal UKT</span>
                          <span className="font-semibold">{formatRupiah(amount)}</span>
                        </div>
                        <div className="pt-3 border-t border-lp-border">
                          <p className="text-sm text-lp-text2 font-light">
                            Biaya admin akan ditentukan oleh Pakasir.com dan ditampilkan setelah pembayaran dibuat
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-white rounded-lg border border-lp-border">
                        <p className="text-sm text-lp-text2 flex items-center">
                          <FaInfoCircle className="mr-2" />
                        Pembayaran akan diproses tanpa refresh halaman
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      createPaymentMutation.isPending || 
                      !amount || 
                      amount < 100 || 
                      (sisaUKTData && amount > sisaUKTData.sisa_ukt) ||
                      (paymentMethod === 'qris' && amount > 250000) ||
                      (paymentMethod === 'qris' && amount < 500) ||
                      (paymentMethod !== 'qris' && amount < 50000)
                    }
                    className="
                      w-full bg-lp-text text-white border-none
                      py-4 px-6 rounded-xl font-semibold text-lg
                      hover:bg-lp-atext transform hover:scale-[1.02]
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                      transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border hover:shadow-xl
                      flex items-center justify-center space-x-3
                    "
                  >
                    {createPaymentMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Memproses Pembayaran...</span>
                      </>
                    ) : (
                      <>
                        <FaCreditCard className="text-xl" />
                        <span>Buat Pembayaran</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Riwayat Pembayaran */}
              <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                  <div className="flex items-center space-x-3 mb-4 md:mb-0">
                    <div className="w-10 h-10 bg-lp-surface border border-lp-border rounded-xl flex items-center justify-center">
                      <FaHistory className="text-lp-text2 text-lg" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight">
                        {user?.role === 'orangtua' ? 'Riwayat Pembayaran Anak' : 'Riwayat Pembayaran'}
                      </h3>
                      <p className="text-lp-text2 font-light text-sm">Histori pembayaran UKT Anda (auto-update via webhook Pakasir)</p>
                    </div>
                  </div>
                  {/* Filter Section - Diperbarui menjadi dropdown */}
                  <div className="flex items-center space-x-3">
                    <label htmlFor="statusFilter" className="text-lp-text2 font-light text-sm whitespace-nowrap">Filter Status:</label>
                    <div className="relative">
                      <select
                        id="statusFilter"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="
                          appearance-none bg-white border border-lp-border rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-lp-text/20 focus:border-transparent
                          min-w-[120px] cursor-pointer
                        "
                      >
                        <option value="all">Semua</option>
                        <option value="pending">Pending</option>
                        <option value="success">Sukses</option>
                        <option value="failed">Dibatalkan</option>
                        <option value="expired">Kadaluarsa</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-lp-text2">
                        <FaChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>

                {riwayatLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lp-text mx-auto mb-4"></div>
                      <p className="text-lp-text2 font-light">Memuat riwayat pembayaran...</p>
                    </div>
                ) : riwayat && riwayat.length > 0 ? (
                  <div className="space-y-4">
                    {riwayat.map(transaksi => {
                      let isExpired = false
                      if (transaksi.expired_at && transaksi.status === 'pending') {
                        try {
                          const expiredDate = new Date(transaksi.expired_at)
                          if (!isNaN(expiredDate.getTime())) {
                            isExpired = expiredDate < new Date()
                          }
                        } catch (error) {}
                      }
                      const status = isExpired ? 'expired' : transaksi.status
                      return (
                        <div 
                          key={transaksi.id}
                          className="border border-lp-border rounded-xl p-5 transition-all duration-300 bg-lp-surface"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-bold text-lp-text font-semibold tracking-tight">
                                  Invoice #{transaksi.invoice_uuid?.substring(0, 8).toUpperCase() || 'N/A'}
                                </span>
                                <span className="text-xs text-lp-text3 font-light bg-white border border-lp-border px-2 py-1 rounded-full">
                                  {formatDate(transaksi.tanggal)}
                                </span>
                              </div>
                              <p className="text-sm text-lp-text3 font-light">
                                {formatDate(transaksi.tanggal)}
                              </p>
                            </div>
                            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border ${getStatusColor(status)} text-sm font-medium`}>
                              {getStatusIcon(status)}
                              <span className="capitalize">{status === 'failed' ? 'Dibatalkan' : status}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div className="bg-white p-3 rounded-lg border border-lp-border">
                              <span className="text-lp-text2 text-xs font-medium">NOMINAL UKT</span>
                              <p className="font-bold text-lp-text font-semibold tracking-tight">{formatRupiah(transaksi.nominal || 0)}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-lp-border">
                              <span className="text-lp-text2 text-xs font-medium">BIAYA ADMIN</span>
                              <p className="font-bold text-lp-text font-semibold tracking-tight">{formatRupiah(transaksi.biaya_admin || 0)}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-lp-border">
                              <span className="text-lp-text2 text-xs font-medium">TOTAL BAYAR</span>
                              <p className="font-bold text-lp-text font-semibold tracking-tight">{formatRupiah(transaksi.total_dibayar || 0)}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-lp-border">
                              <span className="text-lp-text2 text-xs font-medium">METODE</span>
                              <div className="flex items-center space-x-2">
                                {transaksi.payment_method === 'qris' ? 
                                  <FaQrcode className="text-lp-text2" /> : 
                                  <FaBuilding className="text-lp-text2" />
                                }
                                <span className="font-bold text-lp-text font-semibold tracking-tight capitalize">
                                  {transaksi.payment_method === 'qris' ? 'QRIS' : getBankName(transaksi.payment_method)}
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* Additional info for pending payments */}
                          {status === 'pending' && !isExpired && transaksi.expired_at && (
                            <div className="mt-4 pt-4 border-t border-lp-border border">
                              <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 text-lp-text2">
                                  <FaClock />
                                  <span className="text-sm">
                                    Sisa waktu: {calculateTimeLeft(transaksi.expired_at)}
                                  </span>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => {
                                      api.getPaymentDetails(transaksi.invoice_uuid)
                                        .then(res => {
                                          setPaymentDetails(res.data.data)
                                          setShowPaymentModal(true)
                                          startFastPolling(transaksi.invoice_uuid)
                                        })
                                        .catch(err => {
                                          setErrorMessage('Gagal memuat detail pembayaran')
                                        })
                                    }}
                                    className="bg-lp-text text-white py-2 px-4 rounded-lg hover:bg-lp-atext transition-colors flex items-center space-x-2"
                                  >
                                    <FaInfoCircle />
                                    <span>Detail</span>
                                  </button>
                                  <button
                                    onClick={() => handleCancelPayment(transaksi.invoice_uuid)}
                                    className="bg-lp-text text-white py-2 px-4 rounded-lg hover:bg-lp-atext transition-colors flex items-center space-x-2"
                                  >
                                    <FaBan />
                                    <span>Batalkan</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Expired message */}
                          {isExpired && (
                            <div className="mt-4 p-3 bg-lp-bg border border-lp-border rounded-lg">
                              <div className="flex items-center space-x-2 text-lp-text">
                                <FaExclamationTriangle />
                                <span className="text-sm">
                                  Pembayaran telah kadaluarsa pada {formatDate(transaksi.expired_at)}
                                </span>
                              </div>
                            </div>
                          )}
                          {/* Success message */}
                          {status === 'success' && (
                            <div className="mt-4 p-3 bg-lp-bg border border-lp-border rounded-lg">
                              <div className="flex items-center space-x-2 text-lp-text">
                                <FaCheckCircle />
                                <span className="text-sm">
                                  Pembayaran berhasil dikonfirmasi
                                </span>
                              </div>
                              <div className="mt-2 text-sm text-lp-text2">
                                Sisa UKT telah otomatis diperbarui -{formatRupiah(transaksi.nominal)}
                              </div>
                            </div>
                          )}
                          {status === 'failed' && (
                            <div className="mt-4 p-3 bg-lp-bg border border-lp-border rounded-lg">
                              <div className="flex items-center space-x-2 text-lp-text2 font-light">
                                <FaBan />
                                <span className="text-sm">
                                  Pembayaran telah dibatalkan
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">📝</div>
                    <h3 className="text-lg font-semibold text-lp-text font-semibold tracking-tight mb-2">
                      {filter === 'all' 
                        ? 'Belum ada riwayat pembayaran' 
                        : `Tidak ada pembayaran dengan status ${filter === 'failed' ? 'dibatalkan' : filter}`
                      }
                    </h3>
                    <p className="text-lp-text2 font-light mb-6">
                      {filter === 'all' 
                        ? (user?.role === 'orangtua' 
                          ? 'Lakukan pembayaran pertama untuk anak Anda.' 
                          : 'Lakukan pembayaran pertama Anda untuk memulai.'
                        )
                        : 'Coba filter lainnya atau buat pembayaran baru.'
                      }
                    </p>
                    {filter === 'all' && (
                      <button
                        onClick={() => {
                          const form = document.getElementById('payment-form')
                          if (form) {
                            form.scrollIntoView({ behavior: 'smooth' })
                          }
                        }}
                        className="inline-flex items-center space-x-2 bg-lp-text text-white px-4 py-2 rounded-lg hover:bg-lp-atext transition-colors"
                      >
                        <FaMoneyBillWave />
                        <span>Buat Pembayaran Pertama</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}

export default PembayaranUKT
