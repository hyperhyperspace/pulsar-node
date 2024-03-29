//import '@hyper-hyper-space/node-env';

import { Hash, HashedObject, LiteralContext } from '@hyper-hyper-space/core';
import { parentPort } from 'worker_threads';
import { Logger, LogLevel } from '../../core/dist/util/logging';
//import { Blockchain } from './Blockchain';
import { BlockOp, VDF } from '@hyper-hyper-space/pulsar';

import { NodeRSA } from '@hyper-hyper-space/node-rsa';
NodeRSA.enable();

class VDFWorker {

    static logger = new Logger(VDFWorker.name, LogLevel.INFO);

    static start() {
    
            parentPort?.on('message', async (q: {challenge: string, steps: bigint, prevBlockHash?: Hash, prevOpContext?: LiteralContext, bootstrap: boolean, vrfSeed?: string}) => {

                let prevOp: BlockOp | undefined = undefined;

                if (q.prevOpContext !== undefined) {
                    prevOp = HashedObject.fromLiteralContext(q.prevOpContext) as BlockOp;
                }

                const comp = BlockOp.initializeComptroller(prevOp);

                let challenge: string;

                if (q.bootstrap) {

                    const bootstrapSteps = comp.getConsensusBootstrapDifficulty();

                    //console.log('Bootstrap VDF Steps: ' + bootstrapSteps + ' steps');
                    VDFWorker.logger.trace('Computing bootstrap VDF... (' + bootstrapSteps + ' steps).');
                    const tGen = Date.now();
                    challenge = await VDF.compute(q.challenge, bootstrapSteps as bigint);
                    const elapsedGen = Date.now() - tGen;
                    VDFWorker.logger.info('Done computing Bootstrap VDF, did ' + bootstrapSteps + ' steps in ' + elapsedGen + ' ms')  ;
                    VDFWorker.logger.trace('Result Proof length (bytes) = ', challenge.length / 2)
                    if (VDFWorker.logger.level <= LogLevel.TRACE) {
                        VDFWorker.logger.trace('Bootstrap VDF self verification: ' + await VDF.verify(q.challenge, bootstrapSteps, challenge));
                    }
                    
                    //const elapsedVerif = Date.now() - tVerif;
                    //console.log('verification took ' + elapsedVerif + ' millisecs');
                } else {
                    challenge = q.challenge;
                }
                
                VDFWorker.logger.trace('Computing VDF... (' + q.steps + ' steps).');
                const tGen = Date.now();
                let result = await VDF.compute(challenge, q.steps);
                const elapsedGen = Date.now() - tGen;
                VDFWorker.logger.info('Done computing VDF, did ' + q.steps + ' steps in ' + elapsedGen + ' ms')  ;
                if (VDFWorker.logger.level <= LogLevel.TRACE) {
                    VDFWorker.logger.trace('VDF self verification: ' + await VDF.verify(challenge, q.steps, result));
                }

                if (parentPort !== undefined && parentPort !== null) {
                    parentPort.postMessage(
                        { 
                            bootstrap: q.bootstrap,
                            challenge: q.challenge,
                            steps: q.steps,
                            result: result,
                            prevBlockHash: q.prevBlockHash,
                            vrfSeed: q.vrfSeed,
                            bootstrapResult: (q.bootstrap? challenge: undefined)
                        }
                    );

                }

                
            });
    }
}

VDFWorker.start();
