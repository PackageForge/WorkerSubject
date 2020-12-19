import { workerSubject } from 'projects/worker-subject/src/public-api';
import { finalize, takeWhile } from 'rxjs/operators';
import { IMyDoSomethingTaskMessage, IMyDoSomethingStateMessage } from './test3-types';

export function test3() {

  // Create a typed WorkerSubject:
  const worker = workerSubject<IMyDoSomethingTaskMessage, IMyDoSomethingStateMessage>(new Worker('./test3.worker', { type: 'module', name: "test3" }));

  // Incoming messages are now of type IMyDoSomethingStateMessage
  worker
    .pipe(takeWhile(message => message.state !== "COMPLETE", true)) // Use inclusive takeWhile.
    .pipe(finalize(() => worker.complete())) // Terminates the worker thread when done with task.
    .subscribe(message => {
      if (message.state === 'WORKING') // type IMyDoSomethingWorkingStateMessage
        console.log(message.progress);
      if (message.state === 'COLLATING') // type IMyDoSomethingCollatingStateMessage
        console.log(message.progress, message.amount);
      if (message.state === 'COMPLETE') // type IMyDoSomethingCompleteStateMessage
        console.log(message.result);
    });

  // Outgoing messages must be a IMyDoSomethingTaskMessage.
  worker.next({ task: "DO_SOMETHING", data: 1234 });
}
