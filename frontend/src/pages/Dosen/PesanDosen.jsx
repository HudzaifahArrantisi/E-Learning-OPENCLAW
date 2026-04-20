import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import useAuth from '../../hooks/useAuth'
import Sidebar from '../../components/Sidebar'

const ChatDosen = () => {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [matkulList, setMatkulList] = useState([])
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [selectedMatkul, setSelectedMatkul] = useState(null)
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState([])

  useEffect(() => {
    loadDosenCourses()
    loadMatkulGroups()
  }, [])

  const loadDosenCourses = async () => {
    try {
      const response = await api.getDosenCourses()
      if (response.data.success) {
        setMatkulList(response.data.data || [])
      }
    } catch (error) {
      console.error('Error loading courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMatkulGroups = async () => {
    try {
      const response = await api.getMatkulGroups()
      if (response.data.success) {
        setGroups(response.data.data || [])
      }
    } catch (error) {
      console.error('Error loading matkul groups:', error)
    }
  }

  const createMatkulGroup = async (matkulId) => {
    if (!matkulId) {
      alert('Mata kuliah tidak valid')
      return
    }

    try {
      const response = await api.createMatkulGroup(matkulId)
      if (response.data.success) {
        alert('Grup chat berhasil dibuat!')
        setShowCreateGroupModal(false)
        setSelectedMatkul(null)
        loadMatkulGroups()
      }
    } catch (error) {
      alert('Gagal membuat grup: ' + (error.response?.data?.error || error.message))
    }
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const getGroupStatus = (matkulId) => {
    const group = groups.find(g => g.mata_kuliah_id === matkulId)
    if (group) {
      return {
        exists: true,
        conversationId: group.conversation_id,
        createdAt: group.created_at
      }
    }
    return { exists: false }
  }

  return (
    <div className="flex min-h-screen bg-lp-bg">
      <Sidebar role="dosen" isOpen={sidebarOpen} onClose={toggleSidebar} />
      
      {/* Main Content */}
      <div className="flex-1 lg:ml-0 transition-all duration-300 min-w-0">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6 lg:mb-8">
            <button 
              onClick={toggleSidebar}
              className="lg:hidden p-3 rounded-xl bg-lp-surface border border-lp-border shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-lp-border transition-shadow"
            >
              <span className="text-xl">☰</span>
            </button>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-lp-text font-semibold tracking-tight">Chat Dosen</h1>
              <p className="text-lp-text2 font-light mt-2">Kelola grup chat mata kuliah yang Anda ajar</p>
            </div>
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-lp-text text-white hover:bg-lp-atext transition-colors"
            >
              <i className="fas fa-comments"></i>
              Buka Chat
            </Link>
          </div>

          <div className="mb-8">
            <div className="bg-lp-surface rounded-2xl border border-lp-border shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-lp-text font-semibold tracking-tight">Grup Mata Kuliah</h2>
                  <p className="text-lp-text2 font-light">Buat dan kelola grup chat untuk setiap mata kuliah</p>
                </div>
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-lp-text text-white hover:bg-lp-atext transition-colors"
                  disabled={loading}
                >
                  <i className="fas fa-plus"></i>
                  Buat Grup Baru
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lp-text mx-auto"></div>
                  <p className="mt-4 text-lp-text2 font-light">Memuat mata kuliah...</p>
                </div>
              ) : matkulList.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-book text-4xl text-lp-text3 mb-4"></i>
                  <h3 className="text-lg font-semibold text-lp-text2 mb-2">
                    Belum ada mata kuliah
                  </h3>
                  <p className="text-lp-text3 font-light">
                    Anda belum mengampu mata kuliah apapun
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {matkulList.map(matkul => {
                    const groupStatus = getGroupStatus(matkul.id)
                    
                    return (
                      <div key={matkul.id} className="bg-lp-bg rounded-xl border border-lp-border p-5 hover:border border-lp-border shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-lg text-lp-text font-semibold tracking-tight">{matkul.nama}</h3>
                            <p className="text-sm text-lp-text2 font-light">
                              Kode: {matkul.kode} | SKS: {matkul.sks}
                            </p>
                            <p className="text-sm text-lp-text2 font-light mt-1">
                              Hari: {matkul.hari} | {matkul.jam_mulai} - {matkul.jam_selesai}
                            </p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            groupStatus.exists 
                              ? 'bg-lp-bg text-lp-text' 
                              : 'bg-lp-bg text-lp-text'
                          }`}>
                            {groupStatus.exists ? 'Grup Aktif' : 'Belum ada grup'}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          {groupStatus.exists ? (
                            <div key={`actions-${matkul.id}`} className="flex gap-2 w-full">
                              <Link
                                to={`/chat/${groupStatus.conversationId}`}
                                className="inline-flex flex-1 items-center justify-center gap-2 px-4 py-2 rounded-xl bg-lp-text text-white hover:bg-lp-atext transition-colors"
                                key={`enter-${groupStatus.conversationId}`}
                              >
                                <i className="fas fa-comments"></i>
                                Masuk Grup
                              </Link>
                              <button
                                onClick={() => {
                                  // Show group management options
                                }}
                                className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-lp-border text-lp-text2 hover:bg-lp-surface transition-colors"
                                title="Kelola Grup"
                                key={`manage-${groupStatus.conversationId}`}
                              >
                                <i className="fas fa-cog"></i>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedMatkul(matkul)
                                setShowCreateGroupModal(true)
                              }}
                              className="inline-flex flex-1 items-center justify-center gap-2 px-4 py-2 rounded-xl bg-lp-text text-white hover:bg-lp-atext transition-colors"
                              key={`create-${matkul.id}`}
                            >
                              <i className="fas fa-users"></i>
                              Buat Grup Chat
                            </button>
                          )}
                        </div>
                        
                        {groupStatus.exists && groupStatus.createdAt && (
                          <p className="text-xs text-lp-text3 font-light mt-3">
                            Dibuat: {new Date(groupStatus.createdAt).toLocaleDateString('id-ID')}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-6 border border-lp-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-lp-bg rounded-full flex items-center justify-center">
                  <i className="fas fa-book text-lp-text2 text-xl"></i>
                </div>
                <div>
                  <p className="text-sm text-lp-text2 font-light">Mata Kuliah Diajar</p>
                  <p className="text-2xl font-bold">{matkulList.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-lp-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-lp-bg rounded-full flex items-center justify-center">
                  <i className="fas fa-users text-lp-text2 text-xl"></i>
                </div>
                <div>
                  <p className="text-sm text-lp-text2 font-light">Grup Aktif</p>
                  <p className="text-2xl font-bold">
                    {groups.length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-lp-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-lp-bg rounded-full flex items-center justify-center">
                  <i className="fas fa-comment-dots text-lp-text2 text-xl"></i>
                </div>
                <div>
                  <p className="text-sm text-lp-text2 font-light">Total Pesan</p>
                  <p className="text-2xl font-bold">
                    {/* You would fetch this from API */}
                    0
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-lp-surface border border-lp-border rounded-xl p-6">
            <h3 className="font-bold text-lg text-lp-text mb-3">📋 Panduan Grup Chat</h3>
            <ul className="space-y-2 text-lp-text2">
              <li key="group-members" className="flex items-start gap-2">
                <i className="fas fa-check-circle text-lp-text2 mt-1"></i>
                <span>Setiap grup akan berisi semua mahasiswa yang terdaftar di mata kuliah tersebut</span>
              </li>
              <li key="admin-role" className="flex items-start gap-2">
                <i className="fas fa-check-circle text-lp-text2 mt-1"></i>
                <span>Anda sebagai dosen akan menjadi admin grup</span>
              </li>
              <li key="student-messaging" className="flex items-start gap-2">
                <i className="fas fa-check-circle text-lp-text2 mt-1"></i>
                <span>Mahasiswa dapat mengirim pesan dan bertanya tentang materi kuliah</span>
              </li>
              <li key="manage-members" className="flex items-start gap-2">
                <i className="fas fa-check-circle text-lp-text2 mt-1"></i>
                <span>Anda dapat mengelola anggota grup (tambah/hapus peserta)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-lp-text font-semibold tracking-tight">Buat Grup Chat Mata Kuliah</h3>
                <button
                  onClick={() => {
                    setShowCreateGroupModal(false)
                    setSelectedMatkul(null)
                  }}
                  className="text-lp-text3 font-light hover:text-lp-text2"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              {selectedMatkul ? (
                <div>
                  <div className="bg-lp-surface border border-lp-border rounded-xl p-4 mb-4">
                    <h4 className="font-bold text-lp-text">{selectedMatkul.nama}</h4>
                    <p className="text-sm text-lp-text2">Kode: {selectedMatkul.kode} | SKS: {selectedMatkul.sks}</p>
                    <p className="text-sm text-lp-text2 mt-1">
                      Hari: {selectedMatkul.hari} | {selectedMatkul.jam_mulai} - {selectedMatkul.jam_selesai}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center p-3 bg-lp-bg rounded-xl">
                      <i className="fas fa-users text-lp-text2 mr-3"></i>
                      <div>
                        <p className="font-medium">Semua Mahasiswa</p>
                        <p className="text-sm text-lp-text2 font-light">Akan otomatis ditambahkan ke grup</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center p-3 bg-lp-bg rounded-xl">
                      <i className="fas fa-user-tie text-lp-text2 mr-3"></i>
                      <div>
                        <p className="font-medium">Anda sebagai Admin</p>
                        <p className="text-sm text-lp-text2 font-light">Dapat mengelola grup dan anggotanya</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center p-3 bg-lp-bg rounded-xl">
                      <i className="fas fa-comments text-lp-text2 mr-3"></i>
                      <div>
                        <p className="font-medium">Pesan Sistem</p>
                        <p className="text-sm text-lp-text2 font-light">Notifikasi grup akan dikirim otomatis</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => setSelectedMatkul(null)}
                      className="inline-flex flex-1 items-center justify-center px-4 py-2 rounded-xl border border-lp-border text-lp-text2 hover:bg-lp-surface transition-colors"
                    >
                      <i className="fas fa-arrow-left mr-2"></i>
                      Pilih Lain
                    </button>
                    <button
                      onClick={() => createMatkulGroup(selectedMatkul.id)}
                      className="inline-flex flex-1 items-center justify-center px-4 py-2 rounded-xl bg-lp-text text-white hover:bg-lp-atext transition-colors"
                    >
                      <i className="fas fa-check mr-2"></i>
                      Buat Grup
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-lp-text2 font-light mb-4">Pilih mata kuliah untuk membuat grup chat:</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {matkulList.map(matkul => {
                      const groupStatus = getGroupStatus(matkul.id)
                      
                      return (
                        <div
                          key={matkul.id}
                          className={`p-4 border rounded-xl cursor-pointer transition-colors ${
                            groupStatus.exists
                              ? 'border-lp-border bg-lp-surface hover:bg-lp-bg'
                              : 'border-lp-border border hover:bg-lp-bg'
                          }`}
                          onClick={() => !groupStatus.exists && setSelectedMatkul(matkul)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold">{matkul.nama}</h4>
                              <p className="text-sm text-lp-text2 font-light">{matkul.kode}</p>
                            </div>
                            {groupStatus.exists ? (
                              <span className="px-2 py-1 bg-lp-bg text-lp-text text-xs rounded-full">
                                Sudah ada grup
                              </span>
                            ) : (
                              <i className="fas fa-chevron-right text-lp-text3"></i>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {matkulList.every(matkul => getGroupStatus(matkul.id).exists) && (
                    <div className="mt-4 p-3 bg-lp-surface border border-lp-border rounded-xl">
                      <p className="text-sm text-lp-text">
                        <i className="fas fa-info-circle mr-2"></i>
                        Semua mata kuliah sudah memiliki grup chat
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatDosen