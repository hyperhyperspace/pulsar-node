
import { Worker } from 'worker_threads';
import { LiteralContext } from '../../core/dist';
import { VDFComputation } from '@hyper-hyper-space/pulsar';

class WorkerThreadVDF implements VDFComputation {
    worker: Worker;

    constructor() {
        this.worker = new Worker('./dist/worker.js')
    }

    onError(callback: (err: Error) => void): void {
        this.worker.on('error', callback);
    }

    onMessage(callback: (msg: { challenge: string; result: string; steps: bigint; prevBlockHash?: string; bootstrapResult?: string; vrfSeed?: string; }) => void): void {
        this.worker.on('message', callback);
    }

    postMessage(msg: { steps: bigint; challenge: string; prevOpContext?: LiteralContext; prevBlockHash?: string; bootstrap: boolean; vrfSeed?: string; }): void {
        this.worker.postMessage(msg);
    }

    terminate(): Promise<number> {
        return this.worker.terminate();
    }
}

export { WorkerThreadVDF };