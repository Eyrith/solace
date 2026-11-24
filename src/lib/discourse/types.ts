export type ContentType = 'article' | 'academic_lesson' | 'assignment' | 'notebook'

export interface ContentThought {
  id: string
  userId: string
  contentType: ContentType
  contentId: string
  anchorText?: string | null
  anchorOffsetStart?: number | null
  anchorOffsetEnd?: number | null
  thoughtBody: string
  tags: string[]
  isPrivate: boolean
  createdAt: string
  updatedAt: string
}

export interface DiscourseParticipant {
  id: string
  displayName?: string | null
  avatarUrl?: string | null
}

export interface DiscourseMessage {
  id: string
  threadId: string
  senderId: string
  sender?: DiscourseParticipant
  parentMessageId?: string | null
  content: string
  createdAt: string
}

export interface DiscourseThread {
  id: string
  originThoughtId: string
  authorId: string
  recipientId: string
  author?: DiscourseParticipant
  recipient?: DiscourseParticipant
  contentType: ContentType
  contentId: string
  status: 'active' | 'concluded' | 'revoked'
  createdAt: string
  updatedAt: string
  originThought?: ContentThought
  messages?: DiscourseMessage[]
}
