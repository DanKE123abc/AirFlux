import { z } from 'zod'

export enum MessageType {
  RequestInfo = 'RequestInfo',
  Info = 'Info',
  Note = 'Note',
  Start = 'Start',
  Chunk = 'Chunk',
  ChunkAck = 'ChunkAck',
  Done = 'Done',
  Error = 'Error',
}

export const RequestInfoMessage = z.object({
  type: z.literal(MessageType.RequestInfo),
})

export const InfoMessage = z.object({
  type: z.literal(MessageType.Info),
  files: z.array(
    z.object({
      fileName: z.string(),
      size: z.number(),
      type: z.string(),
    }),
  ),
})

export const NoteMessage = z.object({
  type: z.literal(MessageType.Note),
  content: z.string(),
})

export const StartMessage = z.object({
  type: z.literal(MessageType.Start),
  fileName: z.string(),
  offset: z.number(),
})

export const ChunkMessage = z.object({
  type: z.literal(MessageType.Chunk),
  fileName: z.string(),
  offset: z.number(),
  bytes: z.unknown(),
  final: z.boolean(),
})

export const ChunkAckMessage = z.object({
  type: z.literal(MessageType.ChunkAck),
  fileName: z.string(),
  offset: z.number(),
  bytesReceived: z.number(),
})

export const DoneMessage = z.object({
  type: z.literal(MessageType.Done),
})

export const ErrorMessage = z.object({
  type: z.literal(MessageType.Error),
  error: z.string(),
})

export const Message = z.discriminatedUnion('type', [
  RequestInfoMessage,
  InfoMessage,
  NoteMessage,
  StartMessage,
  ChunkMessage,
  ChunkAckMessage,
  DoneMessage,
  ErrorMessage,
])

export type Message = z.infer<typeof Message>

export function decodeMessage(data: unknown): Message {
  return Message.parse(data)
}
