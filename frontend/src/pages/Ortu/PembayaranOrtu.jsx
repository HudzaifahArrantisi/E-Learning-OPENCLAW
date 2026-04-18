import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from 'react-router-dom';
import api from '../../services/api'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import QRCode from "react-qr-code";
import { 
  FaMoneyBillWave, FaReceipt, FaCheckCircle, FaClock, 
  FaTimesCircle, FaQrcode, FaUserGraduate, FaExternalLinkAlt,
  FaSync, FaExclamationTriangle, FaInfoCircle, FaPercentage,
  FaHistory, FaUser, FaUniversity, FaWallet, FaBuilding,
  FaArrowLeft, FaCopy, FaPrint, FaBan, FaCalculator,
  FaShieldAlt, FaSpinner, FaCheck, FaFilter, FaFileInvoice
} from 'react-icons/fa'

const PembayaranOrtu = () => {
  const { user, logout } = useAuth()
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
  const [filter, setFilter] = useState('all')
  const [pollingInterval, setPollingInterval] = useState(null)
  const [confirmData, setConfirmData] = useState(null)

  // Format input dengan titik
  const formatNumber = (num) => {
    if (!num) return ''
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  }

  const parseNumber = (str) => {
    if (!str) return 0
    return parseInt(str.replace(/\./g, '')) || 0
  }

  // Handle amount input
  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    const numericValue = parseInt(value) || 0
    setAmount(numericValue)
    setAmountFormatted(formatNumber(value))
  }

  // Get profil anak
  const { 
    data: anakData, 
    isLoading: anakLoading, 
    error: anakError,
    refetch: refetchAnak 
  } = useQuery({
    queryKey: ['anakProfile'],
    queryFn: () => api.getAnakProfile().then(res => res.data.data),
    enabled: !!user && user.role === 'orangtua',
    retry: 2,
    onError: (error) => {
      console.error('Error fetching anak profile:', error)
      setErrorMessage('Gagal memuat data anak. Silakan refresh halaman.')
    }
  })

  // PERBAIKAN: Gunakan endpoint UKT umum (sudah handle orangtua)
  const { 
    data: sisaUKTData, 
    isLoading: sisaLoading, 
    refetch: refetchSisaUKT 
  } = useQuery({
    queryKey: ['sisaUKT', 'orangtua'], // Tambah key spesifik
    queryFn: () => api.getSisaUKT().then(res => res.data.data),
    enabled: !!user && user.role === 'orangtua',
    retry: 2,
    onError: (error) => {
      console.error('Error fetching sisa UKT:', error)
      setErrorMessage('Gagal memuat sisa UKT anak.')
    }
  })

  // PERBAIKAN: Gunakan endpoint UKT umum (sudah handle orangtua)
  const { 
    data: riwayat, 
    isLoading: riwayatLoading,
    refetch: refetchRiwayat 
  } = useQuery({
    queryKey: ['riwayatPembayaran', 'orangtua', filter],
    queryFn: () => api.getRiwayatPembayaran(filter).then(res => res.data.data),
    enabled: !!user && user.role === 'orangtua',
    retry: 2,
    onError: (error) => {
      console.error('Error fetching riwayat pembayaran:', error)
      setErrorMessage('Gagal memuat riwayat pembayaran.')
    }
  })

  // Calculate admin fee based on payment method
  const calculateAdminFee = (nominal) => {
    if (paymentMethod === 'qris') {
      return Math.round(nominal * 0.006) // 0.6% untuk QRIS
    } else {
      return Math.round(nominal * 0.005) // 0.5% untuk transfer
    }
  }

  // PERBAIKAN: Gunakan fungsi createPaymentForChild yang sudah benar
  const createPaymentMutation = useMutation({
    mutationFn: (data) => api.createPaymentForChild(data),
    onSuccess: (response) => {
      console.log('Payment created for child:', response.data)
      const paymentData = response.data.data
      
      setPaymentDetails(paymentData)
      setShowPaymentModal(true)
      setShowConfirmModal(false)
      
      setSuccessMessage(`Pembayaran untuk ${paymentData.student_name} berhasil dibuat!`)
      
      // Invalidate queries untuk refresh data
      queryClient.invalidateQueries({ queryKey: ['sisaUKT', 'orangtua'] })
      queryClient.invalidateQueries({ queryKey: ['riwayatPembayaran', 'orangtua'] })
      setAmount(0)
      setAmountFormatted('')
      setErrorMessage('')
      
      // Auto refresh data setelah 5 detik
      setTimeout(() => {
        refetchSisaUKT()
        refetchRiwayat()
      }, 5000)
    },
    onError: (error) => {
      console.error('Payment error:', error)
      let errorMsg = 'Gagal membuat pembayaran. Silakan coba lagi.'
      
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error
      } else if (error.message) {
        errorMsg = error.message
      }
      
      setErrorMessage(errorMsg)
      setShowConfirmModal(false)
      
      if (error.response?.status === 401) {
        logout()
        navigate('/')
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
    },
    onError: (error) => {
      console.error('Cancel payment error:', error)
      let errorMsg = 'Gagal membatalkan pembayaran'
      
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error
      }
      
      setErrorMessage(errorMsg)
      
      if (error.response?.status === 401) {
        logout()
        navigate('/')
      }
    }
  })

  // Setup polling untuk cek status pembayaran pending
  useEffect(() => {
    if (filter === 'pending' || filter === 'all') {
      const interval = setInterval(() => {
        refetchRiwayat()
        refetchSisaUKT()
      }, 30000)

      setPollingInterval(interval)
    }

    return () => {
      if (pollingInterval) clearInterval(pollingInterval)
    }
  }, [filter])

  const handleShowConfirm = (e) => {
    e.preventDefault()
    const nominal = amount
    
    if (!nominal || isNaN(nominal) || nominal < 10000) {
      setErrorMessage('Nominal minimal Rp 10.000')
      return
    }

    if (sisaUKTData && nominal > sisaUKTData.sisa_ukt) {
      setErrorMessage(`Nominal melebihi sisa UKT anak. Sisa: Rp ${formatNumber(sisaUKTData.sisa_ukt?.toString() || '0')}`)
      return
    }

    if (nominal > 10000000) {
      setErrorMessage('Nominal maksimal Rp 10.000.000')
      return
    }

    // Validasi khusus untuk QRIS (10.000 - 250.000)
    if (paymentMethod === 'qris') {
      if (nominal > 250000) {
        setErrorMessage('Untuk QRIS maksimal Rp 250.000')
        return
      }
      if (nominal < 10000) {
        setErrorMessage('Untuk QRIS minimal Rp 10.000')
        return
      }
    } else {
      // Validasi khusus untuk transfer (minimal 50.000)
      if (nominal < 50000) {
        setErrorMessage('Untuk transfer minimal Rp 50.000')
        return
      }
    }

    const biayaAdmin = calculateAdminFee(nominal)
    const totalDibayar = nominal + biayaAdmin
    
    setConfirmData({
      nominal,
      biayaAdmin,
      totalDibayar,
      paymentMethod,
      studentName: anakData?.nama || 'Anak'
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
      case 'success': return 'bg-green-100 text-green-800 border-green-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'failed': return 'bg-gray-100 text-lp-text font-semibold tracking-tight border-lp-border border'
      case 'expired': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-lp-text font-semibold tracking-tight border-lp-border border'
    }
  }

  const formatRupiah = (number) => {
    if (!number && number !== 0) return 'Rp 0'
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
      console.error('Error formatting date:', error)
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
      
      return `${hours} jam ${minutes} menit`
    } catch (error) {
      console.error('Error calculating time left:', error)
      return 'Waktu tidak valid'
    }
  }

  const getBankName = (paymentMethod) => {
    switch (paymentMethod) {
      case 'bri_va': return 'BRI Virtual Account'
      case 'bni_va': return 'BNI Virtual Account'
      case 'mandiri_va': return 'Mandiri Virtual Account'
      case 'bca_va': return 'BCA Virtual Account'
      default: return 'Transfer Bank'
    }
  }

  // Calculate preview
  const biayaAdminPreview = amount ? calculateAdminFee(amount) : 0
  const totalDibayarPreview = amount ? amount + biayaAdminPreview : 0

  if (anakLoading || sisaLoading) {
    return (
      <div className="flex h-screen bg-lp-bg">
        <Sidebar role={user?.role} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lp-text2 font-light">Memuat data anak...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-lp-bg">
      <Sidebar role={user?.role} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-lp-text font-semibold tracking-tight mb-2">
                Pembayaran UKT Anak
              </h1>
              <p className="text-lp-text2 font-light">
                Bayar UKT untuk anak Anda dengan mudah menggunakan Pakasir.com
              </p>
            </div>
            
            {/* Error Display */}
            {errorMessage && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center space-x-3 text-red-800">
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
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center space-x-3 text-green-800">
                  <FaCheckCircle className="flex-shrink-0" />
                  <div>
                    <span className="font-medium">Sukses:</span>
                    <span className="ml-2">{successMessage}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Info Anak Card */}
            <div className="bg-lp-surface rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border mb-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-lp-bg rounded-xl flex items-center justify-center">
                    <FaUserGraduate className="text-white text-lg" />
                  </div>
                  <h3 className="text-lg font-semibold text-lp-text font-semibold tracking-tight">Informasi Anak</h3>
                </div>
                <button
                  onClick={() => {
                    refetchAnak()
                    refetchSisaUKT()
                    refetchRiwayat()
                  }}
                  className="flex items-center space-x-2 text-lp-atext hover:text-blue-800 transition-colors"
                  disabled={anakLoading}
                >
                  <FaSync className={`${anakLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
              
              {anakData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-lp-bg rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center space-x-2 text-blue-700 mb-2">
                      <FaUser />
                      <span className="text-sm font-medium">Nama Mahasiswa</span>
                    </div>
                    <p className="text-lg font-bold text-lp-text font-semibold tracking-tight truncate">{anakData.nama}</p>
                  </div>
                  
                  <div className="bg-lp-bg rounded-xl p-4 border border-green-200">
                    <div className="flex items-center space-x-2 text-green-700 mb-2">
                      <FaUniversity />
                      <span className="text-sm font-medium">NIM</span>
                    </div>
                    <p className="text-lg font-bold text-lp-text font-semibold tracking-tight">{anakData.nim}</p>
                  </div>
                  
                  <div className="bg-lp-bg rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center space-x-2 text-purple-700 mb-2">
                      <FaWallet />
                      <span className="text-sm font-medium">Sisa UKT</span>
                    </div>
                    <p className="text-lg font-bold text-lp-text font-semibold tracking-tight">
                      {formatRupiah(sisaUKTData?.sisa_ukt || 0)}
                    </p>
                  </div>
                  
                  <div className="bg-lp-bg rounded-xl p-4 border border-yellow-200">
                    <div className="flex items-center space-x-2 text-yellow-700 mb-2">
                      <FaUniversity />
                      <span className="text-sm font-medium">Total UKT</span>
                    </div>
                    <p className="text-lg font-bold text-lp-text font-semibold tracking-tight">Rp 7.000.000</p>
                  </div>
                </div>
              ) : anakError ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">😟</div>
                  <h3 className="text-lg font-semibold text-lp-text font-semibold tracking-tight mb-2">Data anak tidak ditemukan</h3>
                  <p className="text-lp-text2 font-light">Hubungi administrator untuk melengkapi data anak</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">👨‍👦</div>
                  <h3 className="text-lg font-semibold text-lp-text font-semibold tracking-tight mb-2">Belum ada data anak</h3>
                  <p className="text-lp-text2 font-light">Data anak Anda belum terdaftar di sistem</p>
                </div>
              )}
            </div>

            {/* Create Payment Card */}
            <div id="payment-form" className="bg-lp-surface rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border p-6 mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-lp-bg rounded-xl flex items-center justify-center">
                  <FaWallet className="text-white text-lg" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight">
                    Bayar UKT untuk {anakData?.nama?.split(' ')[0] || 'Anak'}
                  </h3>
                  <p className="text-lp-text2 font-light text-sm">
                    Pembayaran menggunakan Pakasir.com (QRIS & Transfer Bank)
                  </p>
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
                        w-full pl-12 pr-4 py-3 border border-lp-border border rounded-xl
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        transition-all duration-300
                        bg-lp-bg focus:bg-lp-surface text-lg font-medium
                      "
                      placeholder="Contoh: 50.000"
                      required
                      disabled={createPaymentMutation.isPending || !anakData}
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
                      className="text-sm text-lp-atext hover:text-blue-800 font-medium"
                      disabled={!anakData}
                    >
                      Bayar Semua
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-lp-text2 mb-2">
                    Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('qris')}
                      className={`
                        p-4 rounded-xl border-2 flex flex-col items-center justify-center space-y-2
                        ${paymentMethod === 'qris' 
                          ? 'border-green-500 bg-green-50 text-green-700' 
                          : 'border-lp-border border bg-lp-surface text-lp-text2 hover:border-green-300'
                        }
                      `}
                      disabled={!anakData}
                    >
                      <FaQrcode className="text-2xl" />
                      <span className="text-sm font-medium">QRIS</span>
                      <span className="text-xs text-lp-text3 font-light">Rp 10k - 250k</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bri_va')}
                      className={`
                        p-4 rounded-xl border-2 flex flex-col items-center justify-center space-y-2
                        ${paymentMethod === 'bri_va' 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-lp-border border bg-lp-surface text-lp-text2 hover:border-blue-300'
                        }
                      `}
                      disabled={!anakData}
                    >
                      <FaBuilding className="text-2xl" />
                      <span className="text-sm font-medium">BRI VA</span>
                      <span className="text-xs text-lp-text3 font-light">Min. Rp 50k</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bni_va')}
                      className={`
                        p-4 rounded-xl border-2 flex flex-col items-center justify-center space-y-2
                        ${paymentMethod === 'bni_va' 
                          ? 'border-yellow-500 bg-yellow-50 text-yellow-700' 
                          : 'border-lp-border border bg-lp-surface text-lp-text2 hover:border-yellow-300'
                        }
                      `}
                      disabled={!anakData}
                    >
                      <FaBuilding className="text-2xl" />
                      <span className="text-sm font-medium">BNI VA</span>
                      <span className="text-xs text-lp-text3 font-light">Min. Rp 50k</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('mandiri_va')}
                      className={`
                        p-4 rounded-xl border-2 flex flex-col items-center justify-center space-y-2
                        ${paymentMethod === 'mandiri_va' 
                          ? 'border-red-500 bg-red-50 text-red-700' 
                          : 'border-lp-border border bg-lp-surface text-lp-text2 hover:border-red-300'
                        }
                      `}
                      disabled={!anakData}
                    >
                      <FaBuilding className="text-2xl" />
                      <span className="text-sm font-medium">Mandiri VA</span>
                      <span className="text-xs text-lp-text3 font-light">Min. Rp 50k</span>
                    </button>
                  </div>
                </div>

                {amount >= 10000 && (
                  <div className="bg-lp-bg rounded-xl p-5 border border-blue-200">
                    <h4 className="font-semibold text-lp-text font-semibold tracking-tight mb-4 flex items-center">
                      <FaCalculator className="mr-2 text-lp-atext" />
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
                      <div className="flex justify-between items-center">
                        <span className="text-lp-text2 font-light">Biaya Admin ({paymentMethod === 'qris' ? '0.6%' : '0.5%'})</span>
                        <span className="font-semibold text-yellow-600">{formatRupiah(biayaAdminPreview)}</span>
                      </div>
                      <div className="pt-3 border-t border-blue-200">
                        <div className="flex justify-between items-center text-lg">
                          <span className="font-bold text-lp-text font-semibold tracking-tight">Total Bayar:</span>
                          <span className="font-bold text-lp-atext">
                            {formatRupiah(totalDibayarPreview)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700 flex items-center">
                        <FaInfoCircle className="mr-2" />
                        Anda akan membayar Rp {formatNumber(totalDibayarPreview.toString())} untuk {anakData?.nama?.split(' ')[0] || 'anak Anda'}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    createPaymentMutation.isPending || 
                    !amount || 
                    amount < 10000 || 
                    !anakData ||
                    (sisaUKTData && amount > sisaUKTData.sisa_ukt) ||
                    (paymentMethod === 'qris' && amount > 250000) ||
                    (paymentMethod !== 'qris' && amount < 50000)
                  }
                  className="
                    w-full bg-lp-accent text-white border-none
                    py-4 px-6 rounded-xl font-semibold text-lg
                    hover:from-green-600 hover:to-green-700 transform hover:scale-[1.02]
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
                      <FaMoneyBillWave className="text-xl" />
                      <span>Bayar untuk {anakData?.nama?.split(' ')[0] || 'Anak'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
            
            {/* Riwayat Pembayaran Anak */}
            <div className="bg-lp-surface rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div className="flex items-center space-x-3 mb-4 md:mb-0">
                  <div className="w-10 h-10 bg-lp-bg rounded-xl flex items-center justify-center">
                    <FaHistory className="text-white text-lg" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight">
                      Riwayat Pembayaran {anakData?.nama?.split(' ')[0] || 'Anak'}
                    </h3>
                    <p className="text-lp-text2 font-light text-sm">Histori pembayaran UKT anak Anda</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setFilter('all')}
                      className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                        filter === 'all' 
                          ? 'bg-lp-accent text-white' 
                          : 'bg-gray-200 text-lp-text font-semibold tracking-tight hover:bg-gray-300'
                      }`}
                    >
                      <FaFilter />
                      <span>Semua</span>
                    </button>
                    <button
                      onClick={() => setFilter('pending')}
                      className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                        filter === 'pending' 
                          ? 'bg-yellow-500 text-white' 
                          : 'bg-gray-200 text-lp-text font-semibold tracking-tight hover:bg-gray-300'
                      }`}
                    >
                      <FaClock />
                      <span>Pending</span>
                    </button>
                    <button
                      onClick={() => setFilter('success')}
                      className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                        filter === 'success' 
                          ? 'bg-lp-green text-white' 
                          : 'bg-gray-200 text-lp-text font-semibold tracking-tight hover:bg-gray-300'
                      }`}
                    >
                      <FaCheckCircle />
                      <span>Sukses</span>
                    </button>
                    <button
                      onClick={() => setFilter('failed')}
                      className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                        filter === 'failed' 
                          ? 'bg-lp-bg0 text-white' 
                          : 'bg-gray-200 text-lp-text font-semibold tracking-tight hover:bg-gray-300'
                      }`}
                    >
                      <FaBan />
                      <span>Dibatalkan</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {riwayatLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-4"></div>
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
                      } catch (error) {
                        console.error('Error checking expired:', error)
                      }
                    }
                    
                    const status = isExpired ? 'expired' : transaksi.status
                    
                    return (
                      <div 
                        key={transaksi.id}
                        className={`border rounded-xl p-5 transition-all duration-300 ${
                          status === 'success' 
                            ? 'border-green-200 bg-green-50' 
                            : status === 'pending' && !isExpired
                            ? 'border-yellow-200 bg-yellow-50'
                            : status === 'failed'
                            ? 'border-lp-border border bg-lp-bg'
                            : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-bold text-lp-text font-semibold tracking-tight">
                                Invoice #{transaksi.invoice_uuid?.substring(0, 8).toUpperCase() || 'N/A'}
                              </span>
                              <span className="text-xs text-lp-text3 font-light bg-gray-100 px-2 py-1 rounded-full">
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
                          <div className="bg-lp-surface p-3 rounded-lg border border-lp-border border">
                            <span className="text-lp-atext text-xs font-medium">NOMINAL UKT</span>
                            <p className="font-bold text-lp-text font-semibold tracking-tight">{formatRupiah(transaksi.nominal || 0)}</p>
                          </div>
                          <div className="bg-lp-surface p-3 rounded-lg border border-lp-border border">
                            <span className="text-yellow-600 text-xs font-medium">BIAYA ADMIN</span>
                            <p className="font-bold text-lp-text font-semibold tracking-tight">{formatRupiah(transaksi.biaya_admin || 0)}</p>
                          </div>
                          <div className="bg-lp-surface p-3 rounded-lg border border-lp-border border">
                            <span className="text-lp-green text-xs font-medium">TOTAL BAYAR</span>
                            <p className="font-bold text-lp-text font-semibold tracking-tight">{formatRupiah(transaksi.total_dibayar || 0)}</p>
                          </div>
                          <div className="bg-lp-surface p-3 rounded-lg border border-lp-border border">
                            <span className="text-purple-600 text-xs font-medium">METODE</span>
                            <div className="flex items-center space-x-2">
                              {transaksi.payment_method === 'qris' ? 
                                <FaQrcode className="text-lp-green" /> : 
                                <FaBuilding className="text-lp-atext" />
                              }
                              <span className="font-bold text-lp-text font-semibold tracking-tight capitalize">
                                {transaksi.payment_method === 'qris' ? 'QRIS' : getBankName(transaksi.payment_method)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {status === 'pending' && !isExpired && transaksi.expired_at && (
                          <div className="mt-4 pt-4 border-t border-lp-border border">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 text-yellow-600">
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
                                      })
                                      .catch(err => {
                                        console.error('Gagal mengambil detail pembayaran:', err)
                                        setErrorMessage('Gagal memuat detail pembayaran')
                                      })
                                  }}
                                  className="bg-lp-accent text-white py-2 px-4 rounded-lg hover:bg-lp-accent transition-colors flex items-center space-x-2"
                                >
                                  <FaInfoCircle />
                                  <span>Detail</span>
                                </button>
                                <button
                                  onClick={() => handleCancelPayment(transaksi.invoice_uuid)}
                                  className="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2"
                                >
                                  <FaBan />
                                  <span>Batalkan</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {isExpired && (
                          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center space-x-2 text-red-600">
                              <FaExclamationTriangle />
                              <span className="text-sm">
                                Pembayaran telah kadaluarsa pada {formatDate(transaksi.expired_at)}
                              </span>
                            </div>
                          </div>
                        )}

                        {status === 'success' && (
                          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center space-x-2 text-lp-green">
                              <FaCheckCircle />
                              <span className="text-sm">
                                Pembayaran berhasil mengurangi sisa UKT anak Anda
                              </span>
                            </div>
                          </div>
                        )}

                        {status === 'failed' && (
                          <div className="mt-4 p-3 bg-lp-bg border border-lp-border border rounded-lg">
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
                      ? `Lakukan pembayaran pertama untuk ${anakData?.nama?.split(' ')[0] || 'anak Anda'}.`
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
                      className="inline-flex items-center space-x-2 bg-lp-accent text-white px-4 py-2 rounded-lg hover:bg-lp-accent transition-colors"
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
  )
}

export default PembayaranOrtu
