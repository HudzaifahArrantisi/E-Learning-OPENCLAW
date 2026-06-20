import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../services/api'
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    if (!formData.newPassword.trim()) {
      setMessage({ type: 'error', text: 'Password baru wajib diisi' })
      return
    }

    if (formData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password baru minimal 6 karakter' })
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Password baru tidak sesuai dengan konfirmasi' })
      return
    }

    setLoading(true)
    try {
      await api.changePassword({
        new_password: formData.newPassword,
      })

      setMessage({ type: 'success', text: 'Password berhasil diubah' })
      setFormData({ newPassword: '', confirmPassword: '' })

      setTimeout(() => {
        onClose()
        setMessage(null)
      }, 1500)
    } catch (error) {
      const errorText = error.response?.data?.message || error.message || 'Gagal mengubah password'
      setMessage({ type: 'error', text: errorText })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200/50 flex items-center gap-3">
              <div className="w-10 h-10 bg-lp-accentS rounded-xl flex items-center justify-center">
                <FaLock className="text-lp-atext text-sm" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Ganti Password</h3>
                <p className="text-xs text-gray-500 font-light">Perbarui password Anda dengan yang baru</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* New Password */}
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-2">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lp-accent/20 focus:border-lp-accent transition-all disabled:bg-gray-50"
                    placeholder="Minimal 6 karakter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPasswords.new ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-2">
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lp-accent/20 focus:border-lp-accent transition-all disabled:bg-gray-50"
                    placeholder="Ulangi password baru"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPasswords.confirm ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              {/* Message */}
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${
                    message.type === 'error'
                      ? 'bg-red-50 text-red-700 border border-red-200/50'
                      : 'bg-green-50 text-green-700 border border-green-200/50'
                  }`}
                >
                  {message.type === 'error' ? (
                    <FaTimesCircle className="text-xs flex-shrink-0" />
                  ) : (
                    <FaCheckCircle className="text-xs flex-shrink-0" />
                  )}
                  <span>{message.text}</span>
                </motion.div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-lg bg-lp-text text-white font-semibold text-sm hover:bg-lp-atext transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    'Simpan Password'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ChangePasswordModal
