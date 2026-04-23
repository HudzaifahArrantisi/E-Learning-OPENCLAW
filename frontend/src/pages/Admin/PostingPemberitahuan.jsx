import React from 'react'
import PostingComposerPage from '../../components/PostingComposerPage'

const PostingPemberitahuan = () => (
  <PostingComposerPage
    role="admin"
    postEndpoint="/api/admin/posts"
    backPath="/admin"
    fallbackError="Gagal posting pemberitahuan"
  />
)

export default PostingPemberitahuan
