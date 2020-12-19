import { ITaskMessage, IStateMessage } from 'projects/worker-subject/src/public-api';

export type IMyTaskMessage =  // Add other tasks as needed.
  IMyDoSomethingTaskMessage;

export type IMyStateMessage =  // Add states for other tasks as needed.
  IMyDoSomethingStateMessage;

export interface IMyDoSomethingTaskMessage extends ITaskMessage<'DO_SOMETHING'> {
  data: number
}
export type IMyDoSomethingStateMessage =
  IMyDoSomethingWorkingStateMessage |
  IMyDoSomethingCollatingStateMessage |
  IMyDoSomethingCompleteStateMessage;

export interface IMyDoSomethingWorkingStateMessage extends IStateMessage<'WORKING'> {
  progress: number
}
export interface IMyDoSomethingCollatingStateMessage extends IStateMessage<'COLLATING'> {
  amount: number
  progress: number
}
export interface IMyDoSomethingCompleteStateMessage extends IStateMessage<'COMPLETE'> {
  result: number
}
