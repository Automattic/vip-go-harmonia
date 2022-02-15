import execa, { ExecaChildProcess } from 'execa';

const subprocesses: ExecaChildProcess[] = [];

export function executeShell( command, envVars = {} ) {
	const envVariables = {
		VIP_GO_APP_ID: 'unknown',
	};

	const promise = execa.command( command, {
		all: true,
		env: Object.assign( {}, envVariables, envVars ),
	} );

	subprocesses.push( promise );

	return promise;
}

export function cleanUp() {
	subprocesses.forEach( subprocess => {
		if ( null !== subprocess.exitCode ) {
			return;
		}
		subprocess.kill( 'SIGKILL' );
	} );
}
