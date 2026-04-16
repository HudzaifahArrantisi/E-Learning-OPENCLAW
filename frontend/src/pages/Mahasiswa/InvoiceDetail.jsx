import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from "@tanstack/react-query";
import api from '../../services/api'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import QRCode from "react-qr-code";
import { 
  FaCheckCircle, FaClock, FaTimesCircle, FaCopy, 
  FaPrint, FaDownload, FaArrowLeft, FaQrcode,
  FaBuilding, FaInfoCircle, FaExclamationTriangle,
  FaSync, FaExternalLinkAlt, FaMoneyBillWave, FaBan,
  FaShieldAlt, FaCalculator
} from 'react-icons/fa'

const InvoiceDetail = () => {
  const { user } = useAuth()
  const { uuid } = useParams()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [pollingInterval, setPollingInterval] = useState(null)
  
  const { data: invoice, isLoading, error, refetch } = useQuery({
    queryKey: ['invoice', uuid],
    queryFn: () => api.getPaymentDetails(uuid).then(res => res.data.data),
    enabled: !!uuid,
  })

  // Polling untuk invoice pending
  useEffect(() => {
    if (invoice?.status === 'pending' && !invoice?.is_expired) {
      const interval = setInterval(() => {
        refetch()
      }, 30000) // Cek setiap 30 detik

      setPollingInterval(interval)
    } else if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }

    return () => {
      if (pollingInterval) clearInterval(pollingInterval)
    }
  }, [invoice, refetch])

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <FaCheckCircle className="text-lp-green text-xl" />
      case 'pending': return <FaClock className="text-yellow-500 text-xl" />
      case 'failed': return <FaBan className="text-lp-text3 font-light text-xl" />
      case 'expired': return <FaTimesCircle className="text-red-500 text-xl" />
      default: return <FaTimesCircle className="text-red-500 text-xl" />
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

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lp-text2 font-light">Loading invoice...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">❌</div>
        <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight mb-2">Error loading invoice</h3>
        <p className="text-lp-text2 font-light mb-4">Invoice tidak ditemukan atau terjadi kesalahan</p>
        <button
          onClick={() => navigate('/mahasiswa/pembayaran-ukt')}
          className="bg-lp-accent text-white px-4 py-2 rounded-lg hover:bg-lp-accent"
        >
          Kembali ke Pembayaran
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-lp-bg">
      <Sidebar role={user?.role} />
      <div className="flex-1">
        <Navbar user={user} />
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/mahasiswa/pembayaran-ukt')}
              className="flex items-center text-lp-atext hover:text-blue-800 mb-4"
            >
              <FaArrowLeft className="mr-2" />
              Kembali ke Pembayaran UKT
            </button>
            <h1 className="text-2xl font-bold text-lp-text font-semibold tracking-tight">Detail Invoice</h1>
            <p className="text-lp-text2 font-light">ID: {uuid}</p>
          </div>
          
          {invoice ? (
            <div className="max-w-4xl mx-auto">
              {/* Invoice Card */}
              <div className="bg-lp-surface rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border overflow-hidden">
                {/* Header */}
                <div className="bg-lp-bg p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold text-white">Invoice #{uuid.substring(0, 8).toUpperCase()}</h2>
                      <p className="text-blue-100">NFS Student Hub - Pembayaran UKT</p>
                    </div>
                    <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${getStatusColor(invoice.status)} text-lg font-medium`}>
                      {getStatusIcon(invoice.status)}
                      <span className="capitalize">{invoice.status === 'failed' ? 'Dibatalkan' : invoice.status}</span>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  {/* Invoice Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-lp-bg p-4 rounded-lg">
                      <h3 className="font-bold text-lp-text font-semibold tracking-tight mb-3">Informasi Invoice</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-lp-text2 font-light">Tanggal</span>
                          <span className="font-medium">{formatDate(invoice.tanggal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-lp-text2 font-light">Metode</span>
                          <span className="font-medium capitalize">{invoice.metode}</span>
                        </div>
                        {invoice.expired_at && (
                          <div className="flex justify-between">
                            <span className="text-lp-text2 font-light">Kadaluarsa</span>
                            <span className="font-medium">{formatDate(invoice.expired_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-lp-bg p-5 rounded-lg border border-blue-200">
                      <h3 className="font-bold text-lp-text font-semibold tracking-tight mb-4 flex items-center">
                        <FaCalculator className="mr-2 text-lp-atext" />
                        Rincian Pembayaran
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-lp-text2 font-light">Nominal UKT</span>
                          <span className="font-medium">{formatRupiah(invoice.nominal)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-lp-text2 font-light">Biaya Admin</span>
                          <span className="font-medium text-yellow-600">{formatRupiah(invoice.biaya_admin)}</span>
                        </div>
                        <div className="pt-3 border-t border-blue-200">
                          <div className="flex justify-between items-center">
                            <span className="text-lp-text font-semibold tracking-tight font-bold">Total Bayar</span>
                            <span className="text-lp-atext font-bold text-lg">{formatRupiah(invoice.total_dibayar)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QRIS Section */}
                  {invoice.payment_method === 'qris' && invoice.status === 'pending' && !invoice.is_expired && (
                    <div className="mb-8">
                      <div className="flex items-center mb-4">
                        <FaQrcode className="text-lp-green text-xl mr-2" />
                        <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight">QRIS Pembayaran</h3>
                      </div>
                      <div className="flex flex-col lg:flex-row items-center gap-8">
                        <div className="bg-lp-surface p-6 rounded-xl border-2 border-green-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border">
                          {invoice.qrcode ? (
                            <QRCode
                              value={invoice.qrcode}
                              size={220}
                              level="H"
                            />
                          ) : (
                            <div className="w-56 h-56 flex items-center justify-center bg-gray-100 rounded">
                              <p className="text-lp-text3 font-light">QR Code tidak tersedia</p>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                            <h4 className="font-bold text-green-800 mb-3">Instruksi Pembayaran:</h4>
                            <ol className="space-y-3">
                              {invoice.instructions?.map((instruction, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 flex-shrink-0">
                                    {index + 1}
                                  </span>
                                  <span className="text-green-700">{instruction}</span>
                                </li>
                              ))}
                            </ol>
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm text-blue-700 flex items-center">
                                <FaInfoCircle className="mr-2 flex-shrink-0" />
                                QRIS ini berasal dari Pakasir.com dan kompatibel dengan semua e-wallet dan mobile banking.
                              </p>
                            </div>
                            {invoice.payment_url && (
                              <div className="mt-4">
                                <a
                                  href={invoice.payment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-2 bg-lp-green text-white px-4 py-2 rounded-lg hover:bg-lp-green transition-colors"
                                >
                                  <FaExternalLinkAlt />
                                  <span>Buka Halaman Pembayaran Pakasir</span>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Transfer Section */}
                  {invoice.payment_method !== 'qris' && invoice.status === 'pending' && !invoice.is_expired && (
                    <div className="mb-8">
                      <div className="flex items-center mb-4">
                        <FaBuilding className="text-lp-atext text-xl mr-2" />
                        <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight">Transfer Bank</h3>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div className="bg-lp-surface p-4 rounded-lg border border-blue-100">
                            <p className="text-lp-text2 font-light text-sm">Bank</p>
                            <p className="font-bold text-lp-text font-semibold tracking-tight text-lg">{invoice.bank_name || getBankName(invoice.payment_method)}</p>
                          </div>
                          <div className="bg-lp-surface p-4 rounded-lg border border-blue-100">
                            <p className="text-lp-text2 font-light text-sm">Nomor Virtual Account</p>
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-lp-text font-semibold tracking-tight text-lg font-mono">
                                {invoice.account_number || 'Sedang diproses...'}
                              </p>
                              <button
                                onClick={() => copyToClipboard(invoice.account_number || '')}
                                className="text-lp-atext hover:text-blue-800 ml-2"
                              >
                                <FaCopy />
                              </button>
                            </div>
                          </div>
                          <div className="bg-lp-surface p-4 rounded-lg border border-blue-100">
                            <p className="text-lp-text2 font-light text-sm">Nama Penerima</p>
                            <p className="font-bold text-lp-text font-semibold tracking-tight text-lg">Student Hub</p>
                          </div>
                          <div className="bg-lp-surface p-4 rounded-lg border border-blue-100">
                            <p className="text-lp-text2 font-light text-sm">Total Transfer</p>
                            <p className="font-bold text-lp-atext text-lg">{formatRupiah(invoice.total_dibayar)}</p>
                          </div>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                          <h4 className="font-bold text-yellow-800 mb-2">Instruksi Transfer:</h4>
                          <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-700">
                            <li>Buka aplikasi mobile banking atau internet banking Anda</li>
                            <li>Pilih menu "Transfer" → "Transfer ke Virtual Account"</li>
                            <li>Masukkan nomor Virtual Account di atas</li>
                            <li>Bank penerima: {invoice.bank_name || getBankName(invoice.payment_method)}</li>
                            <li>Masukkan nominal: {formatRupiah(invoice.total_dibayar)}</li>
                            <li>Konfirmasi dan selesaikan transfer</li>
                            <li>Simpan bukti transfer untuk verifikasi</li>
                          </ol>
                        </div>
                        {invoice.payment_url && (
                          <div className="mt-4">
                            <a
                              href={invoice.payment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-2 bg-lp-accent text-white px-4 py-2 rounded-lg hover:bg-lp-accent transition-colors"
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
                  {invoice.is_expired && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <div className="flex items-center space-x-3 text-red-800">
                        <FaExclamationTriangle className="flex-shrink-0 text-xl" />
                        <div>
                          <h4 className="font-bold">Pembayaran Telah Kadaluarsa</h4>
                          <p className="mt-1">
                            Invoice ini telah kadaluarsa pada {formatDate(invoice.expired_at)}. 
                            Silakan buat pembayaran baru.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Success Message */}
                  {invoice.status === 'success' && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                      <div className="flex items-center space-x-3 text-green-800">
                        <FaCheckCircle className="flex-shrink-0 text-xl" />
                        <div>
                          <h4 className="font-bold">Pembayaran Berhasil!</h4>
                          <p className="mt-1">
                            Pembayaran telah berhasil dikonfirmasi. UKT telah diperbarui.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {invoice.status === 'failed' && (
                    <div className="mb-6 p-4 bg-lp-bg border border-lp-border border rounded-xl">
                      <div className="flex items-center space-x-3 text-lp-text font-semibold tracking-tight">
                        <FaBan className="flex-shrink-0 text-xl" />
                        <div>
                          <h4 className="font-bold">Pembayaran Dibatalkan</h4>
                          <p className="mt-1">
                            Pembayaran ini telah dibatalkan. Silakan buat pembayaran baru jika diperlukan.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Note */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <FaShieldAlt className="text-lp-atext text-xl flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-bold text-blue-800 mb-1">Keamanan Transaksi</h4>
                        <p className="text-sm text-blue-700">
                          Transaksi ini diproses melalui Pakasir.com dengan sistem keamanan terenkripsi. 
                          Pastikan Anda membayar sesuai dengan nominal yang tertera di atas.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Invoice UUID */}
                  <div className="bg-lp-bg p-4 rounded-lg mb-6">
                    <p className="text-lp-text2 font-light text-sm mb-2">ID Transaksi</p>
                    <div className="flex items-center justify-between">
                      <code className="font-mono text-lp-text font-semibold tracking-tight break-all">{uuid}</code>
                      <button
                        onClick={() => copyToClipboard(uuid)}
                        className="text-lp-atext hover:text-blue-800 ml-4 flex-shrink-0"
                        title="Copy to clipboard"
                      >
                        <FaCopy />
                      </button>
                    </div>
                    {copied && <span className="text-lp-green text-xs mt-1">Disalin!</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => window.print()}
                      className="flex items-center space-x-2 bg-lp-bg0 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                    >
                      <FaPrint />
                      <span>Print Invoice</span>
                    </button>
                    <button
                      onClick={() => navigate('/mahasiswa/pembayaran-ukt')}
                      className="flex items-center space-x-2 bg-lp-accent text-white px-4 py-2 rounded-lg hover:bg-lp-accent"
                    >
                      <FaArrowLeft />
                      <span>Kembali ke Pembayaran</span>
                    </button>
                    {invoice.status === 'pending' && !invoice.is_expired && (
                      <button
                        onClick={() => refetch()}
                        className="flex items-center space-x-2 bg-lp-green text-white px-4 py-2 rounded-lg hover:bg-lp-green"
                      >
                        <FaSync />
                        <span>Cek Status</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-bold text-lp-text font-semibold tracking-tight mb-2">Invoice tidak ditemukan</h3>
              <p className="text-lp-text2 font-light mb-4">Invoice dengan ID tersebut tidak ditemukan</p>
              <button
                onClick={() => navigate('/mahasiswa/pembayaran-ukt')}
                className="bg-lp-accent text-white px-4 py-2 rounded-lg hover:bg-lp-accent"
              >
                Kembali ke Pembayaran
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InvoiceDetail