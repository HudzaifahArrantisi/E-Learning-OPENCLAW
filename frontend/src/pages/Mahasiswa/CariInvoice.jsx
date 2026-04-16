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
    <div className="flex min-h-screen bg-lp-bg">
      <Sidebar role="mahasiswa" />
      <div className="flex-1">
        <Navbar user={user} />
        <div className="p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-lp-text font-semibold tracking-tight mb-2">
                Cari Invoice
              </h1>
              <p className="text-lp-text2 font-light">
                Cari dan kelola invoice pembayaran UKT Anda
              </p>
            </div>
            
            {/* Search Card */}
            <div className="bg-lp-surface rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border mb-6">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-lp-bg rounded-xl flex items-center justify-center mr-3">
                  <FaSearch className="text-white text-lg" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-lp-text font-semibold tracking-tight">Pencarian Invoice</h3>
                  <p className="text-lp-text2 font-light text-sm">Cari berdasarkan UUID, nominal, atau metode</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="
                      w-full pl-12 pr-4 py-3 border border-lp-border border rounded-xl
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      transition-all duration-300
                      bg-lp-bg focus:bg-lp-surface text-base
                    "
                    placeholder="Cari berdasarkan UUID, nominal, atau metode pembayaran..."
                  />
                </div>
                
                {/* Filter Buttons */}
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg flex items-center space-x-2 whitespace-nowrap ${
                      filter === 'all' 
                        ? 'bg-lp-accent text-white' 
                        : 'bg-gray-200 text-lp-text font-semibold tracking-tight hover:bg-gray-300'
                    }`}
                  >
                    <FaFilter />
                    <span>Semua Status</span>
                  </button>
                  <button
                    onClick={() => setFilter('pending')}
                    className={`px-4 py-2 rounded-lg flex items-center space-x-2 whitespace-nowrap ${
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
                    className={`px-4 py-2 rounded-lg flex items-center space-x-2 whitespace-nowrap ${
                      filter === 'success' 
                        ? 'bg-lp-green text-white' 
                        : 'bg-gray-200 text-lp-text font-semibold tracking-tight hover:bg-gray-300'
                    }`}
                  >
                    <FaCheckCircle />
                    <span>Sukses</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Results */}
            <div className="bg-lp-surface rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border border border-lp-border border">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-lp-bg rounded-xl flex items-center justify-center mr-3">
                  <FaFileInvoice className="text-white text-lg" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-lp-text font-semibold tracking-tight">Hasil Pencarian</h3>
                  <p className="text-lp-text2 font-light text-sm">
                    {filteredInvoices?.length || 0} invoice ditemukan
                  </p>
                </div>
              </div>
              
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-lp-text2 font-light">Memuat invoice...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">❌</div>
                  <h3 className="text-lg font-semibold text-lp-text font-semibold tracking-tight mb-2">Error loading invoices</h3>
                  <p className="text-lp-text2 font-light">Terjadi kesalahan saat memuat data invoice</p>
                </div>
              ) : filteredInvoices && filteredInvoices.length > 0 ? (
                <div className="space-y-4">
                  {filteredInvoices.map(invoice => {
                    const isExpired = invoice.expired_at && new Date(invoice.expired_at) < new Date()
                    const status = isExpired ? 'expired' : invoice.status
                    
                    return (
                      <div 
                        key={invoice.id} 
                        className="border border-lp-border border rounded-xl p-5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border transition-all duration-300 bg-lp-bg"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-bold text-lp-text font-semibold tracking-tight">
                                Invoice #{invoice.invoice_uuid?.substring(0, 8).toUpperCase()}
                              </span>
                              <span className="text-xs text-lp-text3 font-light bg-gray-100 px-2 py-1 rounded-full">
                                {formatDate(invoice.tanggal)}
                              </span>
                            </div>
                            <p className="text-sm text-lp-text3 font-light">
                              {new Date(invoice.tanggal).toLocaleDateString('id-ID', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border ${getStatusColor(status)} text-sm font-medium mt-2 md:mt-0`}>
                            {getStatusIcon(status)}
                            <span className="capitalize">{status}</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <span className="text-lp-atext text-xs font-medium">NOMINAL</span>
                            <p className="font-bold text-lp-text font-semibold tracking-tight">{formatRupiah(invoice.nominal || 0)}</p>
                          </div>
                          <div className="bg-yellow-50 p-3 rounded-lg">
                            <span className="text-yellow-600 text-xs font-medium">BIAYA ADMIN</span>
                            <p className="font-bold text-lp-text font-semibold tracking-tight">{formatRupiah(invoice.biaya_admin || 0)}</p>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg">
                            <span className="text-lp-green text-xs font-medium">TOTAL</span>
                            <p className="font-bold text-lp-text font-semibold tracking-tight">{formatRupiah(invoice.total_dibayar || 0)}</p>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-lp-border border">
                          <div className="flex items-center space-x-2 text-lp-text2 font-light">
                            {invoice.metode === 'qris' ? (
                              <>
                                <FaFileInvoice />
                                <span className="text-sm capitalize">QRIS Payment</span>
                              </>
                            ) : (
                              <>
                                <FaHistory />
                                <span className="text-sm capitalize">Transfer Bank</span>
                              </>
                            )}
                          </div>
                          <button
                            onClick={() => navigate(`/mahasiswa/invoice/${invoice.invoice_uuid}`)}
                            className="flex items-center space-x-2 bg-lp-accent text-white px-4 py-2 rounded-lg hover:bg-lp-accent transition-colors"
                          >
                            <span>Lihat Detail</span>
                            <FaArrowRight />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold text-lp-text font-semibold tracking-tight mb-2">
                    Tidak ditemukan invoice yang sesuai
                  </h3>
                  <p className="text-lp-text2 font-light mb-6">
                    Coba dengan kata kunci atau filter yang berbeda
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setFilter('all')
                    }}
                    className="inline-flex items-center space-x-2 bg-lp-accent text-white px-4 py-2 rounded-lg hover:bg-lp-accent transition-colors"
                  >
                    <FaSearch />
                    <span>Tampilkan Semua Invoice</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CariInvoice