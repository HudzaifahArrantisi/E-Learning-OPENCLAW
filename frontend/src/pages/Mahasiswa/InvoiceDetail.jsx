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
      case 'success': return 'bg-lp-surface text-lp-text border-lp-border'
      case 'pending': return 'bg-lp-surface text-lp-text border-lp-border'
      case 'failed': return 'bg-lp-surface text-lp-text border-lp-border'
      case 'expired': return 'bg-lp-surface text-lp-text border-lp-border'
      default: return 'bg-lp-surface text-lp-text border-lp-border'
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lp-text mx-auto mb-4"></div>
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
          className="bg-lp-text text-white px-4 py-2 rounded-lg hover:bg-lp-atext"
        >
          Kembali ke Pembayaran
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-lp-bg font-sans font-light text-lp-text">
      {/* GLOBAL GRID BACKGROUND like Landing Page */}
      <div className="fixed inset-0 pointer-events-none z-[0] bg-lp-surface">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.08)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(255,255,255,0.85)_70%,#ffffff_100%)]" />
      </div>

      <Sidebar role={user?.role} />
      <div className="flex-1 flex flex-col relative z-10 h-screen overflow-hidden">
        <Navbar user={user} />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-12">
          
          <div className="max-w-[1120px] mx-auto pb-24">
            {/* Header */}
            <div className="mb-10 animate-slideUp fill-mode-both">
              <button
                onClick={() => navigate('/mahasiswa/pembayaran-ukt')}
                className="inline-flex items-center gap-2 border border-black/10 rounded-full py-1.5 pl-2.5 pr-4 text-[11.5px] text-lp-text2 tracking-wide mb-6 hover:bg-black/5 transition-colors bg-white/50 backdrop-blur-sm"
              >
                <FaArrowLeft className="w-3 h-3" />
                <span>Kembali ke Pembayaran UKT</span>
              </button>
              <h1 className="font-sans text-[clamp(2.5rem,4vw,3.5rem)] font-normal leading-[1.06] tracking-tight text-lp-text mb-2">
                Detail Invoice
              </h1>
              <p className="text-[15px] font-light text-lp-text2">
                ID Transaksi: <span className="font-mono bg-black/5 px-2 py-0.5 rounded-md">{uuid}</span>
              </p>
            </div>
            
            {invoice ? (
              <div className="animate-slideUp delay-200 fill-mode-both">
                {/* Main Card */}
                <div className="bg-white/80 backdrop-blur-xl border border-lp-border rounded-[24px] overflow-hidden shadow-[0_24px_48px_rgba(0,0,0,0.04)]">
                  {/* Header */}
                  <div className="bg-lp-surface/50 p-8 border-b border-lp-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-lp-text mb-1">
                        Invoice #{uuid.substring(0, 8).toUpperCase()}
                      </h2>
                      <p className="text-[13.5px] font-light text-lp-text2">NFS Student Hub - Pembayaran UKT</p>
                    </div>
                    <div className={`flex items-center space-x-2 px-5 py-2 rounded-full border ${getStatusColor(invoice.status)} text-[13px] font-medium tracking-wide shadow-sm`}>
                      {getStatusIcon(invoice.status)}
                      <span className="capitalize">{invoice.status === 'failed' ? 'Dibatalkan' : invoice.status}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-8">
                    {/* Invoice Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8 mb-10">
                      <div className="border border-lp-border bg-lp-surface/30 p-6 rounded-2xl">
                        <h3 className="text-[15px] font-semibold text-lp-text mb-5 tracking-tight flex items-center">
                          <FaInfoCircle className="mr-2 text-lp-text2" />
                          Informasi Invoice
                        </h3>
                        <div className="space-y-4 text-[13.5px]">
                          <div className="flex justify-between border-b border-lp-border/50 pb-3">
                            <span className="text-lp-text2 font-light">Tanggal</span>
                            <span className="font-medium text-lp-text">{formatDate(invoice.tanggal)}</span>
                          </div>
                          <div className="flex justify-between border-b border-lp-border/50 pb-3">
                            <span className="text-lp-text2 font-light">Metode</span>
                            <span className="font-medium text-lp-text capitalize">{invoice.payment_method === 'qris' ? 'QRIS' : getBankName(invoice.payment_method)}</span>
                          </div>
                          {invoice.expired_at && (
                            <div className="flex justify-between border-b border-lp-border/50 pb-3">
                              <span className="text-lp-text2 font-light">Batas Waktu</span>
                              <span className="font-medium text-lp-text">{formatDate(invoice.expired_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="border border-lp-border bg-white p-6 rounded-2xl shadow-sm">
                        <h3 className="text-[15px] font-semibold text-lp-text mb-5 tracking-tight flex items-center">
                          <FaCalculator className="mr-2 text-lp-text2" />
                          Rincian Pembayaran
                        </h3>
                        <div className="space-y-4 text-[13.5px]">
                          <div className="flex justify-between border-b border-lp-border/50 pb-3">
                            <span className="text-lp-text2 font-light">Nominal UKT</span>
                            <span className="font-medium text-lp-text">{formatRupiah(invoice.nominal)}</span>
                          </div>
                          <div className="flex justify-between border-b border-lp-border/50 pb-3">
                            <span className="text-lp-text2 font-light">Biaya Admin</span>
                            <span className="font-medium text-lp-text">{formatRupiah(invoice.biaya_admin)}</span>
                          </div>
                          <div className="pt-2">
                            <div className="flex justify-between items-center bg-lp-surface/50 p-4 rounded-xl border border-lp-border">
                              <span className="text-[14px] font-semibold text-lp-text">Total Bayar</span>
                              <span className="font-bold text-2xl text-lp-text tracking-tight">{formatRupiah(invoice.total_dibayar)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* QRIS Section */}
                    {invoice.payment_method === 'qris' && invoice.status === 'pending' && !invoice.is_expired && (
                      <div className="mb-10">
                        <div className="flex items-center gap-4 text-[10.5px] font-medium tracking-[0.16em] uppercase text-lp-text3 mb-6 after:content-[''] after:flex-1 after:h-px after:bg-lp-border">
                          <FaQrcode className="text-lg" />
                          <span>QRIS Pembayaran</span>
                        </div>
                        <div className="flex flex-col md:flex-row items-center gap-10">
                          <div className="bg-white p-6 rounded-2xl border border-lp-border shadow-sm">
                            {invoice.qrcode ? (
                              <div className="p-2 bg-white rounded-xl">
                                <QRCode value={invoice.qrcode} size={220} level="H" />
                              </div>
                            ) : (
                              <div className="w-[240px] h-[240px] flex items-center justify-center bg-lp-surface rounded-xl border border-lp-border border-dashed">
                                <p className="text-[12px] text-lp-text3 font-mono">QR Code tidak tersedia</p>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 w-full">
                            <div className="bg-lp-surface/30 border border-lp-border rounded-2xl p-6">
                              <h4 className="text-[15px] font-semibold text-lp-text mb-4">Instruksi Pembayaran:</h4>
                              <div className="space-y-4">
                                {invoice.instructions?.map((instruction, index) => (
                                  <div key={index} className="flex gap-4">
                                    <div className="w-7 h-7 rounded-full border border-lp-border bg-white flex items-center justify-center font-mono text-[11px] text-lp-text shrink-0 shadow-sm">
                                      {index + 1}
                                    </div>
                                    <p className="text-[13.5px] font-light text-lp-text2 leading-relaxed pt-1">
                                      {instruction}
                                    </p>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-6 p-4 bg-lp-accent/5 rounded-xl border border-lp-accent/10 flex gap-3">
                                <FaInfoCircle className="text-lp-accent mt-0.5 shrink-0" />
                                <p className="text-[12.5px] font-light text-lp-text2 leading-relaxed">
                                  QRIS ini berasal dari Pakasir.com dan kompatibel dengan semua e-wallet dan mobile banking. Status akan terupdate otomatis.
                                </p>
                              </div>
                              {invoice.payment_url && (
                                <div className="mt-6">
                                  <a
                                    href={invoice.payment_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 bg-lp-text text-lp-bg font-sans text-[13px] font-semibold py-3 px-6 rounded-full transition-all hover:bg-lp-atext hover:-translate-y-px"
                                  >
                                    Buka Halaman Pakasir <FaExternalLinkAlt className="w-3 h-3 ml-1" />
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
                      <div className="mb-10">
                        <div className="flex items-center gap-4 text-[10.5px] font-medium tracking-[0.16em] uppercase text-lp-text3 mb-6 after:content-[''] after:flex-1 after:h-px after:bg-lp-border">
                          <FaBuilding className="text-lg" />
                          <span>Transfer Virtual Account</span>
                        </div>
                        <div className="bg-lp-surface/30 border border-lp-border rounded-2xl p-8">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <div className="bg-white p-5 rounded-xl border border-lp-border shadow-sm">
                              <p className="text-[11.5px] font-medium text-lp-text3 uppercase tracking-wider mb-2">Bank</p>
                              <p className="font-semibold text-lp-text text-[15px]">{invoice.bank_name || getBankName(invoice.payment_method)}</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-lp-border shadow-sm col-span-1 sm:col-span-2 lg:col-span-1">
                              <p className="text-[11.5px] font-medium text-lp-text3 uppercase tracking-wider mb-2">Nomor Virtual Account</p>
                              <div className="flex items-center justify-between">
                                <p className="font-mono font-bold text-lp-text text-[16px] tracking-wider">
                                  {invoice.account_number || 'Memproses...'}
                                </p>
                                <button
                                  onClick={() => copyToClipboard(invoice.account_number || '')}
                                  className="text-lp-text2 hover:text-lp-text transition-colors p-1"
                                >
                                  <FaCopy />
                                </button>
                              </div>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-lp-border shadow-sm">
                              <p className="text-[11.5px] font-medium text-lp-text3 uppercase tracking-wider mb-2">Penerima</p>
                              <p className="font-semibold text-lp-text text-[15px]">Student Hub</p>
                            </div>
                          </div>
                          
                          <div className="bg-white border border-lp-border rounded-xl p-6 shadow-sm">
                            <h4 className="text-[14.5px] font-semibold text-lp-text mb-4">Instruksi Transfer:</h4>
                            <div className="space-y-4">
                              {[
                                "Buka aplikasi mobile banking atau internet banking Anda",
                                `Pilih menu "Transfer" → "Transfer ke Virtual Account"`,
                                `Masukkan nomor Virtual Account: ${invoice.account_number || '-'}`,
                                `Pastikan penerima adalah Student Hub / Pakasir`,
                                `Masukkan nominal pasti: ${formatRupiah(invoice.total_dibayar)}`,
                                "Konfirmasi dan selesaikan transfer"
                              ].map((step, idx) => (
                                <div key={idx} className="flex gap-4">
                                  <div className="w-6 h-6 rounded-full border border-lp-border bg-lp-surface flex items-center justify-center font-mono text-[10px] text-lp-text shrink-0 mt-0.5">
                                    {idx + 1}
                                  </div>
                                  <p className="text-[13.5px] font-light text-lp-text2 leading-relaxed">
                                    {step}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {invoice.payment_url && (
                            <div className="mt-6 text-center sm:text-left">
                              <a
                                href={invoice.payment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-lp-text text-lp-bg font-sans text-[13px] font-semibold py-3 px-6 rounded-full transition-all hover:bg-lp-atext hover:-translate-y-px shadow-sm"
                              >
                                Buka Halaman Pakasir <FaExternalLinkAlt className="w-3 h-3 ml-1" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Messages (Expired, Success, Failed) */}
                    {invoice.is_expired && (
                      <div className="mb-8 p-5 bg-red-500/5 border border-red-500/20 rounded-2xl flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                          <FaExclamationTriangle className="text-red-500" />
                        </div>
                        <div>
                          <h4 className="text-[15px] font-semibold text-red-600 mb-1">Pembayaran Kadaluarsa</h4>
                          <p className="text-[13.5px] text-red-600/80 font-light leading-relaxed">
                            Invoice ini telah melewati batas waktu ({formatDate(invoice.expired_at)}). Silakan buat tagihan baru.
                          </p>
                        </div>
                      </div>
                    )}

                    {invoice.status === 'success' && (
                      <div className="mb-8 p-5 bg-lp-green/5 border border-lp-green/20 rounded-2xl flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-lp-green/10 flex items-center justify-center shrink-0">
                          <FaCheckCircle className="text-lp-green" />
                        </div>
                        <div>
                          <h4 className="text-[15px] font-semibold text-lp-green mb-1">Pembayaran Berhasil</h4>
                          <p className="text-[13.5px] text-lp-green/80 font-light leading-relaxed">
                            Terima kasih. Pembayaran telah dikonfirmasi dan sisa UKT Anda telah diperbarui secara otomatis.
                          </p>
                        </div>
                      </div>
                    )}

                    {invoice.status === 'failed' && (
                      <div className="mb-8 p-5 bg-lp-border/20 border border-lp-border rounded-2xl flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-white border border-lp-border flex items-center justify-center shrink-0">
                          <FaBan className="text-lp-text3" />
                        </div>
                        <div>
                          <h4 className="text-[15px] font-semibold text-lp-text mb-1">Pembayaran Dibatalkan</h4>
                          <p className="text-[13.5px] text-lp-text2 font-light leading-relaxed">
                            Tagihan ini telah dibatalkan. Anda dapat membuat tagihan baru melalui menu pembayaran.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="border-t border-lp-border pt-8 mt-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
                      <div className="flex items-center gap-2 text-[12px] text-lp-text3 font-light bg-lp-surface py-2 px-4 rounded-full border border-lp-border">
                        <FaShieldAlt /> Terenkripsi & diproses aman via Pakasir
                      </div>
                      <div className="flex gap-3 w-full sm:w-auto">
                        <button
                          onClick={() => window.print()}
                          className="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 bg-white border border-lp-border text-lp-text font-sans text-[13px] font-semibold py-2.5 px-6 rounded-full transition-all hover:bg-lp-surface hover:-translate-y-px shadow-sm"
                        >
                          <FaPrint className="w-3.5 h-3.5" /> Print
                        </button>
                        {invoice.status === 'pending' && !invoice.is_expired && (
                          <button
                            onClick={() => refetch()}
                            className="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 bg-white border border-lp-border text-lp-text font-sans text-[13px] font-semibold py-2.5 px-6 rounded-full transition-all hover:bg-lp-surface hover:-translate-y-px shadow-sm"
                          >
                            <FaSync className="w-3.5 h-3.5" /> Refresh Status
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-slideUp delay-200 fill-mode-both">
                <div className="bg-white/80 backdrop-blur-xl border border-lp-border rounded-[24px] overflow-hidden shadow-sm p-16 text-center">
                  <div className="w-20 h-20 bg-lp-surface rounded-2xl flex items-center justify-center mx-auto mb-6 border border-lp-border shadow-inner">
                    <FaTimesCircle className="text-3xl text-lp-text3" />
                  </div>
                  <h3 className="text-xl font-bold text-lp-text mb-3">Invoice Tidak Ditemukan</h3>
                  <p className="text-[14.5px] font-light text-lp-text2 mb-8 max-w-md mx-auto">
                    Data invoice dengan ID tersebut tidak tersedia di sistem atau telah dihapus.
                  </p>
                  <button
                    onClick={() => navigate('/mahasiswa/pembayaran-ukt')}
                    className="inline-flex items-center gap-2 bg-lp-text text-lp-bg font-sans text-[13px] font-semibold py-3 px-8 rounded-full transition-all hover:bg-lp-atext hover:-translate-y-px shadow-md"
                  >
                    Kembali ke Menu Pembayaran
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default InvoiceDetail
