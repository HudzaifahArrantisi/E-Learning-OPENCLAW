import React, { useState } from 'react'
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from 'react-router-dom';
import api from '../../services/api'
import Navbar from '../../components/Navbar'
import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import { 
  FaSearch, FaFileInvoice, FaCheckCircle, 
  FaClock, FaTimesCircle, FaArrowRight, 
  FaFilter, FaHistory
} from 'react-icons/fa'

const CariInvoice = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')
  
  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ['riwayatPembayaran', 'all'],
    queryFn: () => api.getRiwayatPembayaran('all').then(res => res.data.data),
  })

  const filteredInvoices = invoices?.filter(invoice => {
    const matchesSearch = invoice.invoice_uuid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.nominal?.toString().includes(searchTerm) ||
                         invoice.metode?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filter === 'all' || invoice.status === filter
    
    return matchesSearch && matchesFilter
  })

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <FaCheckCircle className="text-lp-green" />
      case 'pending': return <FaClock className="text-yellow-500" />
      case 'expired': return <FaTimesCircle className="text-red-500" />
      default: return <FaTimesCircle className="text-lp-text3 font-light" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'expired': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-lp-text font-semibold tracking-tight border-lp-border border'
    }
  }

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(number)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="flex min-h-screen bg-lp-bg font-sans font-light text-lp-text">
      {/* GLOBAL GRID BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-[0] bg-lp-surface">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.08)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(255,255,255,0.85)_70%,#ffffff_100%)]" />
      </div>

      <Sidebar role="mahasiswa" />
      <div className="flex-1 flex flex-col relative z-10 h-screen overflow-hidden">
        <Navbar user={user} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-12">
          <div className="max-w-[1120px] mx-auto pb-24">
            
            {/* Header */}
            <div className="mb-10 animate-slideUp fill-mode-both">
              <h1 className="font-sans text-[clamp(2.5rem,4vw,3.5rem)] font-normal leading-[1.06] tracking-tight text-lp-text mb-2">
                Cari Invoice
              </h1>
              <p className="text-[15px] font-light text-lp-text2 max-w-2xl">
                Cari dan kelola histori invoice pembayaran UKT Anda secara real-time.
              </p>
            </div>
            
            {/* Search Card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 md:p-8 shadow-[0_12px_24px_rgba(0,0,0,0.02)] border border-lp-border mb-8 animate-slideUp delay-100 fill-mode-both">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-lp-surface rounded-[16px] flex items-center justify-center mr-4 border border-lp-border">
                  <FaSearch className="text-lp-atext text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-normal text-lp-text tracking-tight">Pencarian</h3>
                  <p className="text-lp-text3 text-[13px] font-light">Cari berdasarkan UUID, nominal, atau metode</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="relative">
                  <FaSearch className="absolute left-5 top-1/2 transform -translate-y-1/2 text-lp-text3 text-lg" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="
                      w-full pl-14 pr-5 py-4 border border-lp-border rounded-[20px]
                      focus:outline-none focus:border-lp-atext focus:ring-4 focus:ring-lp-atext/10
                      transition-all duration-300
                      bg-white/50 focus:bg-white text-[15px] shadow-sm
                    "
                    placeholder="Masukkan kata kunci pencarian..."
                  />
                </div>
                
                {/* Filter Buttons */}
                <div className="flex flex-wrap gap-3 pb-2">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-5 py-2.5 rounded-full flex items-center space-x-2 text-[13.5px] font-medium transition-all ${
                      filter === 'all' 
                        ? 'bg-lp-text text-white shadow-md' 
                        : 'bg-white/50 border border-lp-border text-lp-text2 hover:bg-white hover:text-lp-text'
                    }`}
                  >
                    <FaFilter />
                    <span>Semua Status</span>
                  </button>
                  <button
                    onClick={() => setFilter('pending')}
                    className={`px-5 py-2.5 rounded-full flex items-center space-x-2 text-[13.5px] font-medium transition-all ${
                      filter === 'pending' 
                        ? 'bg-yellow-500 text-white shadow-md' 
                        : 'bg-white/50 border border-lp-border text-lp-text2 hover:bg-white hover:text-lp-text'
                    }`}
                  >
                    <FaClock />
                    <span>Pending</span>
                  </button>
                  <button
                    onClick={() => setFilter('success')}
                    className={`px-5 py-2.5 rounded-full flex items-center space-x-2 text-[13.5px] font-medium transition-all ${
                      filter === 'success' 
                        ? 'bg-lp-green text-white shadow-md' 
                        : 'bg-white/50 border border-lp-border text-lp-text2 hover:bg-white hover:text-lp-text'
                    }`}
                  >
                    <FaCheckCircle />
                    <span>Sukses</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Results */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 md:p-8 shadow-[0_12px_24px_rgba(0,0,0,0.02)] border border-lp-border animate-slideUp delay-200 fill-mode-both">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-lp-surface rounded-[16px] flex items-center justify-center mr-4 border border-lp-border">
                    <FaFileInvoice className="text-lp-atext text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-normal text-lp-text tracking-tight">Hasil Pencarian</h3>
                    <p className="text-lp-text3 text-[13px] font-light">
                      {filteredInvoices?.length || 0} invoice ditemukan
                    </p>
                  </div>
                </div>
              </div>
              
              {isLoading ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lp-text mx-auto mb-4"></div>
                  <p className="text-lp-text2 font-light text-[15px]">Memuat invoice...</p>
                </div>
              ) : error ? (
                <div className="text-center py-16 bg-red-500/5 rounded-[24px] border border-red-500/20">
                  <div className="text-4xl text-red-500 mb-4 mx-auto flex justify-center"><FaTimesCircle /></div>
                  <h3 className="text-lg font-semibold text-red-600 mb-2">Error loading invoices</h3>
                  <p className="text-red-500/80 font-light text-[14px]">Terjadi kesalahan saat memuat data invoice</p>
                </div>
              ) : filteredInvoices && filteredInvoices.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {filteredInvoices.map(invoice => {
                    const isExpired = invoice.expired_at && new Date(invoice.expired_at) < new Date()
                    const status = isExpired ? 'expired' : invoice.status
                    
                    return (
                      <div 
                        key={invoice.id} 
                        className="group bg-white rounded-[24px] border border-lp-border p-6 md:p-8 hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                      >
                        {/* Glow effect on hover */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-lp-text/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 relative z-10">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-normal text-xl tracking-tight text-lp-text">
                                Invoice #{invoice.invoice_uuid?.substring(0, 8).toUpperCase()}
                              </span>
                              <span className="text-[11.5px] tracking-wider uppercase font-medium text-lp-text3 bg-lp-surface px-3 py-1 rounded-full border border-lp-border">
                                {formatDate(invoice.tanggal)}
                              </span>
                            </div>
                            <p className="text-[13.5px] text-lp-text2 font-light">
                              {new Date(invoice.tanggal).toLocaleDateString('id-ID', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                          
                          <div className={`mt-4 md:mt-0 inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[13px] font-medium shadow-sm ${getStatusColor(status)}`}>
                            {getStatusIcon(status)}
                            <span className="capitalize">{status}</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 relative z-10">
                          <div className="bg-lp-surface p-4 rounded-[16px] border border-lp-border">
                            <span className="text-lp-text3 text-[11px] font-semibold tracking-wider uppercase mb-1 block">Nominal</span>
                            <p className="font-normal text-[18px] tracking-tight text-lp-text">{formatRupiah(invoice.nominal || 0)}</p>
                          </div>
                          <div className="bg-lp-surface p-4 rounded-[16px] border border-lp-border">
                            <span className="text-lp-text3 text-[11px] font-semibold tracking-wider uppercase mb-1 block">Biaya Admin</span>
                            <p className="font-normal text-[18px] tracking-tight text-lp-text">{formatRupiah(invoice.biaya_admin || 0)}</p>
                          </div>
                          <div className="bg-lp-text/5 p-4 rounded-[16px] border border-lp-border">
                            <span className="text-lp-text2 text-[11px] font-semibold tracking-wider uppercase mb-1 block">Total</span>
                            <p className="font-normal text-[18px] tracking-tight text-lp-text">{formatRupiah(invoice.total_dibayar || 0)}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row justify-between items-center pt-5 border-t border-lp-border relative z-10 gap-4">
                          <div className="flex items-center gap-2 text-lp-text2 bg-lp-surface px-4 py-2 rounded-full border border-lp-border text-[13px]">
                            {invoice.metode === 'qris' ? (
                              <><FaFileInvoice className="text-lp-text3" /><span>QRIS Payment</span></>
                            ) : (
                              <><FaHistory className="text-lp-text3" /><span>Transfer Bank</span></>
                            )}
                          </div>
                          
                          <button
                            onClick={() => navigate(`/mahasiswa/invoice/${invoice.invoice_uuid}`)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-lp-text text-lp-bg px-6 py-2.5 rounded-full hover:bg-lp-atext transition-all hover:-translate-y-px shadow-sm text-[13.5px] font-medium"
                          >
                            <span>Lihat Detail Invoice</span>
                            <FaArrowRight className="text-[11px]" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-16 border-2 border-dashed border-lp-border rounded-[24px] bg-white/30">
                  <div className="w-16 h-16 bg-white border border-lp-border rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <FaSearch className="text-2xl text-lp-text3" />
                  </div>
                  <h3 className="text-lg font-normal text-lp-text tracking-tight mb-2">
                    Tidak ditemukan invoice yang sesuai
                  </h3>
                  <p className="text-[14px] text-lp-text2 font-light mb-6">
                    Coba dengan kata kunci atau filter status yang berbeda
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setFilter('all')
                    }}
                    className="inline-flex items-center gap-2 bg-lp-text text-lp-bg px-6 py-3 rounded-full hover:bg-lp-atext transition-all shadow-sm text-[13.5px] font-medium"
                  >
                    <FaSearch className="text-sm" />
                    <span>Reset Pencarian</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default CariInvoice