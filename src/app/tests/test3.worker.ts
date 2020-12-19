/// <reference lib="webworker" />
import { workerSubject } from 'projects/worker-subject/src/public-api';
import { IMyStateMessage, IMyTaskMessage } from './test3-types';
console.log("test3 worker starting");

// Create a typed WorkerSubject:
const worker = workerSubject<IMyStateMessage, IMyTaskMessage>(globalThis);

// Subscribe to messages coming from the main thread.
worker.subscribe((message:IMyTaskMessage) => { // message is one of the IMyTaskMessage types.
  if (message.task === "DO_SOMETHING")
    doSomething(message.data); // message is a IMyDoSomethingTaskMessage type.
});

function doSomething(data: number) {
  // Let the main thread know we are starting.
  worker.next({state: "WORKING", progress: 0}); // IMyDoSomethingWorkingStateMessage
  // Do something intensive.
  // Let the main thread know we are half way done.
  worker.next({state: "WORKING", progress: 0.5}); // IMyDoSomethingWorkingStateMessage
  // Do something intensive.
  // Let the main thread know we are finishing up.
  worker.next({state: "COLLATING", progress: 0.75, amount: 110}); // IMyDoSomethingCollatingStateMessage
  // Collate that data.
  // Task complete, send the results.
  worker.next({state: "COMPLETE", result: 110*data}); // IMyDoSomethingCompleteStateMessage
}
