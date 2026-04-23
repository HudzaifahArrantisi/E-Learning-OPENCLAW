import React from 'react'
import PostingComposerPage from '../../components/PostingComposerPage'

const PostingUKM = () => (
  <PostingComposerPage
    role="ukm"
    postEndpoint="/api/ukm/posts"
    backPath="/ukm"
    fallbackError="Gagal posting UKM"
  />
)

export default PostingUKM
