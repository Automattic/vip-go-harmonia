import execa, { ExecaChildProcess } from 'execa';

const subprocesses: ExecaChildProcess[] = [];
let cwd = process.cwd();

export function executeShell( command, envVars = {} ) {
	const envVariables = {
		VIP_GO_APP_ID: 'unknown',
	};

	const promise = execa.command( command, {
		all: true,
		cwd,
		env: Object.assign( {}, envVariables, envVars ),
	} );

	subprocesses.push( promise );

	// Remove the promise from the list when finalized
	promise.then( () => {
		const index = subprocesses.indexOf( promise, 0 );
		if ( index > -1 ) {
			subprocesses.splice( index, 1 );
		}
	} ).catch( () => {
		const index = subprocesses.indexOf( promise, 0 );
		if ( index > -1 ) {
			subprocesses.splice( index, 1 );
		}
	} );

	return promise;
}

export function executeShellSync( command, envVars = {} ) {
	const envVariables = {
		VIP_GO_APP_ID: 'unknown',
	};

	return execa.commandSync( command, {
		all: true,
		cwd,
		env: Object.assign( {}, envVariables, envVars ),
	} );
}

export function cleanUp() {
	subprocesses.forEach( subprocess => {
		if ( null !== subprocess.exitCode ) {
			return;
		}
		subprocess.kill();
	} );
}

export function setCwd( path: string ) {
	cwd = path;
}
