import { Observable } from 'rxjs';
import { IWorkerMessage, WorkerArg } from './types';
import { WorkerSubject } from './worker-subject';

export function workerOperator<RECEIVE>(worker: WorkerArg) {
  return function <SEND>(source: Observable<IWorkerMessage<SEND>>) {
    return (new WorkerSubject<SEND, RECEIVE>(worker, source)).asObservable();
  };
}

