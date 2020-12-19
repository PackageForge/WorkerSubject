/// <reference lib="webworker" />
import { workerSubject } from 'projects/worker-subject/src/public-api';
console.log("test1 worker starting");

// Create a WorkerSubject:
const worker = workerSubject(globalThis);

// Subscribe to messages coming from the main thread.
worker.subscribe((message: any) => {
  if (message.task === "DO_SOMETHING")
    doSomething(message.data);
});

function doSomething(data: number) {
  console.log("Doing something with " + data);
  const result = data * data;
  // We are done with the task, send the result back to the main thread.
  worker.next({ state: "COMPLETE", result: result });
}
