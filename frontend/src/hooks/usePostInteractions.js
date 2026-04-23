// src/hooks/usePostInteractions.js
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

export const usePostInteractions = () => {
  const queryClient = useQueryClient()

  // Like post dengan optimistic update TANPA invalidate
  const likeMutation = useMutation({
    mutationFn: (postId) => api.post(`/api/feed/${postId}/like`),
    onMutate: async (postId) => {
      await queryClient.cancelQueries(['feed'])
      
      const previousFeed = queryClient.getQueryData(['feed'])
      
      // Optimistically update like status
      queryClient.setQueryData(['feed'], (old) => {
        return old?.map(post => {
          if (post.id === postId) {
            const newLikedState = !post.user_has_liked
            return {
              ...post,
              user_has_liked: newLikedState,
              likes_count: newLikedState ? post.likes_count + 1 : Math.max(0, post.likes_count - 1)
            }
          }
          return post
        }) || []
      })
      
      return { previousFeed }
    },
    onError: (err, postId, context) => {
      queryClient.setQueryData(['feed'], context.previousFeed)
    }
  })

  // Add comment dengan optimistic update TANPA invalidate
  const commentMutation = useMutation({
    mutationFn: ({ postId, content, parentId = null }) =>
      api.post(`/api/feed/${postId}/comment`, { content, parent_id: parentId }),
    onMutate: async ({ postId, content, parentId }) => {
      await queryClient.cancelQueries(['feed'])
      
      const previousFeed = queryClient.getQueryData(['feed'])
      
      // Optimistically add comment
      queryClient.setQueryData(['feed'], (old) => {
        return old?.map(post => {
          if (post.id === postId) {
            const newComment = {
              id: Date.now(), // temporary ID
              content: content,
              author_name: 'Anda',
              user_role: 'current_user',
              parent_id: parentId,
              created_at: new Date().toISOString(),
              replies: []
            }

            let updatedComments = [...(post.comments || [])]
            
            if (parentId) {
              // Add as reply
              const addReplyToComments = (comments, targetId, newReply) => {
                return comments.map(comment => {
                  if (comment.id === targetId) {
                    return {
                      ...comment,
                      replies: [...(comment.replies || []), newReply]
                    }
                  }
                  if (comment.replies && comment.replies.length > 0) {
                    return {
                      ...comment,
                      replies: addReplyToComments(comment.replies, targetId, newReply)
                    }
                  }
                  return comment
                })
              }
              updatedComments = addReplyToComments(updatedComments, parentId, newComment)
            } else {
              // Add as top-level comment
              updatedComments = [newComment, ...updatedComments]
            }

            return {
              ...post,
              comments_count: post.comments_count + 1,
              comments: updatedComments
            }
          }
          return post
        }) || []
      })
      
      return { previousFeed }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['feed'], context.previousFeed)
    }
  })

  // Save post dengan optimistic update TANPA invalidate
  const saveMutation = useMutation({
    mutationFn: (postId) => api.post(`/api/feed/${postId}/save`),
    onMutate: async (postId) => {
      await queryClient.cancelQueries(['feed'])
      
      const previousFeed = queryClient.getQueryData(['feed'])
      
      queryClient.setQueryData(['feed'], (old) => {
        return old?.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              user_has_saved: !post.user_has_saved
            }
          }
          return post
        }) || []
      })
      
      return { previousFeed }
    },
    onError: (err, postId, context) => {
      queryClient.setQueryData(['feed'], context.previousFeed)
    }
  })

  return {
    likePost: (postId) => likeMutation.mutateAsync(postId),
    addComment: (postId, content, parentId = null) => commentMutation.mutateAsync({ postId, content, parentId }),
    savePost: (postId) => saveMutation.mutateAsync(postId),
    isLiking: likeMutation.isPending,
    isCommenting: commentMutation.isPending,
    isSaving: saveMutation.isPending
  }
}
