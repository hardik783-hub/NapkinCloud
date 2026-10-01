/**
 * Regression — false FAILED badges on the architecture canvas (Issue 1).
 *
 * The canvas must derive node status from the ACTUAL compile/deploy
 * response:
 *   - backend success          -> LIVE (using the real deployment status)
 *   - backend success:false    -> FAILED (authoritative rejection only)
 *   - no/unreadable response   -> neutral (draft) — never a false FAILED,
 *                                 never a faked CREATE_COMPLETE
 *
 * Runs fully offline against the pure classifier used by Canvas.handleCompile.
 */
import {
  classifyCompileOutcome,
  nodeStatusForOutcome,
  UNCONFIRMED_MESSAGE,
} from '../src/lib/compileOutcome.ts';

let failed = 0;
function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

function main() {
  console.log('test-compile-outcome.ts — compile response -> canvas status\n');

  // -------------------------------------------------------------------------
  // 1. Authoritative success (real AWS deployment response)
  // -------------------------------------------------------------------------
  console.log('[1] Successful deployment response');
  const success = classifyCompileOutcome({
    body: {
      success: true,
      status: 'CREATE_COMPLETE',
      message: 'Architecture deployed successfully',
      outputs: { TableName: 'ImageMetadataTable' },
    },
  });
  assert(success.kind === 'success', 'success body -> success outcome');
  assert(
    success.kind === 'success' && success.status === 'CREATE_COMPLETE',
    'actual deployment status from the response is preserved'
  );
  assert(
    nodeStatusForOutcome(success) === 'live',
    'successful deployment -> LIVE badge (not FAILED)'
  );

  const dryRun = classifyCompileOutcome({
    body: { success: true, status: 'DRY_RUN', message: 'Architecture compiled (dry run)' },
  });
  assert(
    dryRun.kind === 'success' && nodeStatusForOutcome(dryRun) === 'live',
    'dry-run success -> success outcome (compiled artifacts)'
  );

  // -------------------------------------------------------------------------
  // 2. Authoritative backend rejection -> FAILED is legitimate
  // -------------------------------------------------------------------------
  console.log('\n[2] Authoritative backend rejection');
  const rejected = classifyCompileOutcome({
    body: {
      success: false,
      validation: { valid: false, errors: ['Node [ghost] missing'] },
    },
  });
  assert(rejected.kind === 'rejected', 'backend success:false -> rejected outcome');
  assert(
    rejected.kind === 'rejected' && rejected.message.includes('Node [ghost] missing'),
    'backend validation errors surface as the rejection message'
  );
  assert(
    nodeStatusForOutcome(rejected) === 'failed',
    'authoritative rejection -> FAILED badge'
  );

  const rejectedDeploy = classifyCompileOutcome({
    body: { success: false, error: 'CloudFormation stack creation failed' },
  });
  assert(
    rejectedDeploy.kind === 'rejected' &&
      rejectedDeploy.message === 'CloudFormation stack creation failed',
    'deploy error payload -> rejected with the backend error'
  );

  // -------------------------------------------------------------------------
  // 3. No authoritative answer -> neutral, NEVER a false FAILED
  // -------------------------------------------------------------------------
  console.log('\n[3] Unconfirmed outcomes stay neutral');

  const proxyUnverified = classifyCompileOutcome({
    body: {
      success: false,
      unverified: true,
      projectId: 'error',
      validation: { valid: false, errors: ['Could not connect to NapkinCloud deployment backend.'] },
    },
  });
  assert(
    proxyUnverified.kind === 'unconfirmed',
    'proxy connection-error body (unverified) -> unconfirmed'
  );

  const fetchError = classifyCompileOutcome({ fetchError: new Error('fetch failed') });
  assert(fetchError.kind === 'unconfirmed', 'fetch/network error -> unconfirmed');

  const noBody = classifyCompileOutcome({ body: null });
  assert(noBody.kind === 'unconfirmed', 'missing body (e.g. proxy 504 HTML) -> unconfirmed');

  const emptyBody = classifyCompileOutcome({});
  assert(emptyBody.kind === 'unconfirmed', 'no input at all -> unconfirmed');

  const unexpected = classifyCompileOutcome({ body: { hello: 'world' } });
  assert(
    unexpected.kind === 'unconfirmed',
    'unexpected payload without a verdict -> unconfirmed (no false FAILED)'
  );

  for (const [label, outcome] of [
    ['proxy unverified', proxyUnverified],
    ['fetch error', fetchError],
    ['missing body', noBody],
    ['unexpected payload', unexpected],
  ] as const) {
    assert(
      nodeStatusForOutcome(outcome) === 'draft',
      `${label} -> neutral draft badge (NOT failed, NOT live)`
    );
    assert(
      nodeStatusForOutcome(outcome) !== 'failed' && nodeStatusForOutcome(outcome) !== 'live',
      `${label} never claims FAILED or LIVE`
    );
  }

  assert(
    typeof UNCONFIRMED_MESSAGE === 'string' && UNCONFIRMED_MESSAGE.length > 0,
    'unconfirmed outcome carries a user-facing message'
  );

  if (failed > 0) {
    console.error(`\n❌ test-compile-outcome: ${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log('\n✅ test-compile-outcome: all assertions passed');
}

main();
