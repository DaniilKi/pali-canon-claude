// The old intake reviews explicitly froze the Node job without time limits.
// Project only this separately reviewed, exact stage/budget proposal back to
// that original job. Every original historical assertion stays in place.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {projectPublisher317Workflow} from './publisher317-ci-baseline.mjs';
import {projectPublisher325Workflow} from './publisher325-ci-baseline.mjs';

export const ORIGINAL_CHECK_NODE_SHA='5f313dfc4fc7dc743c6212cb970d910cb9be63aed5939faf311398182a67d2cc';
export const PROPOSED_CHECK_NODE_SHA='551d449d6a0e2359dd517832486f2d26f6704466347da4ca3c3f4971ebb0190e';
export const CHECK_STAGE_STEPS=`      - name: Verify complete check command contract
        timeout-minutes: 1
        run: node scripts/ci-check-contract.mjs
      - name: Build complete check artifacts
        timeout-minutes: 5
        run: npm run build
      - name: Run complete test inventory
        timeout-minutes: 30
        run: npm test
      - name: Audit the complete bundled corpus
        timeout-minutes: 5
        run: npm run audit
`;
const sha=text=>createHash('sha256').update(text).digest('hex');

export function projectCheckStageWorkflowOnly(text){
  assert.equal(text.split('\n  check:\n').length,2,'One exact Node matrix job is required');
  const start=text.indexOf('\n  check:\n')+1,block=text.slice(start);
  if(sha(block)===ORIGINAL_CHECK_NODE_SHA)return text;
  assert.equal(sha(block),PROPOSED_CHECK_NODE_SHA,'Only the exact reviewed complete check stages and bounds may be projected');
  assert.equal(block.split('    timeout-minutes: 60\n').length,2);
  assert.equal(block.split(CHECK_STAGE_STEPS).length,2);
  const original=block.replace('    timeout-minutes: 60\n','').replace(CHECK_STAGE_STEPS,'      - run: npm run check\n');
  assert.equal(sha(original),ORIGINAL_CHECK_NODE_SHA,'Every other Node job byte and original gate must be preserved');
  return text.slice(0,start)+original;
}

export function projectCheckStageWorkflow(text){
  return projectPublisher317Workflow(projectCheckStageWorkflowOnly(projectPublisher325Workflow(text)));
}
