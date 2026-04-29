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
  FaChevronDown, // Tambahkan ini untuk ikon dropdown
  FaGraduationCap, FaArrowRight, FaTimes
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

  const WebhookSuccessNotification = () => {
    if (!showWebhookSuccess || !webhookData) return null

    const animationClasses = {
      enter: 'animate-[fadeIn_0.4s_ease-out,slideIn_0.4s_ease-out]',
      exit: 'animate-[fadeOut_0.3s_ease-in,slideOut_0.3s_ease-in]'
    }

    return (
      <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
        {/* Backdrop dengan blur */}
        <div className={`absolute inset-0 bg-lp-surface/60 backdrop-blur-sm transition-opacity duration-300 ${
          webhookAnimation === 'enter' ? 'opacity-100' : 'opacity-0'
        }`} />

        {/* Notification Card */}
        <div className={`relative ${animationClasses[webhookAnimation]} transform transition-all duration-300 w-full max-w-md`}>
          <div className="bg-white border border-lp-border rounded-[24px] shadow-[0_24px_60px_rgba(0,0,0,0.1)] overflow-hidden relative">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-lp-accent/40 via-lp-accent to-lp-accent/40"></div>
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-lp-accent/5 rounded-full blur-2xl"></div>

            <div className="p-8 text-center relative z-10">
              {/* Animated success icon */}
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 bg-lp-surface rounded-[20px] flex items-center justify-center mx-auto shadow-inner border border-lp-border relative">
                  <div className="absolute inset-0 bg-lp-green/10 rounded-[20px] animate-pulse"></div>
                  <FaCheckCircle className="text-lp-green text-4xl relative z-10 animate-[bounce_1s_ease-in-out]" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-lp-text rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  <FaRocket className="text-white text-xs" />
                </div>
              </div>

              <h3 className="text-[22px] font-bold text-lp-text tracking-tight mb-2">
                Pembayaran Berhasil!
              </h3>
              <p className="text-[13.5px] font-light text-lp-text2 mb-6 leading-relaxed px-4">{webhookMessage}</p>

              {/* Payment Details Card */}
              <div className="bg-lp-surface/50 border border-lp-border rounded-[16px] p-5 mb-6 text-left">
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-lp-border/50 pb-2">
                    <span className="text-[12.5px] text-lp-text2 font-light">Invoice</span>
                    <span className="font-mono text-[12px] font-medium text-lp-text bg-white px-2 py-0.5 rounded border border-lp-border shadow-sm">
                      {webhookData.invoice_uuid?.substring(0, 8) || webhookData.uuid?.substring(0, 8)}...
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-lp-border/50 pb-2">
                    <span className="text-[12.5px] text-lp-text2 font-light">Nominal</span>
                    <span className="font-bold text-[15px] text-lp-text animate-[pulse_2s_ease-in-out_infinite]">
                      {formatRupiah(webhookData.nominal || webhookData.total_dibayar)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[12.5px] text-lp-text2 font-light">Metode</span>
                    <span className="font-semibold text-[13px] text-lp-text capitalize">
                      {webhookData.payment_method === 'qris' ? 'QRIS' : getBankName(webhookData.payment_method)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setWebhookAnimation('exit')
                    setTimeout(() => {
                      setShowWebhookSuccess(false)
                      // Navigasi tanpa refresh
                      navigate(`/mahasiswa/invoice/${webhookData.invoice_uuid || webhookData.uuid}`)
                    }, 300)
                  }}
                  className="w-full bg-lp-text text-lp-bg font-sans text-[13.5px] font-semibold py-3.5 px-6 rounded-full transition-all hover:bg-lp-atext hover:-translate-y-px shadow-sm"
                >
                  Lihat Detail Invoice
                </button>
                <button
                  onClick={() => {
                    setWebhookAnimation('exit')
                    setTimeout(() => {
                      setShowWebhookSuccess(false)
                      refetchSisaUKT()
                      refetchRiwayat()
                    }, 300)
                  }}
                  className="w-full bg-white border border-lp-border text-lp-text font-sans text-[13.5px] font-semibold py-3.5 px-6 rounded-full transition-all hover:bg-lp-surface"
                >
                  Tutup & Refresh Data
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Custom animation styles dalam style tag biasa */}
        <style>
          {`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes slideIn { from { transform: translateY(20px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
            @keyframes slideOut { from { transform: translateY(0) scale(1); opacity: 1; } to { transform: translateY(20px) scale(0.98); opacity: 0; } }
          `}
        </style>
      </div>
    )
  }

  // Confirm Modal Component
  const ConfirmModal = () => {
    if (!confirmData || !showConfirmModal) return null
    return (
      <div className="fixed inset-0 bg-lp-surface/60 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
        <div className="bg-white/90 backdrop-blur-xl rounded-[24px] max-w-md w-full shadow-[0_24px_48px_rgba(0,0,0,0.05)] border border-lp-border animate-[slideIn_0.3s_ease-out] relative overflow-hidden">
          {/* Header */}
          <div className="p-8 pb-6 border-b border-lp-border/50 relative z-10">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-lp-surface/80 rounded-2xl flex items-center justify-center border border-lp-border shadow-sm">
                <FaShieldAlt className="text-lp-text text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-lp-text tracking-tight mb-1">Konfirmasi Pembayaran</h2>
                <p className="text-[13.5px] text-lp-text2 font-light">Tinjau rincian sebelum melanjutkan</p>
              </div>
            </div>
          </div>
          
          {/* Body */}
          <div className="p-8 relative z-10">
            <div className="bg-lp-surface/50 border border-lp-border rounded-2xl p-6 mb-6">
              <h3 className="text-[14.5px] font-semibold text-lp-text tracking-tight mb-4 flex items-center">
                <FaCalculator className="mr-2 text-lp-text2" />
                Rincian Pembayaran
              </h3>
              <div className="space-y-4 text-[13.5px]">
                <div className="flex justify-between items-center border-b border-lp-border/50 pb-3">
                  <span className="text-lp-text2 font-light">Metode</span>
                  <span className="font-semibold text-lp-text capitalize">
                    {confirmData.paymentMethod === 'qris' ? 'QRIS' : getBankName(confirmData.paymentMethod)}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-lp-border/50 pb-3">
                  <span className="text-lp-text2 font-light">Nominal UKT</span>
                  <span className="font-semibold text-lp-text">{formatRupiah(confirmData.nominal)}</span>
                </div>
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[14px] font-bold text-lp-text">Total dibayar</span>
                    <span className="font-bold text-lg text-lp-text tracking-tight">
                      {formatRupiah(confirmData.nominal)} <span className="text-sm font-normal text-lp-text2">+ admin</span>
                    </span>
                  </div>
                  <div className="p-3 bg-lp-accent/5 rounded-xl border border-lp-accent/10 flex items-start gap-2">
                    <FaInfoCircle className="text-lp-accent mt-0.5 shrink-0" />
                    <p className="text-[12px] text-lp-text2 font-light leading-relaxed">
                      Biaya admin akan ditentukan oleh Pakasir. Total akhir akan ditampilkan di invoice.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-[12.5px] text-lp-text2 font-light flex items-center justify-center bg-lp-surface py-2 px-4 rounded-full border border-lp-border">
              <FaCheck className="text-lp-green mr-2" />
              Data akan diproses aman via Pakasir
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-6 pt-0 flex gap-3 relative z-10">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="flex-1 bg-white border border-lp-border text-lp-text font-sans text-[13.5px] font-semibold py-3.5 px-6 rounded-full transition-all hover:bg-lp-surface hover:-translate-y-px shadow-sm"
            >
              Batal
            </button>
            <button
              onClick={handleConfirmPayment}
              disabled={createPaymentMutation.isPending}
              className="flex-1 bg-lp-text text-lp-bg border-none py-3.5 px-6 rounded-full font-semibold hover:bg-lp-atext transition-all flex items-center justify-center gap-2 hover:-translate-y-px shadow-sm"
            >
              {createPaymentMutation.isPending ? (
                <>
                  <FaSpinner className="animate-spin text-sm" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <FaCheck className="text-sm" />
                  <span>Konfirmasi</span>
                </>
              )}
            </button>
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
      <div className="fixed inset-0 bg-lp-surface/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4 md:p-6 lg:p-8">
        <div className="bg-white/90 backdrop-blur-xl rounded-[24px] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-[0_24px_48px_rgba(0,0,0,0.05)] border border-lp-border animate-[slideIn_0.3s_ease-out]">
          {/* Header */}
          <div className="bg-lp-surface/50 p-6 md:p-8 border-b border-lp-border shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold tracking-tight text-lp-text">
                  Instruksi Pembayaran
                </h2>
                {isExpired && (
                  <span className="px-3 py-1 bg-red-500/10 text-red-600 text-[11px] font-bold tracking-wider uppercase rounded-full border border-red-500/20">
                    Expired
                  </span>
                )}
              </div>
              <p className="text-[13.5px] font-light text-lp-text2">
                Selesaikan sebelum {paymentDetails.expired_time ? formatDate(paymentDetails.expired_time) : 'batas waktu'}
              </p>
            </div>
            <button
              onClick={() => {
                setShowPaymentModal(false)
                setPaymentDetails(null)
                stopFastPolling()
              }}
              className="w-10 h-10 rounded-full border border-lp-border bg-white flex items-center justify-center text-lp-text2 hover:text-lp-text hover:bg-lp-surface transition-all shrink-0 self-end sm:self-auto"
            >
              <FaTimes />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8">
              {/* Left Column: QRIS / Bank Details */}
              <div>
                {paymentDetails.payment_method === 'qris' ? (
                  <div className="bg-lp-surface/30 border border-lp-border rounded-2xl p-8 flex flex-col items-center justify-center h-full min-h-[300px]">
                    <div className="flex items-center gap-2 mb-6">
                      <FaQrcode className="text-xl text-lp-text2" />
                      <h3 className="font-semibold text-lp-text tracking-tight">QRIS Pembayaran</h3>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-lp-border shadow-sm mb-4">
                      {paymentDetails.qrcode ? (
                        <QRCode value={paymentDetails.qrcode} size={220} level="H" />
                      ) : (
                        <div className="w-[220px] h-[220px] flex items-center justify-center bg-lp-surface rounded border border-lp-border border-dashed">
                          <p className="text-[12px] text-lp-text3 font-mono">QR Code tidak tersedia</p>
                        </div>
                      )}
                    </div>
                    <p className="text-[12.5px] text-lp-text2 font-light text-center max-w-[280px]">
                      Buka aplikasi e-wallet atau mobile banking Anda dan scan QRIS di atas.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-[11px] font-medium tracking-[0.16em] uppercase text-lp-text3 after:content-[''] after:flex-1 after:h-px after:bg-lp-border">
                      <FaBuilding className="text-lg" />
                      <span>Transfer Bank</span>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl border border-lp-border shadow-sm">
                      <p className="text-[12px] font-medium text-lp-text3 uppercase tracking-wider mb-2">Bank Tujuan</p>
                      <p className="font-semibold text-lp-text text-xl mb-6">{paymentDetails.bank_name || getBankName(paymentDetails.payment_method)}</p>
                      
                      <p className="text-[12px] font-medium text-lp-text3 uppercase tracking-wider mb-2">Nomor Virtual Account</p>
                      <div className="flex items-center justify-between mb-6">
                        <p className="font-mono font-bold text-lp-text text-2xl tracking-wider">
                          {paymentDetails.account_number || 'Sedang diproses...'}
                        </p>
                        {paymentDetails.account_number && (
                          <button
                            onClick={() => copyToClipboard(paymentDetails.account_number)}
                            className="p-2.5 rounded-xl border border-lp-border text-lp-text2 hover:text-lp-text hover:bg-lp-surface transition-all"
                            title="Salin"
                          >
                            <FaCopy />
                          </button>
                        )}
                      </div>
                      
                      <p className="text-[12px] font-medium text-lp-text3 uppercase tracking-wider mb-2">Penerima</p>
                      <p className="font-semibold text-lp-text text-[15px]">Student Hub</p>
                    </div>

                    <div className="bg-lp-surface/30 p-6 rounded-2xl border border-lp-border">
                      <h4 className="text-[14px] font-semibold text-lp-text mb-4">Instruksi Transfer:</h4>
                      <div className="space-y-3">
                        {[
                          "Buka aplikasi mobile banking/ATM",
                          `Pilih menu Transfer Virtual Account`,
                          `Masukkan nomor Virtual Account di atas`,
                          `Masukkan nominal persis sesuai tagihan`,
                          "Konfirmasi dan selesaikan transaksi"
                        ].map((step, idx) => (
                          <div key={idx} className="flex gap-3">
                            <div className="w-6 h-6 rounded-full border border-lp-border bg-white flex items-center justify-center font-mono text-[10px] text-lp-text shrink-0 mt-0.5 shadow-sm">
                              {idx + 1}
                            </div>
                            <p className="text-[13.5px] font-light text-lp-text2 leading-relaxed">
                              {step}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Order Summary */}
              <div className="flex flex-col">
                <div className="bg-white border border-lp-border p-6 md:p-8 rounded-2xl shadow-sm flex-1">
                  <h3 className="text-[16px] font-semibold text-lp-text mb-6 flex items-center tracking-tight">
                    <FaCalculator className="mr-3 text-lp-text2" />
                    Rincian Tagihan
                  </h3>
                  
                  <div className="space-y-4 text-[13.5px] mb-8">
                    <div className="flex justify-between border-b border-lp-border/50 pb-3">
                      <span className="text-lp-text2 font-light">ID Transaksi</span>
                      <span className="font-mono text-lp-text">{paymentDetails.uuid?.substring(0, 8)}</span>
                    </div>
                    <div className="flex justify-between border-b border-lp-border/50 pb-3">
                      <span className="text-lp-text2 font-light">Nominal UKT</span>
                      <span className="font-medium text-lp-text">{formatRupiah(paymentDetails.nominal)}</span>
                    </div>
                    <div className="flex justify-between border-b border-lp-border/50 pb-3">
                      <span className="text-lp-text2 font-light">Biaya Admin</span>
                      <span className="font-medium text-lp-text">{formatRupiah(paymentDetails.biaya_admin || 0)}</span>
                    </div>
                    
                    <div className="pt-4 mt-2">
                      <div className="flex justify-between items-center bg-lp-surface/50 p-4 rounded-xl border border-lp-border">
                        <span className="text-[14px] font-semibold text-lp-text">Total Bayar</span>
                        <span className="font-bold text-2xl text-lp-text tracking-tight">{formatRupiah(paymentDetails.total_dibayar)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-lp-accent/5 border border-lp-accent/10 rounded-xl p-4 flex gap-3 mb-8">
                    <FaInfoCircle className="text-lp-accent mt-0.5 shrink-0" />
                    <p className="text-[12.5px] font-light text-lp-text2 leading-relaxed">
                      Lakukan pembayaran sesuai nominal <strong className="font-semibold text-lp-text">Total Bayar</strong>. Sistem akan otomatis memverifikasi pembayaran Anda.
                    </p>
                  </div>

                  {paymentDetails.payment_url && (
                    <a
                      href={paymentDetails.payment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-white border border-lp-border text-lp-text font-sans text-[13.5px] font-semibold py-3.5 px-6 rounded-full transition-all hover:bg-lp-surface hover:-translate-y-px shadow-sm mb-4"
                    >
                      Buka di Halaman Pakasir <FaExternalLinkAlt className="w-3 h-3 ml-1" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-lp-surface/50 p-6 md:p-8 border-t border-lp-border shrink-0">
            {isExpired ? (
              <div className="text-center">
                <button
                  onClick={() => {
                    setShowPaymentModal(false)
                    setPaymentDetails(null)
                    stopFastPolling()
                    document.getElementById('payment-form')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="inline-flex items-center gap-2 bg-lp-text text-lp-bg font-sans text-[13.5px] font-semibold py-3.5 px-8 rounded-full transition-all hover:bg-lp-atext hover:-translate-y-px shadow-sm"
                >
                  Buat Tagihan Baru <FaArrowRight className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => {
                    setShowPaymentModal(false)
                    setPaymentDetails(null)
                    stopFastPolling()
                  }}
                  className="flex-1 bg-lp-text text-lp-bg border-none py-3.5 px-6 rounded-full font-semibold hover:bg-lp-atext transition-all hover:-translate-y-px shadow-sm"
                >
                  Tutup
                </button>
                {paymentDetails.status === 'pending' && (
                  <button
                    onClick={() => {
                      if (window.confirm('Apakah Anda yakin ingin membatalkan pembayaran ini?')) {
                        cancelPaymentMutation.mutate(paymentDetails.uuid)
                      }
                    }}
                    disabled={cancelPaymentMutation.isPending}
                    className="flex-1 bg-white border border-lp-border text-red-500 py-3.5 px-6 rounded-full font-semibold hover:bg-red-50 transition-all flex items-center justify-center gap-2 hover:-translate-y-px shadow-sm disabled:opacity-50"
                  >
                    {cancelPaymentMutation.isPending ? <FaSpinner className="animate-spin text-sm" /> : <FaBan className="text-sm" />}
                    <span>{cancelPaymentMutation.isPending ? 'Membatalkan...' : 'Batalkan Tagihan'}</span>
                  </button>
                )}
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
      <div className="flex min-h-screen bg-lp-bg font-sans font-light text-lp-text">
        {/* GLOBAL GRID BACKGROUND */}
        <div className="fixed inset-0 pointer-events-none z-[0] bg-lp-surface">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.08)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(255,255,255,0.85)_70%,#ffffff_100%)]" />
        </div>

        <Sidebar role={user?.role} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col relative z-10 h-screen overflow-hidden">
          <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-12">
            <div className="max-w-[1120px] mx-auto pb-24">
              
              {/* Header */}
              <div className="mb-10 animate-slideUp fill-mode-both">
                <h1 className="font-sans text-[clamp(2.5rem,4vw,3.5rem)] font-normal leading-[1.06] tracking-tight text-lp-text mb-2">
                  {user?.role === 'orangtua' ? 'Pembayaran UKT Anak' : 'Pembayaran UKT'}
                </h1>
                <p className="text-[15px] font-light text-lp-text2 max-w-2xl">
                  {user?.role === 'orangtua' 
                    ? 'Bayar UKT anak Anda dengan mudah, aman, dan pantau histori transaksi secara real-time.'
                    : 'Kelola dan selesaikan pembayaran Uang Kuliah Tunggal Anda dengan berbagai metode.'
                  }
                </p>
                {fastPollingActive && (
                  <div className="mt-4 inline-flex items-center text-lp-text bg-white border border-lp-border/50 py-1.5 px-3 rounded-full shadow-sm animate-pulse">
                    <FaSync className="animate-spin mr-2 text-lp-accent" />
                    <span className="text-[12.5px] font-medium tracking-wide">Menunggu konfirmasi pembayaran...</span>
                  </div>
                )}
              </div>

              {/* Messages */}
              {errorMessage && (
                <div className="bg-red-500/5 border border-red-500/20 text-red-600 px-5 py-4 rounded-2xl mb-8 flex items-center shadow-sm">
                  <FaExclamationTriangle className="text-xl mr-3" />
                  <p className="text-[13.5px] font-medium">{errorMessage}</p>
                </div>
              )}
              {successMessage && (
                <div className="bg-lp-green/5 border border-lp-green/20 text-lp-green px-5 py-4 rounded-2xl mb-8 flex items-center shadow-sm">
                  <FaCheckCircle className="text-xl mr-3" />
                  <p className="text-[13.5px] font-medium">{successMessage}</p>
                </div>
              )}

              {/* Info Sisa UKT */}
              <div className="mb-8 animate-slideUp delay-100 fill-mode-both">
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => {
                      refetchSisaUKT()
                      refetchRiwayat()
                    }}
                    className="flex items-center space-x-2 text-lp-text2 hover:text-lp-text transition-colors bg-white/50 backdrop-blur-md px-4 py-2 rounded-full border border-lp-border shadow-sm text-sm"
                    disabled={sisaLoading}
                  >
                    <FaSync className={`${sisaLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh Data</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-lp-border shadow-[0_12px_24px_rgba(0,0,0,0.02)]">
                    <p className="text-lp-text3 text-[11.5px] font-medium tracking-[0.16em] uppercase mb-1">Total UKT Semester</p>
                    <p className="text-[28px] font-normal text-lp-text tracking-tight">Rp 7.000.000</p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-lp-border shadow-[0_12px_24px_rgba(0,0,0,0.02)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-lp-text/5 rounded-full blur-2xl -mr-10 -mt-10" />
                    <p className="text-lp-text3 text-[11.5px] font-medium tracking-[0.16em] uppercase mb-1">Sisa Pembayaran</p>
                    <p className="text-[28px] font-normal text-lp-text tracking-tight">
                      {sisaLoading ? 'Loading...' : formatRupiah(sisaUKTData?.sisa_ukt || 0)}
                    </p>
                    <p className="text-[11.5px] text-lp-text2 font-light mt-3 flex items-center">
                      <FaCheckCircle className="text-lp-green mr-1.5" /> Auto-update via webhook
                    </p>
                  </div>
                  <div className="bg-lp-text text-white p-6 rounded-3xl shadow-[0_12px_24px_rgba(0,0,0,0.1)] flex flex-col justify-between">
                    <p className="text-white/70 text-[11.5px] font-medium tracking-[0.16em] uppercase mb-1">Progress</p>
                    <div className="flex items-end justify-between">
                      <p className="text-[40px] font-light leading-none tracking-tighter">
                        {sisaLoading ? '0%' : `${Math.round(((7000000 - (sisaUKTData?.sisa_ukt || 0)) / 7000000) * 100)}%`}
                      </p>
                      <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center bg-white/10">
                        <FaGraduationCap className="text-xl" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Create Payment Form */}
              <div id="payment-form" className="bg-white/90 backdrop-blur-xl rounded-[32px] shadow-[0_24px_60px_rgba(0,0,0,0.03)] border border-lp-border p-8 md:p-10 mb-10 animate-slideUp delay-200 fill-mode-both">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-lp-surface border border-lp-border rounded-2xl flex items-center justify-center shadow-sm">
                    <FaWallet className="text-lp-text2 text-xl" />
                  </div>
                  <div>
                    <h3 className="text-[22px] font-semibold text-lp-text tracking-tight">Buat Tagihan Baru</h3>
                    <p className="text-[13.5px] font-light text-lp-text2">Pilih metode dan masukkan nominal</p>
                  </div>
                </div>
                
                <form onSubmit={handleShowConfirm} className="space-y-8">
                  {/* Amount Input */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-[13px] font-medium text-lp-text2 tracking-wide uppercase">
                        Nominal Pembayaran
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (sisaUKTData?.sisa_ukt) {
                            setAmount(sisaUKTData.sisa_ukt)
                            setAmountFormatted(formatNumber(sisaUKTData.sisa_ukt.toString()))
                          }
                        }}
                        className="text-[12px] font-medium text-lp-text border border-lp-border px-3 py-1 rounded-full hover:bg-lp-surface transition-colors bg-white shadow-sm"
                      >
                        Lunasi Sekaligus
                      </button>
                    </div>
                    <div className="relative group">
                      <span className="absolute left-6 top-1/2 transform -translate-y-1/2 text-lp-text3 font-medium text-xl transition-colors group-focus-within:text-lp-text">
                        Rp
                      </span>
                      <input
                        type="text"
                        value={amountFormatted}
                        onChange={handleAmountChange}
                        className="w-full pl-16 pr-6 py-5 border border-lp-border rounded-[20px] focus:outline-none focus:ring-2 focus:ring-lp-text focus:border-transparent transition-all duration-300 bg-lp-surface/50 hover:bg-white focus:bg-white text-[24px] font-normal tracking-tight placeholder-lp-text3 shadow-sm"
                        placeholder="0"
                        required
                        disabled={createPaymentMutation.isPending}
                      />
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div>
                    <label className="block text-[13px] font-medium text-lp-text2 tracking-wide uppercase mb-3">
                      Pilih Metode
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { id: 'qris', icon: FaQrcode, label: 'QRIS', limit: 'Max Rp 250k' },
                        { id: 'bri_va', icon: FaBuilding, label: 'BRI VA', limit: 'Min Rp 50k' },
                        { id: 'bni_va', icon: FaBuilding, label: 'BNI VA', limit: 'Min Rp 50k' },
                        { id: 'mandiri_va', icon: FaBuilding, label: 'Mandiri VA', limit: 'Min Rp 50k' }
                      ].map((method) => {
                        const Icon = method.icon;
                        const isActive = paymentMethod === method.id;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setPaymentMethod(method.id)}
                            className={`
                              flex flex-col items-center justify-center p-5 rounded-[20px] border transition-all duration-300
                              ${isActive 
                                ? 'bg-lp-text text-white border-transparent shadow-[0_12px_24px_rgba(0,0,0,0.15)] scale-[1.02]' 
                                : 'bg-white border-lp-border text-lp-text hover:bg-lp-surface shadow-sm'
                              }
                            `}
                          >
                            <Icon className={`text-2xl mb-3 ${isActive ? 'text-white' : 'text-lp-text2'}`} />
                            <span className="text-[13.5px] font-medium mb-1">{method.label}</span>
                            <span className={`text-[10px] uppercase tracking-wider ${isActive ? 'text-white/70' : 'text-lp-text3'}`}>
                              {method.limit}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Payment Preview (Minimalist) */}
                  {amount >= 500 && (
                    <div className="bg-lp-surface/30 rounded-2xl p-6 border border-lp-border animate-[fadeIn_0.3s_ease-out]">
                      <div className="flex justify-between items-center text-[14px]">
                        <span className="text-lp-text2 font-light flex items-center"><FaCheckCircle className="text-lp-green mr-2" /> Nominal valid</span>
                        <span className="font-medium text-lp-text">{formatRupiah(amount)}</span>
                      </div>
                      <p className="text-[12px] text-lp-text3 mt-3 text-right">Biaya admin akan ditambahkan saat checkout.</p>
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
                    className="w-full bg-lp-text text-lp-bg border-none py-4 px-8 rounded-[20px] font-semibold text-[15px] transition-all duration-300 hover:bg-lp-atext disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_12px_24px_rgba(0,0,0,0.1)] hover:shadow-[0_16px_32px_rgba(0,0,0,0.15)] hover:-translate-y-px flex items-center justify-center gap-3"
                  >
                    {createPaymentMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-lp-bg"></div>
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <span>Buat Pembayaran</span>
                        <FaArrowRight className="text-sm" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Riwayat Pembayaran */}
              <div className="bg-white/80 backdrop-blur-xl rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.02)] border border-lp-border p-8 md:p-10 mb-8 animate-slideUp delay-300 fill-mode-both">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-lp-surface border border-lp-border rounded-2xl flex items-center justify-center shadow-sm">
                      <FaHistory className="text-lp-text2 text-xl" />
                    </div>
                    <div>
                      <h3 className="text-[22px] font-semibold text-lp-text tracking-tight">Riwayat Tagihan</h3>
                      <p className="text-[13.5px] font-light text-lp-text2">Daftar transaksi UKT Anda</p>
                    </div>
                  </div>
                  
                  {/* Status Filter */}
                  <div className="relative">
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="appearance-none bg-white border border-lp-border rounded-full py-2.5 pl-5 pr-10 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-lp-text/20 shadow-sm cursor-pointer hover:bg-lp-surface transition-colors"
                    >
                      <option value="all">Semua Status</option>
                      <option value="pending">Menunggu Pembayaran</option>
                      <option value="success">Sukses</option>
                      <option value="failed">Dibatalkan</option>
                      <option value="expired">Kadaluarsa</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-lp-text3">
                      <FaChevronDown className="h-3 w-3" />
                    </div>
                  </div>
                </div>

                {riwayatLoading ? (
                  <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lp-text mx-auto mb-4 opacity-50"></div>
                  </div>
                ) : riwayat && riwayat.length > 0 ? (
                  <div className="grid gap-4">
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
                          className="group bg-white border border-lp-border rounded-[24px] p-6 transition-all duration-300 hover:shadow-[0_12px_32px_rgba(0,0,0,0.04)] hover:border-black/10"
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                            <div>
                              <div className="flex items-center gap-3 mb-1.5">
                                <span className="font-semibold text-lp-text tracking-tight text-[15px]">
                                  INV-{transaksi.invoice_uuid?.substring(0, 8).toUpperCase() || 'N/A'}
                                </span>
                                <span className={`px-3 py-1 rounded-full border text-[11px] font-semibold tracking-wider uppercase shadow-sm ${getStatusColor(status)}`}>
                                  {status === 'failed' ? 'Dibatalkan' : status}
                                </span>
                              </div>
                              <p className="text-[13px] text-lp-text2 font-light">
                                {formatDate(transaksi.tanggal)}
                              </p>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="text-[11.5px] font-medium tracking-[0.16em] uppercase text-lp-text3 mb-1">Total</p>
                              <p className="text-[18px] font-bold tracking-tight text-lp-text">{formatRupiah(transaksi.total_dibayar || 0)}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 p-4 bg-lp-surface/50 rounded-[16px] border border-lp-border/50">
                            <div>
                              <span className="text-lp-text3 text-[10px] font-medium uppercase tracking-wider block mb-0.5">Nominal</span>
                              <span className="font-semibold text-lp-text text-[13.5px]">{formatRupiah(transaksi.nominal || 0)}</span>
                            </div>
                            <div>
                              <span className="text-lp-text3 text-[10px] font-medium uppercase tracking-wider block mb-0.5">Admin</span>
                              <span className="font-semibold text-lp-text text-[13.5px]">{formatRupiah(transaksi.biaya_admin || 0)}</span>
                            </div>
                            <div className="col-span-2 lg:col-span-2">
                              <span className="text-lp-text3 text-[10px] font-medium uppercase tracking-wider block mb-0.5">Metode</span>
                              <span className="font-semibold text-lp-text text-[13.5px] capitalize flex items-center gap-2">
                                {transaksi.payment_method === 'qris' ? <FaQrcode className="text-lp-text2" /> : <FaBuilding className="text-lp-text2" />}
                                {transaksi.payment_method === 'qris' ? 'QRIS' : getBankName(transaksi.payment_method)}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          {status === 'pending' && !isExpired && transaksi.expired_at && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                              <div className="flex items-center gap-2 text-[12.5px] text-lp-text2 bg-white border border-lp-border px-3 py-1.5 rounded-full shadow-sm">
                                <FaClock className="text-orange-400" />
                                <span>Sisa waktu: {calculateTimeLeft(transaksi.expired_at)}</span>
                              </div>
                              <div className="flex gap-2 w-full sm:w-auto">
                                <button
                                  onClick={() => handleCancelPayment(transaksi.invoice_uuid)}
                                  className="flex-1 sm:flex-none border border-lp-border text-lp-text hover:bg-lp-surface py-2 px-4 rounded-full text-[12.5px] font-semibold transition-colors"
                                >
                                  Batalkan
                                </button>
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
                                  className="flex-1 sm:flex-none bg-lp-text text-lp-bg py-2 px-6 rounded-full text-[12.5px] font-semibold hover:bg-lp-atext transition-colors shadow-sm hover:-translate-y-px"
                                >
                                  Bayar Sekarang
                                </button>
                              </div>
                            </div>
                          )}

                          {status === 'success' && (
                            <div className="inline-flex items-center gap-2 text-[12.5px] text-lp-green bg-lp-green/5 border border-lp-green/20 px-4 py-2 rounded-full">
                              <FaCheckCircle /> Transaksi selesai
                            </div>
                          )}
                          
                          {status === 'expired' && (
                            <div className="inline-flex items-center gap-2 text-[12.5px] text-red-500 bg-red-500/5 border border-red-500/20 px-4 py-2 rounded-full">
                              <FaExclamationTriangle /> Waktu habis
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 border-2 border-dashed border-lp-border rounded-[24px] bg-lp-surface/30">
                    <div className="w-16 h-16 bg-white border border-lp-border rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <FaHistory className="text-2xl text-lp-text3" />
                    </div>
                    <h3 className="text-[16px] font-semibold text-lp-text mb-2">Belum ada transaksi</h3>
                    <p className="text-[13.5px] text-lp-text2 font-light max-w-sm mx-auto">
                      Riwayat pembayaran Anda akan muncul di sini setelah Anda membuat tagihan.
                    </p>
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
