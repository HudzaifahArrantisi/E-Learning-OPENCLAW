import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaTimes } from 'react-icons/fa'
import api from '../services/api'
import { resolveBackendAssetUrl } from '../utils/assetUrl'
import useAuth from '../hooks/useAuth'

const SocialProfileStats = ({ userId }) => {
  const { user } = useAuth()
  const [status, setStatus] = useState({ followers_count: 0, following_count: 0 })
  const [listType, setListType] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (!userId) return
    api.getFollowStatus(userId).then((res) => setStatus(res.data.data)).catch(() => {})
  }, [userId])

  const openList = async (type) => {
    setListType(type)
    setLoading(true)
    try {
      const res = type === 'followers' ? await api.getFollowers(userId) : await api.getFollowing(userId)
      setItems(res.data.data?.items || [])
    } finally {
      setLoading(false)
    }
  }

  const toggleFollow = async (accountId, isFollowing) => {
    setBusyId(accountId)
    try {
      if (isFollowing) {
        await api.unfollowUser(accountId)
      } else {
        await api.followUser(accountId)
      }
      setItems((current) => current.map((item) => (
        item.account.id === accountId ? { ...item, is_following: !isFollowing } : item
      )))
      if (listType === 'following' && isFollowing) {
        setItems((current) => current.filter((item) => item.account.id !== accountId))
        setStatus((current) => ({ ...current, following_count: Math.max(0, current.following_count - 1) }))
      }
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => openList('followers')} className="rounded-2xl border border-lp-border bg-white p-4 text-left hover:border-lp-accent/40 transition-colors">
          <strong className="block text-2xl text-lp-text">{status.followers_count || 0}</strong>
          <span className="text-xs font-semibold uppercase tracking-wider text-lp-text3">Followers</span>
        </button>
        <button type="button" onClick={() => openList('following')} className="rounded-2xl border border-lp-border bg-white p-4 text-left hover:border-lp-accent/40 transition-colors">
          <strong className="block text-2xl text-lp-text">{status.following_count || 0}</strong>
          <span className="text-xs font-semibold uppercase tracking-wider text-lp-text3">Following</span>
        </button>
      </div>

      {listType && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={() => setListType(null)}>
          <div className="w-full max-w-md max-h-[70vh] overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-lp-border px-5 py-4">
              <h2 className="font-bold text-lp-text">{listType === 'followers' ? 'Followers' : 'Following'}</h2>
              <button type="button" onClick={() => setListType(null)} className="p-2 text-lp-text3 hover:text-lp-text"><FaTimes /></button>
            </div>
            <div className="max-h-[58vh] overflow-y-auto divide-y divide-lp-border">
              {loading ? <p className="p-8 text-center text-sm text-lp-text3">Memuat...</p> : items.length === 0 ? (
                <p className="p-8 text-center text-sm text-lp-text3">Belum ada akun.</p>
              ) : items.map(({ account, is_following: isFollowing }) => (
                <div key={account.id} className="flex items-center gap-3 p-4">
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-lp-surface font-bold text-lp-text3">
                    {account.profile_picture ? <img src={resolveBackendAssetUrl(account.profile_picture)} alt="" className="h-full w-full object-cover" /> : account.name?.[0]?.toUpperCase()}
                  </div>
                  <Link to={`/profile/${account.role}/${account.username}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-lp-text">{account.name}</p>
                    <p className="truncate text-xs text-lp-text3">@{account.username} · {account.role}</p>
                  </Link>
                  <button type="button" disabled={busyId === account.id} onClick={() => toggleFollow(account.id, isFollowing)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${isFollowing ? 'border border-lp-border bg-lp-surface text-lp-text' : 'bg-lp-accent text-white'}`}>
                    {isFollowing
                      ? 'Unfollow'
                      : (listType === 'followers' && user && Number(user.id) === Number(userId)
                        ? 'Follback'
                        : 'Follow')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default SocialProfileStats
