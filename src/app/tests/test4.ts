import { workerSubject, workerOperator } from 'projects/worker-subject/src/public-api';
import { finalize, takeWhile, tap } from 'rxjs/operators';
import { IMyDoSomethingTaskMessage, IMyDoSomethingStateMessage } from './test4-types';

export function test4() {

  // Placeholder function to get user id.
  function getUserId() {
    return "ABC_USER_ID";
  }

  // Create a typed WorkerSubject. Note no parameter, and only one type parameter :
  const worker = workerSubject<IMyDoSomethingTaskMessage>();

  const workerModifier = worker
    .pipe(tap(data => {
      data.message.userId = getUserId() // Modify all task messages to add the user id.
    }))
    // Attach the Worker, also passing the state message type parameter if desired.
    .pipe(workerOperator<IMyDoSomethingStateMessage>(new Worker('./test4.worker', { type: 'module', name: "test4" })));

  // Use workerModifier to listen for incoming messages in much the same way:
  workerModifier
    .pipe(takeWhile(message => message.state !== "COMPLETE", true)) // Use inclusive takeWhile.
    .pipe(finalize(() => worker.complete())) // Terminates the worker thread when done with task.
    .subscribe(message => {
      // Log the new ticks property for each message.
      if (message.state === 'WORKING')
        console.log(message.ticks, message.progress);
      if (message.state === 'COLLATING')
        console.log(message.ticks, message.progress, message.amount);
      if (message.state === 'COMPLETE')
        console.log(message.ticks, message.result);
    });

  // Outgoing messages are still sent with the subject. User data will be added by the modifier.
  worker.next({ task: "DO_SOMETHING", data: 1234 });
}
