import React from 'react'
import PostingComposerPage from '../../components/PostingComposerPage'

const PostingOrmawa = () => (
  <PostingComposerPage
    role="ormawa"
    postEndpoint="/api/ormawa/posts"
    backPath="/ormawa"
    fallbackError="Gagal posting Ormawa"
  />
)

export default PostingOrmawa
