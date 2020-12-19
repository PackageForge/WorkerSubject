import { ITaskMessage, IStateMessage } from 'projects/worker-subject/src/public-api';

export type IMyTaskMessage =
  IMyDoSomethingTaskMessage;

export type IMyStateMessage =
  IMyDoSomethingStateMessage;

export interface IMyDoSomethingTaskMessage extends ITaskMessage<'DO_SOMETHING'> {
  userId?: string // The user id to be filled in for all task messages.
  data: number
}
export type IMyDoSomethingStateMessage =
  IMyDoSomethingWorkingStateMessage |
  IMyDoSomethingCollatingStateMessage |
  IMyDoSomethingCompleteStateMessage;

export interface IMyDoSomethingWorkingStateMessage extends IStateMessage<'WORKING'> {
  ticks?: number // The processing time to be filled in for all state messages.
  progress: number
}
export interface IMyDoSomethingCollatingStateMessage extends IStateMessage<'COLLATING'> {
  ticks?: number // The processing time to be filled in for all state messages.
  amount: number
  progress: number
}
export interface IMyDoSomethingCompleteStateMessage extends IStateMessage<'COMPLETE'> {
  ticks?: number // The processing time to be filled in for all state messages.
  result: number
}
